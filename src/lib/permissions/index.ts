import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { User } from "@/models/User";
import { Company } from "@/models/Company";
import { connectToDatabase } from "@/lib/db/connection";
import { errorResponse, AppError } from "@/lib/api/response";
import { Role, CompanyStatus } from "@/types";

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "invite"
  | "manage_employees"
  | "manage_settings";

export interface AuthorizedRequestContext {
  userId: string;
  userEmail: string;
  userRole: Role;
  companyId: string | null;
  companyStatus: CompanyStatus | null;
}

export async function getAuthenticatedUser(req: Request): Promise<AuthorizedRequestContext> {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    throw new AppError({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    });
  }

  await connectToDatabase();

  // Re-verify user and company status from database (not just JWT)
  const user = await User.findById(token.id).select("+password");
  if (!user || !user.isActive) {
    throw new AppError({
      status: 401,
      code: "ACCOUNT_DEACTIVATED",
      message: "Account is deactivated or not found",
    });
  }

  // Check session version - if changed, force re-authentication
  if (token.sessionVersion !== user.sessionVersion) {
    throw new AppError({
      status: 401,
      code: "SESSION_INVALIDATED",
      message: "Session has been invalidated. Please sign in again.",
    });
  }

  let company: { _id: string; status: CompanyStatus } | null = null;
  if (user.companyId) {
    company = await Company.findById(user.companyId).select("status");
    if (!company) {
      throw new AppError({
        status: 403,
        code: "COMPANY_NOT_FOUND",
        message: "Company not found",
      });
    }
  }

  return {
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: user.role,
    companyId: user.companyId?.toString() ?? null,
    companyStatus: company?.status ?? null,
  };
}

export function requireRole(allowedRoles: Role[]) {
  return (ctx: AuthorizedRequestContext) => {
    if (!allowedRoles.includes(ctx.userRole)) {
      throw new AppError({
        status: 403,
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      });
    }
  };
}

export function requireCompanyStatus(allowedStatuses: CompanyStatus[]) {
  return (ctx: AuthorizedRequestContext) => {
    if (ctx.userRole !== "platform_admin" && ctx.companyId && !allowedStatuses.includes(ctx.companyStatus!)) {
      throw new AppError({
        status: 403,
        code: "COMPANY_NOT_APPROVED",
        message: `Company is ${ctx.companyStatus}. Access denied.`,
      });
    }
  };
}

export function requireSameCompany(targetCompanyId: string | null) {
  return (ctx: AuthorizedRequestContext) => {
    if (ctx.userRole === "platform_admin") return;
    if (ctx.companyId !== targetCompanyId) {
      throw new AppError({
        status: 403,
        code: "TENANT_ISOLATION_VIOLATION",
        message: "Cannot access resources from another company",
      });
    }
  };
}

export function requirePlatformAdmin() {
  return requireRole(["platform_admin"]);
}

export function requireCompanyAdmin() {
  return requireRole(["platform_admin", "company_admin"]);
}

export function requireCompanyAdminOrEmployee() {
  return requireRole(["platform_admin", "company_admin", "company_employee"]);
}

export async function withAuth(
  handler: (req: Request, ctx: AuthorizedRequestContext) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const ctx = await getAuthenticatedUser(req);
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse({
          status: error.status,
          code: error.code,
          message: error.message,
          details: error.details,
        });
      }
      if (error instanceof Error) {
        return errorResponse({
          status: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      return errorResponse({
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  };
}