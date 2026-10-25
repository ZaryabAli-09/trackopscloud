import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Platform admin routes
    if (pathname.startsWith("/platform-admin")) {
      if (token?.role !== "platform_admin") {
        return NextResponse.rewrite(new URL("/auth/login", req.url));
      }
      return NextResponse.next();
    }

    // Company dashboard routes
    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.rewrite(new URL("/auth/login", req.url));
      }
      if (token.role === "platform_admin") {
        return NextResponse.rewrite(new URL("/platform-admin", req.url));
      }
      if (token.companyStatus !== "approved") {
        return NextResponse.rewrite(new URL("/auth/login?error=company_not_approved", req.url));
      }
      return NextResponse.next();
    }

    // Auth routes - redirect if already logged in
    if (pathname.startsWith("/auth")) {
      if (token) {
        if (token.role === "platform_admin") {
          return NextResponse.redirect(new URL("/platform-admin", req.url));
        }
        if (token.companyStatus === "approved") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // We handle authorization in the middleware function
    },
    secret: process.env.AUTH_SECRET,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/platform-admin/:path*", "/auth/:path*"],
};