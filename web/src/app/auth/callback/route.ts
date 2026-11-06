// GET /auth/callback?code=…&state=…
// Keycloak sends the browser back here after sign-in. The server exchanges the one-time
// code for tokens (checking PKCE, state and nonce), stores them in encrypted HttpOnly
// cookies, and records the sign-in in the audit log.

import { NextResponse, type NextRequest } from "next/server";
import * as oidc from "openid-client";
import { recordSessionEvent } from "@/lib/api";
import { APP_URL, CALLBACK_URL, oidcConfig, toSession } from "@/lib/auth/oidc";
import { isRealm, REALMS, type Realm } from "@/lib/auth/realms";
import { COOKIES, sessionCookies, unseal } from "@/lib/auth/session";

type Flow = { realm: string; codeVerifier: string; state: string; nonce: string };

function backToLogin(error: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, APP_URL));
  response.cookies.delete(COOKIES.flow);
  return response;
}

export async function GET(request: NextRequest) {
  const flow = await unseal<Flow>(request.cookies.get(COOKIES.flow)?.value);
  if (!flow || !isRealm(flow.realm)) return backToLogin("expired");
  const realm: Realm = flow.realm;

  let tokens;
  try {
    const config = await oidcConfig(realm);
    // The URL Keycloak redirected to, including ?code=…&state=…
    const currentUrl = new URL(`${CALLBACK_URL}${request.nextUrl.search}`);
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    });
  } catch {
    return backToLogin("sign_in_failed");
  }

  const session = toSession(realm, tokens);
  if (!session) return backToLogin("sign_in_failed");

  // Ask the core API whether this person may use this portal (and audit the sign-in).
  const status = await recordSessionEvent(session.accessToken, "signed_in");
  if (status === 401 || status === 403) {
    // Known to Keycloak but not to Kontor (or the wrong portal): end the Keycloak session too.
    const config = await oidcConfig(realm);
    const logout = oidc.buildEndSessionUrl(config, {
      id_token_hint: session.idToken,
      post_logout_redirect_uri: `${APP_URL}/login?error=not_allowed`,
    });
    const response = NextResponse.redirect(logout);
    response.cookies.delete(COOKIES.flow);
    return response;
  }
  if (status >= 500 || status === 0) return backToLogin("api_unavailable");

  const response = NextResponse.redirect(new URL(REALMS[realm].home, APP_URL));
  response.cookies.delete(COOKIES.flow);
  for (const cookie of await sessionCookies(session)) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
