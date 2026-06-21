import { type NextRequest, NextResponse } from "next/server";

// Middleware ini tidak memblokir route manapun.
// Auth di-handle oleh masing-masing halaman secara client-side
// karena cookie session berada di domain HF Space (cross-origin).
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
