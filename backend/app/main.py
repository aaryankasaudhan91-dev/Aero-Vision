"""
FastAPI application entry point — Project AeroVision.
Surface AQI & HCHO Hotspot Detection over India.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from app.config import get_settings
from app.routers import aqi, hcho, fire, transport, insights, reports

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🛰️  Project AeroVision API starting...")
    logger.info(f"   Environment: {settings.APP_ENV}")
    logger.info(f"   CORS Origins: {settings.cors_origins_list}")
    yield
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

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(aqi.router, prefix="/api/aqi", tags=["AQI"])
app.include_router(hcho.router, prefix="/api/hcho", tags=["HCHO"])
app.include_router(fire.router, prefix="/api/fire", tags=["Fire"])
app.include_router(transport.router, prefix="/api/transport", tags=["Transport"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "project": "AeroVision", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
