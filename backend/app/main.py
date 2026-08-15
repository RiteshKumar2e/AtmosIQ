"""AeroShield BRICS — FastAPI application entrypoint."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import alerts, analytics, auth, brics, demo, forecast, hotspots, reports
from app.config import settings
from app.database.session import engine, init_db
from app.schemas.schemas import HealthOut
from app.services import gemini_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
)
logger = logging.getLogger("aeroshield")

_STARTED_AT = time.time()

DESCRIPTION = """
**Hyperlocal Pollution Intelligence & Climate Early-Warning Platform**

AeroShield fuses citizen observations, multimodal AI analysis, meteorological
context, satellite-derived features, and historical patterns to detect
hyperlocal pollution hotspots that fixed monitoring networks miss, and to warn
authorities before an event becomes a crisis.

### Provenance
Every value returned by this API carries a `data_mode`:

| Mode | Meaning |
|---|---|
| `LIVE` | Measured in real time by an external provider |
| `SIMULATED` | Synthetic demonstration data — deterministic and reproducible |
| `MODELLED` | Derived by the AeroShield risk or forecast engines |

### AI provider
Google Gemini powers multimodal event classification and risk explanation. If
no `GOOGLE_GEMINI_API_KEY` is configured the platform runs in **DEMO MODE**
with a deterministic local analyser, clearly labelled in every response.

### Cross-border design
No country-specific logic exists in this codebase. Nodes are configured through
environment variables and ISO 3166 region records, so any BRICS member state can
deploy independently. See `/api/brics/overview` for the interoperability
contract.
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialised at %s", settings.database_url)

    # A fresh clone should never open onto an empty dashboard.
    from app.database.seed import seed_if_empty

    seeded = seed_if_empty()
    if seeded:
        logger.info("Seeded demonstration data: %s", seeded)

    logger.info("AI provider: %s", settings.ai_provider)
    if not settings.gemini_enabled:
        logger.warning(
            "GOOGLE_GEMINI_API_KEY is not set — running in DEMO MODE with the "
            "deterministic fallback analyser. Set the key to enable Gemini."
        )
    if settings.is_production and settings.secret_key == "change-me":
        logger.error(
            "SECRET_KEY is still the default value in a production environment. "
            "Set a strong SECRET_KEY before exposing this service."
        )
    yield
    logger.info("AeroShield API shutting down")


app = FastAPI(
    title=settings.app_name,
    description=DESCRIPTION,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Authentication", "description": "Registration, login, and demo sessions"},
        {"name": "Citizen Reports", "description": "Report intake and AI analysis pipeline"},
        {"name": "Hotspots", "description": "Detected hotspots and map layers"},
        {"name": "Forecast", "description": "Near-term pollution risk forecasting"},
        {"name": "Alerts", "description": "Authority alert centre and lifecycle"},
        {"name": "Analytics", "description": "KPIs, trends, coverage, and responsible-AI disclosure"},
        {"name": "BRICS Network", "description": "Cross-border interoperability layer"},
        {"name": "Demo Scenario", "description": "Scripted end-to-end demonstration"},
        {"name": "System", "description": "Health and diagnostics"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

settings.upload_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/static",
    StaticFiles(directory=str(settings.upload_dir.parent)),
    name="static",
)


# --------------------------------------------------------------------------
# Error handling — consistent JSON shape for every failure
# --------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "status": exc.status_code,
                "message": exc.detail,
                "path": request.url.path,
            }
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    fields = [
        {
            "field": ".".join(str(part) for part in error["loc"][1:]) or "body",
            "message": error["msg"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "status": 422,
                "message": "Request validation failed",
                "path": request.url.path,
                "fields": fields,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "status": 500,
                "message": "An unexpected server error occurred",
                "path": request.url.path,
            }
        },
    )


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(hotspots.router)
app.include_router(forecast.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(brics.router)
app.include_router(demo.router)


@app.get("/api/health", response_model=HealthOut, tags=["System"])
def health() -> HealthOut:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database = "connected"
    except Exception as exc:  # noqa: BLE001
        logger.error("Database health check failed: %s", exc)
        database = "unavailable"

    return HealthOut(
        status="ok" if database == "connected" else "degraded",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        database=database,
        ai_provider=gemini_service.provider(),
        gemini_model=settings.gemini_model if settings.gemini_enabled else "deterministic-fallback",
        time=datetime.now(timezone.utc),
        uptime_seconds=round(time.time() - _STARTED_AT, 1),
    )


@app.get("/", tags=["System"])
def root() -> Dict[str, Any]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
        "ai_provider": gemini_service.provider(),
        "home_node": {
            "country_code": settings.default_country_code,
            "region_code": settings.default_region_code,
        },
    }
