import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

export const { GET, POST } = NextAuth(authConfig as any);