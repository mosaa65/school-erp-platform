import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./src/lib/auth/constants";

function hasAccessToken(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return Boolean(token && token.trim().length > 0);
}

export function middleware(request: NextRequest) {
  const isAuthenticated = hasAccessToken(request);
  const path = request.nextUrl.pathname;
  const isProtectedPath = path.startsWith("/app");
  const isLoginPath = path === "/auth/login";

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/auth/login"],
};
