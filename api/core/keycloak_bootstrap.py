"""Configure Keycloak for Kontor (idempotent: safe to run again).

    python -m core.keycloak_bootstrap

Creates or updates, through Keycloak's admin REST API:
- realm "customers"     : tenant staff (hospital, other customers)
- realm "kontor-staff"  : platform staff, multi-factor authentication REQUIRED
- in each realm a confidential client "kontor-web" (Authorization Code + PKCE)
  whose access tokens carry the audience "kontor-api"
- the demo users, with the password from KONTOR_DEMO_PASSWORD

Every secret comes from environment variables (deploy/compose/.env), never from code.
Re-running it resets the demo passwords to the current KONTOR_DEMO_PASSWORD.
"""

import os
import sys
import time
from typing import Any

import httpx

KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "http://localhost:8080").rstrip("/")
APP_URL = os.environ.get("KONTOR_APP_URL", "http://localhost:3000").rstrip("/")
CLIENT_ID = "kontor-web"
AUDIENCE = "kontor-api"

REALMS: dict[str, dict[str, Any]] = {
    "customers": {
        "displayName": "Kontor · Customer staff",
        "ssoSessionIdleTimeout": 1800,  # 30 min idle, matching the hospital's security setting
        "required_actions": [],
    },
    "kontor-staff": {
        "displayName": "Kontor · Platform staff",
        "ssoSessionIdleTimeout": 1800,
        "required_actions": ["CONFIGURE_TOTP"],  # authenticator app on first sign-in
    },
}

USERS: dict[str, list[dict[str, str]]] = {
    "customers": [
        {"email": "a.weber@klinikum-demo.de", "firstName": "Anna", "lastName": "Weber"},
        {"email": "j.keller@klinikum-demo.de", "firstName": "Jonas", "lastName": "Keller"},
        {"email": "m.arslan@klinikum-demo.de", "firstName": "Mehmet", "lastName": "Arslan"},
        {"email": "p.mueller@brenner-demo.de", "firstName": "Petra", "lastName": "Müller"},
    ],
    "kontor-staff": [
        {"email": "l.hoffmann@kontor.dev", "firstName": "Lena", "lastName": "Hoffmann"},
    ],
}


def env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        sys.exit(f"Missing {name}. Set it in deploy/compose/.env (see .env.example).")
    return value


def wait_for_keycloak(client: httpx.Client) -> None:
    for _ in range(90):
        try:
            if client.get(f"{KEYCLOAK_URL}/realms/master").status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(2)
    sys.exit(f"Keycloak did not become ready at {KEYCLOAK_URL}.")


def admin_token(client: httpx.Client) -> str:
    response = client.post(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": env("KEYCLOAK_ADMIN_USER"),
            "password": env("KEYCLOAK_ADMIN_PASSWORD"),
        },
    )
    response.raise_for_status()
    return str(response.json()["access_token"])


def realm_representation(name: str, settings: dict[str, Any]) -> dict[str, Any]:
    return {
        "realm": name,
        "enabled": True,
        "displayName": settings["displayName"],
        "loginWithEmailAllowed": True,
        "registrationEmailAsUsername": True,
        "duplicateEmailsAllowed": False,
        "registrationAllowed": False,  # accounts are created by the platform, not self-service
        "resetPasswordAllowed": False,
        "rememberMe": False,
        # brute-force protection: lock an account for a while after 5 failed attempts
        "bruteForceProtected": True,
        "failureFactor": 5,
        "waitIncrementSeconds": 60,
        "maxFailureWaitSeconds": 900,
        "permanentLockout": False,
        "passwordPolicy": "length(12) and notUsername and notEmail",
        "accessTokenLifespan": 300,  # 5-minute access tokens; the web app refreshes them
        "ssoSessionIdleTimeout": settings["ssoSessionIdleTimeout"],
        "ssoSessionMaxLifespan": 36000,  # 10 hours
        "sslRequired": "external",  # HTTPS required except from localhost/private networks
        # Keep login events (incl. failed attempts) and admin actions for 7 days, visible in
        # the admin console under "Events": the audit trail for debugging and security.
        "eventsEnabled": True,
        "eventsExpiration": 604800,
        "adminEventsEnabled": True,
        "adminEventsDetailsEnabled": False,
    }


