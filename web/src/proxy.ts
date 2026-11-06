// proxy.ts runs on the server BEFORE every page request (it was called "middleware"
// before Next.js 16). It is the gatekeeper:
//
// 1. Not signed in            → /login (the dual sign-in page)
// 2. Signed in at the wrong door → back to your own portal
//    (customer staff can't open /platform/*, platform staff only use /platform/*)
// 3. Access token about to expire → refresh it with the refresh token, so pages and the
//    API always see a valid token. If the session has ended (idle timeout, signed out
//    elsewhere), the user is sent to /login.
//
// The API checks every token and role again; this file only makes the experience smooth.

import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/auth/oidc";
import { REALMS } from "@/lib/auth/realms";
import { readSession, SESSION_COOKIE_NAMES, sessionCookies } from "@/lib/auth/session";

const REFRESH_WHEN_SECONDS_LEFT = 60;

function redirectTo(path: string, request: NextRequest, clearSession = false) {
  const response = NextResponse.redirect(new URL(path, request.url));
  if (clearSession) for (const name of SESSION_COOKIE_NAMES) response.cookies.delete(name);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const onLoginPage = pathname === "/login";
  const session = await readSession((name) => request.cookies.get(name)?.value);

  if (!session) return onLoginPage ? NextResponse.next() : redirectTo("/login", request);

  const home = REALMS[session.realm].home;
  const inPlatform = pathname === "/platform" || pathname.startsWith("/platform/");
  if (onLoginPage) return redirectTo(home, request);
  if (session.realm === "customers" && inPlatform) return redirectTo(home, request);
  if (session.realm === "kontor-staff" && !inPlatform) return redirectTo(home, request);

  const secondsLeft = session.accessExpiresAt - Math.floor(Date.now() / 1000);
  if (secondsLeft > REFRESH_WHEN_SECONDS_LEFT) return NextResponse.next();

  const refreshed = await refreshSession(session);
  if (!refreshed) return redirectTo("/login?error=session_expired", request, true);

  const cookies = await sessionCookies(refreshed);
  // Give THIS request the new tokens (pages read them) …
  for (const cookie of cookies) request.cookies.set(cookie.name, cookie.value);
  const response = NextResponse.next({ request: { headers: request.headers } });
  // … and store them in the browser for the next requests.
  for (const cookie of cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export const config = {
  // Everything except Next.js assets, the favicon and the /auth/* routes themselves.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/).*)"],
};
