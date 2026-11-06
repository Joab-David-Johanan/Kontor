"""Test access tokens, signed like Keycloak signs them, but with a key made for the tests.

conftest.py publishes this key's public half to the API as a static JWKS
(KONTOR_OIDC_STATIC_JWKS), so the real OIDC adapter verifies these tokens exactly as it
verifies Keycloak's, and CI needs no running Keycloak.
"""

import json
import time
from typing import Any

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
KID = "kontor-test-key"
ISSUER_BASE = "http://localhost:8080/realms"


def jwks_json() -> str:
    jwk: dict[str, Any] = json.loads(RSAAlgorithm.to_jwk(KEY.public_key()))
    jwk.update(kid=KID, use="sig", alg="RS256")
    return json.dumps({"keys": [jwk]})


def make_token(
    email: str,
    realm: str = "customers",
    *,
    sub: str | None = None,
    audience: str = "kontor-api",
    expires_in: int = 3600,
    issuer: str | None = None,
    email_verified: bool = True,
    key: rsa.RSAPrivateKey = KEY,
) -> str:
    now = int(time.time())
    claims = {
        "iss": issuer or f"{ISSUER_BASE}/{realm}",
        "sub": sub or f"kc-{realm}-{email}",
        "aud": audience,
        "iat": now,
        "exp": now + expires_in,
        "email": email,
        "email_verified": email_verified,
    }
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": KID})


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


HOSPITAL = bearer(make_token("a.weber@klinikum-demo.de"))  # tenant_admin
OPERATOR = bearer(make_token("j.keller@klinikum-demo.de"))  # tenant_operator
BRENNER = bearer(make_token("p.mueller@brenner-demo.de"))  # another tenant's admin
PLATFORM = bearer(make_token("l.hoffmann@kontor.dev", realm="kontor-staff"))
UNKNOWN = {"Authorization": "Bearer not-a-real-token"}
