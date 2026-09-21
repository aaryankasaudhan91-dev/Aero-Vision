"""
FastAPI application entry point — Project AeroVision.
Surface AQI & HCHO Hotspot Detection over India.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from app.config import get_settings
from app.routers import aqi, hcho, fire, transport, insights, reports, weather, alerts, keepalive
from app.services.keep_alive_service import keep_alive_service

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🛰️  Project AeroVision API starting...")
    logger.info(f"   Environment: {settings.APP_ENV}")
    logger.info(f"   CORS Origins: {settings.cors_origins_list}")

    # Launch automated free keep-alive workaround (prevents 15-min free tier inactivity sleep)
    keep_alive_service.start()

    yield

    # Graceful shutdown of background keep-alive worker
    await keep_alive_service.stop()
    logger.info("🛰️  Project AeroVision API shutting down.")


app = FastAPI(
    title="Project AeroVision API",
    description=(
        "Surface AQI Prediction & HCHO Hotspot Detection over India "
        "using Satellite Data, ML/DL, and Geospatial Analysis."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Security Headers & HSTS ──
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers (mounted with both /api and root aliases for seamless compatibility) ──
for pfx in ["/api", ""]:
    app.include_router(aqi.router, prefix=f"{pfx}/aqi", tags=["AQI"], include_in_schema=(pfx == "/api"))
    app.include_router(hcho.router, prefix=f"{pfx}/hcho", tags=["HCHO"], include_in_schema=(pfx == "/api"))
    app.include_router(fire.router, prefix=f"{pfx}/fire", tags=["Fire"], include_in_schema=(pfx == "/api"))
    app.include_router(transport.router, prefix=f"{pfx}/transport", tags=["Transport"], include_in_schema=(pfx == "/api"))
    app.include_router(insights.router, prefix=f"{pfx}/insights", tags=["Insights"], include_in_schema=(pfx == "/api"))
    app.include_router(reports.router, prefix=f"{pfx}/reports", tags=["Reports"], include_in_schema=(pfx == "/api"))
    app.include_router(weather.router, prefix=f"{pfx}/weather", tags=["Weather"], include_in_schema=(pfx == "/api"))
    app.include_router(alerts.router, prefix=f"{pfx}/alerts", tags=["Alerts"], include_in_schema=(pfx == "/api"))
    app.include_router(keepalive.router, prefix=f"{pfx}/keepalive", tags=["KeepAlive"], include_in_schema=(pfx == "/api"))


@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "project": "AeroVision",
        "version": "1.2.1",
        "keepalive": keep_alive_service.get_status(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
