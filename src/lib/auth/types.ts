import "next-auth";
import { Role, CompanyStatus } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: Role | null;
      companyId?: string | null;
      companyStatus?: CompanyStatus | null;
      sessionVersion?: number;
    };
  }

  interface User {
    id?: string;
    email?: string;
    name?: string;
    role?: Role;
    companyId?: string | null;
    companyStatus?: CompanyStatus | null;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    role?: Role;
    companyId?: string | null;
    companyStatus?: CompanyStatus | null;
    sessionVersion?: number;
  }
}