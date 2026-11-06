"""The OpenID Connect adapter rejects every kind of bad token, and links accounts safely."""

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from core.config import get_settings
from core.db import get_sessionmaker
from core.identity.adapters.oidc import OidcIdentityProvider
from tests.tokens import make_token

pytestmark = pytest.mark.anyio

ANNA = "a.weber@klinikum-demo.de"
LENA = "l.hoffmann@kontor.dev"


def provider() -> OidcIdentityProvider:
    return OidcIdentityProvider(get_settings(), get_sessionmaker())


async def test_valid_token_resolves_user_tenant_and_role() -> None:
    principal = await provider().authenticate(make_token(ANNA))
    assert principal is not None
    assert (principal.name, principal.tenant_id, principal.role) == (
        "Dr. Anna Weber",
        "hospital",
        "tenant_admin",
    )


async def test_expired_token_is_rejected() -> None:
    assert await provider().authenticate(make_token(ANNA, expires_in=-120)) is None


async def test_token_for_another_audience_is_rejected() -> None:
    assert await provider().authenticate(make_token(ANNA, audience="some-other-api")) is None


async def test_token_from_an_unknown_issuer_is_rejected() -> None:
    evil = make_token(ANNA, issuer="http://evil.example/realms/customers")
    assert await provider().authenticate(evil) is None


async def test_token_signed_with_another_key_is_rejected() -> None:
    attacker_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    assert await provider().authenticate(make_token(ANNA, key=attacker_key)) is None


async def test_tampered_token_is_rejected() -> None:
    header, payload, signature = make_token(ANNA).split(".")
    tampered = f"{header}.{payload[:-4]}AAAA.{signature}"
    assert await provider().authenticate(tampered) is None


async def test_unknown_person_is_rejected() -> None:
    assert await provider().authenticate(make_token("stranger@example.com")) is None


async def test_unverified_email_is_never_linked() -> None:
    token = make_token("m.arslan@klinikum-demo.de", sub="unverified-sub", email_verified=False)
    assert await provider().authenticate(token) is None


async def test_platform_staff_cannot_sign_in_through_the_customer_realm() -> None:
    # A customer-realm token for Lena's address must neither work nor claim her account.
    via_customers = make_token(LENA, realm="customers")
    assert await provider().authenticate(via_customers) is None
    via_staff_realm = make_token(LENA, realm="kontor-staff")
    principal = await provider().authenticate(via_staff_realm)
    assert principal is not None and principal.role == "platform_staff"


async def test_tenant_staff_cannot_sign_in_through_the_staff_realm() -> None:
    assert await provider().authenticate(make_token(ANNA, realm="kontor-staff")) is None


async def test_once_linked_only_the_same_subject_is_accepted() -> None:
    assert await provider().authenticate(make_token(ANNA)) is not None  # links (or is linked)
    impostor = make_token(ANNA, sub="a-different-identity")
    assert await provider().authenticate(impostor) is None


def test_static_test_keys_refuse_production() -> None:
    settings = get_settings().model_copy(update={"environment": "production"})
    with pytest.raises(RuntimeError, match="must not be used in production"):
        OidcIdentityProvider(settings, get_sessionmaker())
