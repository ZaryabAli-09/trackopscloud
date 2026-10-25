import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { Company } from "@/models/Company";
import { connectToDatabase } from "@/lib/db/connection";
import { serverEnv } from "@/config/app.config";
import { Role, CompanyStatus } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JWTContent = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SessionContent = Record<string, any>;

export const authConfig = {
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

        if (!user.isActive) {
          throw new Error("Account is deactivated");
        }

        const company = user.companyId ? await Company.findById(user.companyId) : null;

        if (user.role !== "platform_admin") {
          if (!company) {
            throw new Error("Account is not associated with a company");
          }

          if (company.status !== "approved") {
            throw new Error(`Company account is ${company.status}. Please contact support.`);
          }
        }

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
    async jwt({ token, user }: { token: JWTContent; user: Record<string, unknown> | null }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user.role as Role) || "user";
        token.companyId = (user as { companyId: string | null }).companyId ?? null;
        token.companyStatus = (user as { companyStatus: CompanyStatus | null }).companyStatus ?? null;
        token.sessionVersion = (user as { sessionVersion: number }).sessionVersion ?? 1;
      }
      return token;
    },
    async session({ session, token }: { session: SessionContent; token: JWTContent }) {
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
  secret: serverEnv.AUTH_SECRET,
};