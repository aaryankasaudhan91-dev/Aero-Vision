"""HCHO API Router — Formaldehyde hotspot detection endpoints."""

from fastapi import APIRouter, Query
from typing import Optional
from datetime import date
from app.services.hcho_service import HCHOService

router = APIRouter()
hcho_service = HCHOService()


@router.get("/")
async def get_hcho_overview(
    date: Optional[date] = Query(None),
    state: Optional[str] = Query(None),
    season: Optional[str] = Query(None, enum=["kharif", "rabi", "forest_fire", "annual"]),
):
    """Get HCHO concentration overview."""
    return await hcho_service.get_overview(date=date, state=state, season=season)


@router.get("/concentrations")
async def get_hcho_concentrations(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    state: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    radius_km: float = Query(50.0),
    limit: int = Query(500, le=5000),
):
    """Get raw HCHO concentration data from TROPOMI."""
    return await hcho_service.get_concentrations(
        start_date=start_date, end_date=end_date,
        state=state, lat=lat, lon=lon, radius_km=radius_km, limit=limit
    )


@router.get("/hotspots")
async def get_hotspots(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    method: Optional[str] = Query(None, enum=["dbscan", "getis_ord", "morans_i", "percentile"]),
    season: Optional[str] = Query(None, enum=["kharif", "rabi", "forest_fire", "annual"]),
    state: Optional[str] = Query(None),
    period_type: Optional[str] = Query(None, enum=["daily", "weekly", "seasonal", "annual"]),
    min_hcho: Optional[float] = Query(None),
    limit: int = Query(200, le=2000),
):
    """Get detected HCHO hotspots with filtering."""
    return await hcho_service.get_hotspots(
        start_date=start_date, end_date=end_date,
        method=method, season=season, state=state,
        period_type=period_type, min_hcho=min_hcho, limit=limit
    )


@router.get("/hotspots/regions")
async def get_hotspot_regions():
    """Get summary of all identified hotspot regions (IGP, Punjab, etc.)."""
    return await hcho_service.get_hotspot_regions()


@router.get("/hotspots/seasonal")
async def get_seasonal_hotspots(
    season: str = Query(..., enum=["kharif", "rabi", "forest_fire", "annual"]),
    year: Optional[int] = Query(None),
):
    """Get seasonal aggregated hotspot maps."""
    return await hcho_service.get_seasonal_hotspots(season=season, year=year)


@router.get("/trends")
async def get_hcho_trends(
    start_date: date = Query(...),
    end_date: date = Query(...),
    state: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    """Get HCHO time-series trends."""
    return await hcho_service.get_trends(
        start_date=start_date, end_date=end_date,
        state=state, region=region
    )


@router.get("/climatology")
async def get_hcho_climatology(
    state: Optional[str] = Query(None),
):
    """Get multi-year HCHO climatology statistics."""
    return await hcho_service.get_climatology(state=state)
