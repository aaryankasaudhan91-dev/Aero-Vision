"""Fire API Router — Active fire data and fire-HCHO correlation endpoints."""

from fastapi import APIRouter, Query
from typing import Optional
from datetime import date
from app.services.fire_service import FireService

router = APIRouter()
fire_service = FireService()


@router.get("/")
async def get_fire_overview(
    date: Optional[date] = Query(None),
    state: Optional[str] = Query(None),
    source: Optional[str] = Query(None, enum=["MODIS", "VIIRS"]),
):
    """Get active fire overview."""
    return await fire_service.get_overview(date=date, state=state, source=source)


@router.get("/records")
async def get_fire_records(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    state: Optional[str] = Query(None),
    source: Optional[str] = Query(None, enum=["MODIS", "VIIRS"]),
    fire_type: Optional[str] = Query(None, enum=["agricultural", "forest", "unknown"]),
    min_frp: Optional[float] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    radius_km: float = Query(100.0),
    limit: int = Query(500, le=5000),
):
    """Get individual fire detection records."""
    return await fire_service.get_records(
        start_date=start_date, end_date=end_date,
        state=state, source=source, fire_type=fire_type,
        min_frp=min_frp, lat=lat, lon=lon,
        radius_km=radius_km, limit=limit
    )


@router.get("/correlation")
async def get_fire_hcho_correlation(
    region: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    season: Optional[str] = Query(None, enum=["kharif", "rabi", "forest_fire", "annual"]),
):
    """Get fire-HCHO correlation analysis results."""
    return await fire_service.get_correlations(
        region=region, state=state, season=season
    )


@router.get("/correlation/timeseries")
async def get_correlation_timeseries(
    region: str = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
):
    """Get fire FRP and HCHO time-series for scatter/correlation charts."""
    return await fire_service.get_correlation_timeseries(
        region=region, start_date=start_date, end_date=end_date
    )


@router.get("/trends")
async def get_fire_trends(
    start_date: date = Query(...),
    end_date: date = Query(...),
    state: Optional[str] = Query(None),
    granularity: str = Query("daily", enum=["daily", "weekly", "monthly"]),
):
    """Get fire count and FRP trends over time."""
    return await fire_service.get_trends(
        start_date=start_date, end_date=end_date,
        state=state, granularity=granularity
    )


@router.get("/heatmap")
async def get_fire_heatmap(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    resolution: float = Query(0.5, description="Grid resolution in degrees"),
):
    """Get gridded fire density for heatmap visualization."""
    return await fire_service.get_heatmap(
        start_date=start_date, end_date=end_date, resolution=resolution
    )
