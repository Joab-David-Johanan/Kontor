"""Test setup: a fresh test database, migrated with Alembic and seeded, once per run.

Needs the Postgres container (deploy/compose) or any Postgres reachable at
KONTOR_TEST_ADMIN_URL. The test database "kontor_test" is dropped and recreated.
"""

import asyncio
import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

# These must be set BEFORE the app is imported: settings are read once and cached.
ADMIN_URL = os.environ.get(
    "KONTOR_TEST_ADMIN_URL", "postgresql://kontor:kontor@localhost:5433/postgres"
)
TEST_DB = "kontor_test"
_server = ADMIN_URL.rsplit("/", 1)[0].replace("postgresql://", "postgresql+asyncpg://", 1)
os.environ["KONTOR_DATABASE_URL"] = f"{_server}/{TEST_DB}"
os.environ["KONTOR_ENVIRONMENT"] = "test"
os.environ["KONTOR_DB_POOL"] = "null"  # every test has its own event loop: no shared pool
os.environ["KONTOR_IDENTITY_PROVIDER"] = "oidc"
os.environ["KONTOR_OIDC_PUBLIC_BASE"] = "http://localhost:8080"

from tests.tokens import jwks_json  # noqa: E402

# The API verifies test tokens with this public key instead of fetching Keycloak's keys.
os.environ["KONTOR_OIDC_STATIC_JWKS"] = jwks_json()

import asyncpg  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

API_DIR = Path(__file__).resolve().parent.parent


async def _recreate_database() -> None:
    conn = await asyncpg.connect(ADMIN_URL)
    try:
        await conn.execute(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)")
        await conn.execute(f"CREATE DATABASE {TEST_DB}")
    finally:
        await conn.close()


@pytest.fixture(scope="session", autouse=True)
def database() -> Iterator[None]:
    asyncio.run(_recreate_database())
    command.upgrade(Config(str(API_DIR / "alembic.ini")), "head")  # tests the migration too

    from core.seed import run

    asyncio.run(run(reset=False))
    yield


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    from main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
