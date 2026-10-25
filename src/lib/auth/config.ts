import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { Company } from "@/models/Company";
import { connectToDatabase } from "@/lib/db/connection";
import { Role, CompanyStatus } from "@/types";
import type { NextAuthOptions } from "next-auth";
import { limitRate } from "@/lib/auth/rate-limit";

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        await limitRate("login-authorize", credentials.email.toLowerCase());
        await connectToDatabase();

        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select("+password");
        if (!user) {
          // Return generic error to prevent email enumeration
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        const company = user.companyId ? await Company.findById(user.companyId) : null;

        if (user.role !== "platform_admin") {
          if (!company) {
            throw new Error("Account is not associated with a company");
          }

          if (company.status !== "approved") throw new Error(`COMPANY_${company.status.toUpperCase()}`);
        }

        if (!user.isActive) throw new Error("ACCOUNT_DEACTIVATED");

        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as Role,
          companyId: user.companyId?.toString() ?? null,
          companyStatus: company?.status as CompanyStatus | null,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role as Role;
        token.companyId = user.companyId ?? null;
        token.companyStatus = user.companyStatus ?? null;
        token.sessionVersion = user.sessionVersion ?? 1;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId as string | null;
        session.user.companyStatus = token.companyStatus as CompanyStatus | null;
        session.user.sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
};
