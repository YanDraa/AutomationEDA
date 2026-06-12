import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "eda_session_token";

/**
 * Proxy runs before requests complete.
 * Protects /dashboard/* routes — redirects to landing if no session cookie.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/landing", request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Matcher: run on all routes except static assets and API.
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
