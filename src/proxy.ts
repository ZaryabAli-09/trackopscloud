import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export const proxy = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Platform admin routes
    if (pathname.startsWith("/platform-admin")) {
      if (token?.role !== "platform_admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      return NextResponse.next();
    }

    // Company dashboard routes
    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (token.role === "platform_admin") {
        return NextResponse.redirect(new URL("/platform-admin", req.url));
      }
      if (token.companyStatus !== "approved") {
        return NextResponse.redirect(new URL("/login?error=company_not_approved", req.url));
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // We handle authorization in the middleware function
    },
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/platform-admin/:path*"],
};
