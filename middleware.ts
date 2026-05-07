import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/forgot-password"];
const ALLOWED_WHEN_RESET_REQUIRED = [
  "/reset-initial-password",
  "/api/auth",
  "/_next",
  "/favicon.ico",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.next();
  }

  const mustChangePassword = Boolean((token as any).mustChangePassword);

  if (mustChangePassword && !startsWithAny(pathname, ALLOWED_WHEN_RESET_REQUIRED)) {
    return NextResponse.redirect(new URL("/reset-initial-password", request.url));
  }

  if (!mustChangePassword && pathname === "/reset-initial-password") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (startsWithAny(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};

