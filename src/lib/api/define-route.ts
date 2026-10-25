import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AppError, handleError } from "@/lib/api/response";
import { getAuthenticatedUser, type AuthorizedRequestContext } from "@/lib/permissions";
import type { Role } from "@/types";

type Schema = z.ZodType;
type Parsed<T> = T extends Schema ? z.output<T> : undefined;

export interface RouteOptions<B extends Schema | undefined, Q extends Schema | undefined> {
  scope: "company" | "platform" | "public";
  roles?: Role[];
  requireApprovedCompany?: boolean;
  bodySchema?: B;
  querySchema?: Q;
}

export interface RouteContext<B, Q> {
  auth: AuthorizedRequestContext | null;
  body: Parsed<B>;
  query: Parsed<Q>;
  params: Record<string, string>;
  correlationId: string;
  formData: FormData | null;
}

type NextContext = { params: Promise<Record<string, string>> };

export function defineRoute<B extends Schema | undefined = undefined, Q extends Schema | undefined = undefined>(
  options: RouteOptions<B, Q>,
  handler: (request: NextRequest, context: RouteContext<B, Q>) => Promise<NextResponse>,
) {
  return async (request: NextRequest, nextContext?: NextContext): Promise<NextResponse> => {
    const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();
    try {
      const auth = options.scope === "public" ? null : await getAuthenticatedUser(request);
      if (options.scope !== "public") {
        if (!auth || !options.roles?.includes(auth.userRole)) {
          throw new AppError({ status: 403, code: "FORBIDDEN", message: "Insufficient permissions" });
        }
        if (options.scope === "company") {
          if (auth.userRole === "platform_admin" || !auth.companyId) {
            throw new AppError({ status: 403, code: "FORBIDDEN", message: "Company access required" });
          }
          if (options.requireApprovedCompany !== false && auth.companyStatus !== "approved") {
            throw new AppError({ status: 403, code: "COMPANY_NOT_APPROVED", message: "Company access is not approved" });
          }
        } else if (auth.userRole !== "platform_admin") {
          throw new AppError({ status: 403, code: "FORBIDDEN", message: "Platform administrator access required" });
        }
      }
      let rawBody: unknown;
      let formData: FormData | null = null;
      if (options.bodySchema) {
        try {
          if (request.headers.get("content-type")?.includes("multipart/form-data")) {
            formData = await request.formData();
            rawBody = Object.fromEntries(formData.entries());
          } else {
            rawBody = await request.json();
          }
        }
        catch { throw new AppError({ status: 400, code: "INVALID_JSON", message: "Request body must be valid JSON" }); }
      }
      const body = (options.bodySchema?.parse(rawBody) ?? undefined) as Parsed<B>;
      const query = (options.querySchema?.parse(Object.fromEntries(new URL(request.url).searchParams)) ?? undefined) as Parsed<Q>;
      const params = nextContext ? await nextContext.params : {};
      const response = await handler(request, { auth, body, query, params, correlationId, formData });
      response.headers.set("x-correlation-id", correlationId);
      return response;
    } catch (error) {
      const response = handleError(error, correlationId);
      response.headers.set("x-correlation-id", correlationId);
      return response;
    }
  };
}
