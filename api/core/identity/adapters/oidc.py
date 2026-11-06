"""OpenID Connect adapter for the IdentityProvider port.

Kontor never sees passwords. Users sign in at the identity provider (Keycloak); the
web app (a backend-for-frontend) sends their short-lived ACCESS TOKEN (a signed JWT)
with every API call. This adapter:

1. checks the token was issued by one of OUR realms (the "iss" claim),
2. verifies its signature with the realm's public keys (JWKS, fetched and cached),
3. checks it was issued for this API ("aud"), and is not expired ("exp"),
4. maps the token's subject ("sub") to a Kontor user. Tenant and role come from
   Kontor's own database, NOT from claims in the token,
5. refuses a token from the wrong realm for the user's role (customer realm tokens
   can never act as platform staff, and vice versa).

First sign-in: a user is linked by VERIFIED e-mail once; afterwards only (iss, sub) counts.
"""

import json
import time
from typing import Any, cast

import httpx
import jwt
from jwt import PyJWK, PyJWKSet
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from core.config import Settings
from core.identity.base import Principal
from core.models import Tenant, User
from core.values import TENANT_ROLES, Role

JWKS_TTL_SECONDS = 600  # re-fetch the public keys every 10 minutes
JWKS_RETRY_SECONDS = 30  # on an unknown key id, re-fetch at most every 30 seconds
CLOCK_SKEW_SECONDS = 30


class OidcIdentityProvider:
    name = "oidc"

    def __init__(self, settings: Settings, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker
        self._audience = settings.oidc_audience
        public = settings.oidc_public_base.rstrip("/")
        internal = settings.oidc_internal_base.rstrip("/")
        # issuer → which kind of user it may sign in
        self._issuers = {
            f"{public}/realms/{settings.oidc_tenant_realm}": "tenant",
            f"{public}/realms/{settings.oidc_staff_realm}": "platform",
        }
        # issuer → where THIS service downloads its public keys
        self._jwks_urls = {
            issuer: issuer.replace(public, internal, 1) + "/protocol/openid-connect/certs"
            for issuer in self._issuers
        }
        self._cache: dict[str, tuple[PyJWKSet, float]] = {}
        self._static: PyJWKSet | None = None
        if settings.oidc_static_jwks:
            if settings.environment == "production":
                raise RuntimeError("Static JWKS (test keys) must not be used in production.")
            self._static = PyJWKSet.from_json(settings.oidc_static_jwks)

    @property
    def issuers(self) -> list[str]:
        return list(self._issuers)

    async def authenticate(self, credential: str) -> Principal | None:
        if not credential:
            return None
        try:
            header = jwt.get_unverified_header(credential)
            # Read "iss" before verifying, only to choose WHICH keys to verify with.
            issuer = jwt.decode(credential, options={"verify_signature": False}).get("iss")
        except jwt.PyJWTError:
            return None
        kind = self._issuers.get(issuer) if isinstance(issuer, str) else None
        if kind is None or not isinstance(issuer, str):
            return None

        key = await self._signing_key(issuer, header.get("kid"))
        if key is None:
            return None
        try:
            claims: dict[str, Any] = jwt.decode(
                credential,
                key=key.key,
                algorithms=["RS256"],
                audience=self._audience,
                issuer=issuer,
                leeway=CLOCK_SKEW_SECONDS,
                options={"require": ["exp", "iat", "iss", "sub", "aud"]},
            )
        except jwt.PyJWTError:
            return None

        return await self._principal(issuer, kind, claims)

    # ── keys ────────────────────────────────────────────────

    async def _signing_key(self, issuer: str, kid: object) -> PyJWK | None:
        if not isinstance(kid, str):
            return None
        if self._static is not None:
            return _find(self._static, kid)
        cached = self._cache.get(issuer)
        now = time.monotonic()
        if cached and now - cached[1] < JWKS_TTL_SECONDS:
            key = _find(cached[0], kid)
            if key is not None or now - cached[1] < JWKS_RETRY_SECONDS:
                return key
        # Not cached, expired, or an unknown key id (Keycloak rotated its keys): fetch again.
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(self._jwks_urls[issuer])
                response.raise_for_status()
            jwks = PyJWKSet.from_json(response.text)
        except (httpx.HTTPError, jwt.PyJWTError, json.JSONDecodeError):
            return _find(cached[0], kid) if cached else None
        self._cache[issuer] = (jwks, now)
        return _find(jwks, kid)

    # ── user mapping ────────────────────────────────────────

    async def _principal(self, issuer: str, kind: str, claims: dict[str, Any]) -> Principal | None:
        subject = str(claims["sub"])
        query = select(User, Tenant.name).outerjoin(Tenant, Tenant.id == User.tenant_id)
        async with self._sessionmaker() as session:
            row = (
                await session.execute(
                    query.where(User.idp_issuer == issuer, User.idp_subject == subject)
                )
            ).first()
            if row is None:
                row = await self._link_by_verified_email(
                    session, query, issuer, kind, subject, claims
                )
        if row is None:
            return None

        user, tenant_name = row
        role = cast(Role, user.role)
        realm_allows = role in TENANT_ROLES if kind == "tenant" else role == "platform_staff"
        if not realm_allows:
            return None
        return Principal(
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=role,
            tenant_id=user.tenant_id,
            tenant_name=tenant_name,
        )

    async def _link_by_verified_email(
        self,
        session: AsyncSession,
        query: Any,
        issuer: str,
        kind: str,
        subject: str,
        claims: dict[str, Any],
    ) -> Any:
        """First sign-in: attach the IdP identity to the Kontor user with this verified e-mail.

        Only users whose role fits the realm can be linked, so a customer-realm token can
        never claim (and lock out) a platform staff account, or the other way round.
        """
        email = claims.get("email")
        if claims.get("email_verified") is not True or not isinstance(email, str):
            return None
        role_fits = (
            User.role.in_(TENANT_ROLES) if kind == "tenant" else User.role == "platform_staff"
        )
        linked = await session.execute(
            update(User)
            .where(User.email == email.lower(), User.idp_subject.is_(None), role_fits)
            .values(idp_issuer=issuer, idp_subject=subject)
        )
        if linked.rowcount != 1:  # type: ignore[attr-defined]
            return None
        await session.commit()
        return (
            await session.execute(
                query.where(User.idp_issuer == issuer, User.idp_subject == subject)
            )
        ).first()


def _find(jwks: PyJWKSet, kid: str) -> PyJWK | None:
    return next((key for key in jwks.keys if key.key_id == kid), None)
