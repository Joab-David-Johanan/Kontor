# Kontor core API image (multi-stage: build dependencies, then a slim runtime).

# ── Stage 1: install dependencies with uv into /opt/venv ──
FROM python:3.13-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.8.22 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# ── Stage 2: runtime image with only the app and its virtual environment ──
FROM python:3.13-slim
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1
COPY --from=build /opt/venv /opt/venv
WORKDIR /app
COPY alembic.ini main.py ./
COPY core ./core
COPY migrations ./migrations
RUN useradd --system --no-create-home kontor
USER kontor
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
