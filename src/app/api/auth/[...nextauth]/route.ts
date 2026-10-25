import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { handleError } from "@/lib/api/response";
import { clientAddress, limitRate } from "@/lib/auth/rate-limit";

const handler = NextAuth(authConfig);

export { handler as GET };

export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  if (new URL(request.url).pathname.endsWith("/callback/credentials")) {
    const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();
    try {
      const form = await request.clone().formData();
      const email = form.get("email");
      await limitRate("login", typeof email === "string" && email ? email : clientAddress(request));
    } catch (error) {
      const response = handleError(error, correlationId);
      response.headers.set("x-correlation-id", correlationId);
      return response;
    }
  }
  return handler(request, context);
}
