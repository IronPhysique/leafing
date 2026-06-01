import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mr_profile";

// Paths that never require a profile cookie.
const PUBLIC_PREFIXES = ["/profiles", "/api/", "/_next/", "/favicon"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Redirect to /profiles if no active-profile cookie is present.
 * Cookie validity (profile still in DB) is verified server-side in
 * requireProfileId() — middleware only does the fast presence check.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const profileId = req.cookies.get(COOKIE_NAME)?.value;

  if (!profileId) {
    return NextResponse.redirect(new URL("/profiles", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except Next.js internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
