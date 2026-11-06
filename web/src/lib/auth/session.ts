// Session cookies for the backend-for-frontend (BFF) pattern.
//
// The OpenID Connect tokens stay on the SERVER side of the app: the browser only holds
// them inside ENCRYPTED, HttpOnly cookies (JavaScript in the page can't read them, and
// without KONTOR_SESSION_SECRET nobody can decrypt them). Tokens are split over three
// cookies because together they are larger than one cookie may be (about 4 KB).

import { EncryptJWT, jwtDecrypt } from "jose";
import { isRealm, type Realm } from "./realms";

export type Session = {
  realm: Realm;
  accessToken: string; // short-lived (5 min), sent to the API as a Bearer token
  accessExpiresAt: number; // seconds since 1970
  refreshToken: string; // used to get a new access token without signing in again
  refreshExpiresAt: number;
  idToken: string; // proves who signed in; needed to sign out at Keycloak
};

export const COOKIES = {
  access: "kontor_at",
  refresh: "kontor_rt",
  id: "kontor_idt",
  flow: "kontor_oidc", // short-lived: PKCE verifier, state and nonce during sign-in
} as const;

export const SESSION_COOKIE_NAMES = [COOKIES.access, COOKIES.refresh, COOKIES.id];

let keyPromise: Promise<Uint8Array> | null = null;

function encryptionKey(): Promise<Uint8Array> {
  keyPromise ??= (async () => {
    const secret = process.env.KONTOR_SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("KONTOR_SESSION_SECRET must be set to at least 32 characters.");
    }
    // Derive a 256-bit key from the secret.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    return new Uint8Array(digest);
  })();
  return keyPromise;
}

/** Encrypt a small JSON payload (AES-256-GCM, authenticated: tampering is detected). */
export async function seal(payload: Record<string, unknown>, maxAgeSeconds: number): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${Math.max(1, Math.floor(maxAgeSeconds))}s`)
    .encrypt(await encryptionKey());
}

/** Decrypt a sealed value; null if missing, expired or tampered with. */
export async function unseal<T>(value: string | undefined): Promise<T | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, await encryptionKey());
    return payload as T;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true, // not readable by JavaScript in the page
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax" as const, // not sent on cross-site POSTs (CSRF protection)
    path: "/",
    maxAge: Math.max(0, Math.floor(maxAgeSeconds)),
  };
}

type CookieGetter = (name: string) => string | undefined;

export async function readSession(get: CookieGetter): Promise<Session | null> {
  const [access, refresh, id] = await Promise.all([
    unseal<{ realm: string; at: string; atExp: number }>(get(COOKIES.access)),
    unseal<{ rt: string; rexp: number }>(get(COOKIES.refresh)),
    unseal<{ idt: string }>(get(COOKIES.id)),
  ]);
  if (!access || !refresh || !id || !isRealm(access.realm)) return null;
  return {
    realm: access.realm,
    accessToken: access.at,
    accessExpiresAt: access.atExp,
    refreshToken: refresh.rt,
    refreshExpiresAt: refresh.rexp,
    idToken: id.idt,
  };
}

/** The three cookies to set for a session. They live as long as the refresh token. */
export async function sessionCookies(session: Session) {
  const maxAge = session.refreshExpiresAt - Math.floor(Date.now() / 1000);
  const options = cookieOptions(maxAge);
  return [
    {
      name: COOKIES.access,
      // NOT named "exp": that claim is the cookie's own expiry, set by seal().
      value: await seal({ realm: session.realm, at: session.accessToken, atExp: session.accessExpiresAt }, maxAge),
      options,
    },
    {
      name: COOKIES.refresh,
      value: await seal({ rt: session.refreshToken, rexp: session.refreshExpiresAt }, maxAge),
      options,
    },
    { name: COOKIES.id, value: await seal({ idt: session.idToken }, maxAge), options },
  ];
}
