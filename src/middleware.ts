import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mr_profile";

const PUBLIC_PREFIXES = ["/profiles", "/api/", "/_next/", "/favicon"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