def client_representation(secret: str) -> dict[str, Any]:
    return {
        "clientId": CLIENT_ID,
        "name": "Kontor web console",
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": False,  # confidential: the Next.js server holds a secret
        "clientAuthenticatorType": "client-secret",
        "secret": secret,
        "standardFlowEnabled": True,  # Authorization Code flow
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,  # no password grant: users only type passwords here
        "serviceAccountsEnabled": False,
        "redirectUris": [f"{APP_URL}/auth/callback"],
        "webOrigins": [APP_URL],
        "attributes": {
            "pkce.code.challenge.method": "S256",
            "post.logout.redirect.uris": f"{APP_URL}/*",
        },
    }


AUDIENCE_MAPPER = {
    "name": "kontor-api audience",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-audience-mapper",
    "config": {
        "included.custom.audience": AUDIENCE,
        "access.token.claim": "true",
        "id.token.claim": "false",
        "introspection.token.claim": "true",
    },
}


def ensure_realm(api: httpx.Client, name: str, settings: dict[str, Any]) -> None:
    representation = realm_representation(name, settings)
    if api.get(f"/admin/realms/{name}").status_code == 404:
        api.post("/admin/realms", json=representation).raise_for_status()
        print(f"  realm {name}: created")
    else:
        api.put(f"/admin/realms/{name}", json=representation).raise_for_status()
        print(f"  realm {name}: updated")


def ensure_client(api: httpx.Client, realm: str, secret: str) -> None:
    representation = client_representation(secret)
    found = api.get(f"/admin/realms/{realm}/clients", params={"clientId": CLIENT_ID}).json()
    if not found:
        api.post(f"/admin/realms/{realm}/clients", json=representation).raise_for_status()
        found = api.get(f"/admin/realms/{realm}/clients", params={"clientId": CLIENT_ID}).json()
        print(f"  client {CLIENT_ID}: created")
    else:
        api.put(
            f"/admin/realms/{realm}/clients/{found[0]['id']}", json=representation
        ).raise_for_status()
        print(f"  client {CLIENT_ID}: updated")
    client_uuid = found[0]["id"]
    mappers = api.get(f"/admin/realms/{realm}/clients/{client_uuid}/protocol-mappers/models")
    if not any(m["name"] == AUDIENCE_MAPPER["name"] for m in mappers.json()):
        api.post(
            f"/admin/realms/{realm}/clients/{client_uuid}/protocol-mappers/models",
            json=AUDIENCE_MAPPER,
        ).raise_for_status()


def ensure_user(
    api: httpx.Client, realm: str, user: dict[str, str], password: str, actions: list[str]
) -> None:
    credential = {"type": "password", "value": password, "temporary": False}
    found = api.get(
        f"/admin/realms/{realm}/users", params={"email": user["email"], "exact": "true"}
    ).json()
    if not found:
        api.post(
            f"/admin/realms/{realm}/users",
            json={
                "username": user["email"],
                **user,
                "enabled": True,
                "emailVerified": True,  # the platform vouches for these addresses
                "credentials": [credential],
                "requiredActions": actions,
            },
        ).raise_for_status()
        print(f"  user {user['email']}: created")
    else:
        api.put(
            f"/admin/realms/{realm}/users/{found[0]['id']}/reset-password", json=credential
        ).raise_for_status()
        print(f"  user {user['email']}: password reset")


def main() -> None:
    password = env("KONTOR_DEMO_PASSWORD")
    secret = env("KONTOR_OIDC_CLIENT_SECRET")
    if len(password) < 12:
        sys.exit("KONTOR_DEMO_PASSWORD must be at least 12 characters (realm password policy).")

    with httpx.Client(timeout=10) as client:
        print(f"Waiting for Keycloak at {KEYCLOAK_URL} ...")
        wait_for_keycloak(client)
        token = admin_token(client)

    headers = {"Authorization": f"Bearer {token}"}
    with httpx.Client(base_url=KEYCLOAK_URL, headers=headers, timeout=20) as api:
        for realm, settings in REALMS.items():
            print(f"Realm {realm}")
            ensure_realm(api, realm, settings)
            ensure_client(api, realm, secret)
            for user in USERS[realm]:
                ensure_user(api, realm, user, password, settings["required_actions"])
    print("Keycloak is configured for Kontor.")


if __name__ == "__main__":
    main()
