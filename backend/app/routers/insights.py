"""Insights API Router — AI-generated scientific summaries."""

from fastapi import APIRouter, Query
from typing import Optional
from app.services.insights_service import InsightsService

router = APIRouter()
insights_service = InsightsService()


@router.get("/")
async def get_all_insights(
    insight_type: Optional[str] = Query(None, enum=["aqi_trend", "hotspot", "fire_impact", "transport"]),
    region: Optional[str] = Query(None),
    severity: Optional[str] = Query(None, enum=["info", "warning", "critical"]),
    limit: int = Query(20, le=100),
):
    """Get AI-generated scientific insights."""
    return await insights_service.get_insights(
        insight_type=insight_type, region=region,
        severity=severity, limit=limit
    )


@router.get("/summary")
async def get_executive_summary():
    """Get executive summary of all findings."""
    return await insights_service.get_executive_summary()


@router.post("/generate")
async def generate_insights():
    """Trigger real-time regeneration of scientific insights."""
    return await insights_service.generate_live_insights()


@router.get("/aqi")
async def get_aqi_insights():
    """Get AQI-specific trend analysis insights."""
    return await insights_service.get_aqi_insights()


@router.get("/hcho")
async def get_hcho_insights():
    """Get HCHO hotspot explanation insights."""
    return await insights_service.get_hcho_insights()


@router.get("/fire")
async def get_fire_insights():
    """Get biomass burning influence insights."""
    return await insights_service.get_fire_insights()


@router.get("/transport")
async def get_transport_insights():
    """Get pollutant transport findings."""
    return await insights_service.get_transport_insights()

