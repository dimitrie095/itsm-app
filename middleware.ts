import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";

// Define protected routes and their required roles
const protectedRoutes = [
  {
    path: "/",
    roles: ["ADMIN", "AGENT", "END_USER"],
  },
  {
    path: "/dashboard",
    roles: ["ADMIN", "AGENT", "END_USER"],
  },
  {
    path: "/tickets",
    roles: ["ADMIN", "AGENT", "END_USER"],
  },
  {
    path: "/tickets/new",
    roles: ["ADMIN", "AGENT", "END_USER"],
  },
  {
    path: "/assets",
    roles: ["ADMIN", "AGENT"],
  },
  {
    path: "/assets/new",
    roles: ["ADMIN"],
  },
  {
    path: "/knowledge",
    roles: ["ADMIN", "AGENT", "END_USER"],
  },
  {
    path: "/knowledge/new",
    roles: ["ADMIN", "AGENT"],
  },
  {
    path: "/users",
    roles: ["ADMIN"],
  },
  {
    path: "/analytics",
    roles: ["ADMIN", "AGENT"],
  },
  {
    path: "/reports",
    roles: ["ADMIN", "AGENT"],
  },
  {
    path: "/reports/new",
    roles: ["ADMIN", "AGENT"],
  },
  {
    path: "/automation",
    roles: ["ADMIN"],
  },
  {
    path: "/settings",
    roles: ["ADMIN"],
  },
];

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Check if the current path requires a specific role
    const route = protectedRoutes.find(r => pathname.startsWith(r.path));
    
    if (route) {
      const userRole = token.role as Role;
      
      // Check if user has required role
      if (!route.roles.includes(userRole)) {
        // Redirect to unauthorized page or dashboard
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Configure which routes to protect
export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/tickets/:path*",
    "/assets/:path*",
    "/knowledge/:path*",
    "/users/:path*",
    "/analytics/:path*",
    "/reports/:path*",
    "/automation/:path*",
    "/settings/:path*",
  ],
};