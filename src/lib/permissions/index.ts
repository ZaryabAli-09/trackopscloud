import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connection";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import type { CompanyStatus, Role } from "@/types";

export interface AuthorizedRequestContext {
  userId: string;
  userEmail: string;
  userRole: Role;
  companyId: string | null;
  companyStatus: CompanyStatus | null;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthorizedRequestContext> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET });
  if (!token?.id) throw new AppError({ status: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
  await connectToDatabase();
  const user = await User.findById(token.id);
  if (!user || !user.isActive) throw new AppError({ status: 401, code: "ACCOUNT_DEACTIVATED", message: "Account is deactivated or not found" });
  if (token.sessionVersion !== user.sessionVersion) throw new AppError({ status: 401, code: "SESSION_INVALIDATED", message: "Session has been invalidated. Please sign in again." });
  const company = user.companyId ? await Company.findById(user.companyId).select("status") : null;
  if (user.companyId && !company) throw new AppError({ status: 403, code: "COMPANY_NOT_FOUND", message: "Company not found" });
  return {
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: user.role,
    companyId: user.companyId?.toString() ?? null,
    companyStatus: company?.status ?? null,
  };
}
