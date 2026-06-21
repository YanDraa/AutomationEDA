import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy runs before requests complete.
 * Auth is handled client-side because the session cookie is set on the
 * HF Space backend domain (cross-origin) and cannot be read server-side
 * on Vercel. All dashboard routes are allowed through.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

/**
 * Matcher: run on all routes except static assets and API.
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
