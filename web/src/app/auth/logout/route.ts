// POST /auth/logout  (from the "Sign out" button)
// Records the sign-out, deletes the session cookies, and ends the session at Keycloak too
// (RP-initiated logout), so the next "Sign in" really asks for the password again.

import { NextResponse, type NextRequest } from "next/server";
import * as oidc from "openid-client";
import { recordSessionEvent } from "@/lib/api";
import { APP_URL, oidcConfig } from "@/lib/auth/oidc";
import { readSession, SESSION_COOKIE_NAMES } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  // Only accept sign-out requests coming from our own pages (CSRF protection).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(APP_URL).origin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const session = await readSession((name) => request.cookies.get(name)?.value);
  let target = new URL("/login?signed_out=1", APP_URL);

  if (session) {
    await recordSessionEvent(session.accessToken, "signed_out"); // best effort
    try {
      const config = await oidcConfig(session.realm);
      target = oidc.buildEndSessionUrl(config, {
        id_token_hint: session.idToken,
        post_logout_redirect_uri: `${APP_URL}/login?signed_out=1`,
      });
    } catch {
      // Keycloak unreachable: still sign out locally.
    }
  }

  const response = NextResponse.redirect(target, 303); // 303: the browser follows with GET
  for (const name of SESSION_COOKIE_NAMES) response.cookies.delete(name);
  return response;
}
