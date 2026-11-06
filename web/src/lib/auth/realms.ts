// The two sign-in "doors". Each is a separate Keycloak realm (a separate user store):
// customer staff can never become platform staff by a mistake in one realm.

export const REALMS = {
  customers: { home: "/" },
  "kontor-staff": { home: "/platform/support" },
} as const;

export type Realm = keyof typeof REALMS;

export function isRealm(value: unknown): value is Realm {
  return typeof value === "string" && value in REALMS;
}
