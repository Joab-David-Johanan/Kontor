// OpenID Connect client (openid-client): talks to Keycloak on behalf of the user.
// Runs only on the server (route handlers and proxy.ts), because it uses the client secret.

import * as oidc from "openid-client";
import type { Realm } from "./realms";
import type { Session } from "./session";

const ISSUER_BASE = process.env.KONTOR_OIDC_ISSUER_BASE ?? "http://localhost:8080";
export const APP_URL = process.env.KONTOR_APP_URL ?? "http://localhost:3000";
export const CALLBACK_URL = `${APP_URL}/auth/callback`;

const configs = new Map<Realm, Promise<oidc.Configuration>>();

/** Discover a realm's endpoints and keys once (cached), from its /.well-known document. */
export function oidcConfig(realm: Realm): Promise<oidc.Configuration> {
  let config = configs.get(realm);
  if (!config) {
    const clientId = process.env.KONTOR_OIDC_CLIENT_ID ?? "kontor-web";
    const clientSecret = process.env.KONTOR_OIDC_CLIENT_SECRET;
    if (!clientSecret) throw new Error("KONTOR_OIDC_CLIENT_SECRET is not set.");
    config = oidc.discovery(
      new URL(`${ISSUER_BASE}/realms/${realm}`),
      clientId,
      clientSecret,
      undefined,
      // Plain HTTP is only acceptable for a local Keycloak during development.
      ISSUER_BASE.startsWith("http://") ? { execute: [oidc.allowInsecureRequests] } : undefined,
    );
    config.catch(() => configs.delete(realm)); // retry discovery next time if Keycloak was down
    configs.set(realm, config);
  }
  return config;
}

type Tokens = Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>;

/** Turn a token response into our session shape. */
export function toSession(realm: Realm, tokens: Tokens, previous?: Session): Session | null {
  const now = Math.floor(Date.now() / 1000);
  const idToken = tokens.id_token ?? previous?.idToken;
  const refreshToken = tokens.refresh_token ?? previous?.refreshToken;
  if (!idToken || !refreshToken) return null;
  const refreshExpiresIn =
    typeof tokens.refresh_expires_in === "number" ? tokens.refresh_expires_in : 1800;
  return {
    realm,
    accessToken: tokens.access_token,
    accessExpiresAt: now + (tokens.expiresIn() ?? 300),
    refreshToken,
    refreshExpiresAt: now + refreshExpiresIn,
    idToken,
  };
}

/** Get a fresh access token with the refresh token. Null if the session has ended. */
export async function refreshSession(session: Session): Promise<Session | null> {
  try {
    const config = await oidcConfig(session.realm);
    const tokens = await oidc.refreshTokenGrant(config, session.refreshToken);
    return toSession(session.realm, tokens, session);
  } catch {
    return null; // refresh token expired or revoked (idle timeout, sign-out elsewhere)
  }
}
