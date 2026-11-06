"""Contract tests for the IdentityProvider port.

EVERY adapter registered in core/identity/registry.py must pass these.
Adding an adapter without a CONTRACT_CASES entry makes this suite fail on purpose.
"""

from collections.abc import Callable
from typing import TypedDict

import pytest

from core.config import get_settings
from core.db import get_sessionmaker
from core.identity.base import IdentityProvider
from core.identity.registry import ADAPTERS, build_identity_provider
from tests.tokens import make_token

pytestmark = pytest.mark.anyio


class Case(TypedDict):
    valid: Callable[[], str]  # produces a credential the adapter must accept
    tenant_id: str | None
    role: str


CONTRACT_CASES: dict[str, Case] = {
    "oidc": {
        "valid": lambda: make_token("a.weber@klinikum-demo.de"),
        "tenant_id": "hospital",
        "role": "tenant_admin",
    },
}


@pytest.fixture(params=sorted(ADAPTERS))
def adapter_name(request: pytest.FixtureRequest) -> str:
    name: str = request.param
    assert name in CONTRACT_CASES, f"Adapter {name!r} has no contract case"
    return name


def make_provider(name: str) -> IdentityProvider:
    settings = get_settings().model_copy(update={"identity_provider": name})
    return build_identity_provider(settings, get_sessionmaker())


async def test_valid_credential_resolves_to_a_principal(adapter_name: str) -> None:
    case = CONTRACT_CASES[adapter_name]
    principal = await make_provider(adapter_name).authenticate(case["valid"]())
    assert principal is not None
    assert principal.tenant_id == case["tenant_id"]
    assert principal.role == case["role"]


async def test_unknown_credential_is_rejected(adapter_name: str) -> None:
    assert await make_provider(adapter_name).authenticate("definitely-not-valid") is None


async def test_empty_credential_is_rejected(adapter_name: str) -> None:
    assert await make_provider(adapter_name).authenticate("") is None


def test_unknown_adapter_name_fails_at_startup() -> None:
    settings = get_settings().model_copy(update={"identity_provider": "magic"})
    with pytest.raises(RuntimeError, match="Unknown identity provider 'magic'"):
        build_identity_provider(settings, get_sessionmaker())
