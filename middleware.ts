import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Maintenance mode kill switch.
 *
 * Set `MAINTENANCE_MODE=1` in Vercel env vars to route all traffic to `/maintenance`.
 * (Except the maintenance page itself and static assets.)
 */
export function middleware(req: NextRequest) {
  const enabled = process.env.MAINTENANCE_MODE === "1";
  if (!enabled) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow maintenance page + Next static assets
  if (
    pathname === "/maintenance" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.jpg"
  ) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/maintenance";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/:path*",
};

