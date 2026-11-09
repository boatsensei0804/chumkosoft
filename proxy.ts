import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Route protection (Next.js 16 `proxy` — the renamed `middleware` convention).
 *
 * This is an OPTIMISTIC check only: it reads and verifies the session JWT from the
 * cookie to gate navigation and pre-filter unauthorized users. Authoritative
 * authorization still happens server-side in the DAL (`verifySession` /
 * `getCurrentUser`), which re-checks the account against the database on every
 * request. Never do database work here — `proxy` runs on every route.
 */

const LOGIN_PATH = "/login";
const DEFAULT_AUTHED_PATH = "/dashboard";

function isProtected(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/scan")
    || pathname.startsWith("/scanner-devices")
  );
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);

  // Signed-in users have no reason to see the login screen.
  if (session && pathname === LOGIN_PATH) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHED_PATH, req.url));
  }

  // Unauthenticated access to a protected route → send to login, remembering
  // where they were headed.
  if (!session && isProtected(pathname)) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
