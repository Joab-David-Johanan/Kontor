// GET /auth/login?realm=customers | kontor-staff
// Starts the OpenID Connect Authorization Code flow with PKCE: sends the browser to
// Keycloak's sign-in page. Kontor never sees the password.

import { NextResponse, type NextRequest } from "next/server";
import * as oidc from "openid-client";
import { CALLBACK_URL, APP_URL, oidcConfig } from "@/lib/auth/oidc";
import { isRealm } from "@/lib/auth/realms";
import { COOKIES, cookieOptions, seal } from "@/lib/auth/session";

const FLOW_SECONDS = 600; // the user has 10 minutes to finish signing in

export async function GET(request: NextRequest) {
  const realm = request.nextUrl.searchParams.get("realm");
  if (!isRealm(realm)) return NextResponse.redirect(new URL("/login", APP_URL));

  let config;
  try {
    config = await oidcConfig(realm);
  } catch {
    return NextResponse.redirect(new URL("/login?error=idp_unavailable", APP_URL));
  }

  // PKCE: a one-time secret; only its hash goes to Keycloak. Whoever exchanges the code
  // must present the original, so a stolen authorization code is useless.
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  // state: protects the callback against forged requests (CSRF); nonce: binds the ID token
  // to this sign-in (replay protection).
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();

  const authorizationUrl = oidc.buildAuthorizationUrl(config, {
    redirect_uri: CALLBACK_URL,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(
    COOKIES.flow,
    await seal({ realm, codeVerifier, state, nonce }, FLOW_SECONDS),
    cookieOptions(FLOW_SECONDS),
  );
  return response;
}
