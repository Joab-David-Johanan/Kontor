"""Kontor core API entry point.

Run locally:  uv run uvicorn main:app --reload
API docs:     http://localhost:8000/docs
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from core.db import get_engine
from core.identity.registry import get_identity_provider
from core.routers import conversations, dashboard, health, me, security, support


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield
    await get_engine().dispose()  # close pooled database connections on shutdown


def create_app() -> FastAPI:
    # Fail fast: an unknown adapter name in the configuration stops startup here.
    get_identity_provider()

    app = FastAPI(
        title="Kontor core API",
        version="0.2.0",
        description="Multi-tenant core of the Kontor agentic AI platform.",
        lifespan=lifespan,
    )
    for module in (health, me, conversations, dashboard, security, support):
        app.include_router(module.router)
    return app


app = create_app()
