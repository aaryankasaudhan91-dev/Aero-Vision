"""AQI API Router — Surface Air Quality Index endpoints."""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import date
from app.services.aqi_service import AQIService

router = APIRouter()
aqi_service = AQIService()


@router.get("/")
async def get_aqi_overview(
    date: Optional[date] = Query(None, description="Specific date (YYYY-MM-DD)"),
    state: Optional[str] = Query(None, description="Filter by state"),
    city: Optional[str] = Query(None, description="Filter by city"),
):
    """Get current AQI overview for India with optional filters."""
    return await aqi_service.get_aqi_overview(date=date, state=state, city=city)


@router.get("/stations")
async def get_stations(
    state: Optional[str] = Query(None),
    is_active: bool = Query(True),
):
    """Get all CPCB monitoring stations."""
    return await aqi_service.get_stations(state=state, is_active=is_active)


@router.get("/observations")
async def get_observations(
    station_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    state: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
):
    """Get ground-truth CPCB observations."""
    return await aqi_service.get_observations(
        station_id=station_id, start_date=start_date,
        end_date=end_date, state=state, limit=limit
    )


@router.get("/predictions")
async def get_predictions(
    date: Optional[date] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    model_name: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    radius_km: float = Query(50.0),
    limit: int = Query(500, le=5000),
):
    """Get ML model AQI predictions."""
    return await aqi_service.get_predictions(
        date=date, start_date=start_date, end_date=end_date,
        model_name=model_name, state=state,
        lat=lat, lon=lon, radius_km=radius_km, limit=limit
    )


@router.get("/maps")
async def get_aqi_maps(
    map_type: str = Query("daily", enum=["daily", "weekly", "monthly"]),
    date: Optional[date] = Query(None),
    region_type: str = Query("india", enum=["india", "state", "district"]),
    region_name: Optional[str] = Query(None),
):
    """Get pre-computed AQI maps for dashboard display."""
    return await aqi_service.get_aqi_maps(
        map_type=map_type, date=date,
        region_type=region_type, region_name=region_name
    )


@router.get("/trends")
async def get_aqi_trends(
    start_date: date = Query(...),
    end_date: date = Query(...),
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    pollutant: Optional[str] = Query(None),
):
    """Get AQI time-series trends for charts."""
    return await aqi_service.get_trends(
        start_date=start_date, end_date=end_date,
        state=state, city=city, pollutant=pollutant
    )


@router.get("/pollutant-maps")
async def get_pollutant_maps(
    pollutant: str = Query(..., enum=["PM2.5", "NO2", "SO2", "CO", "O3"]),
    date: Optional[date] = Query(None),
):
    """Get individual pollutant concentration maps."""
    return await aqi_service.get_pollutant_map(pollutant=pollutant, date=date)


@router.get("/models/evaluation")
async def get_model_evaluations():
    """Get performance comparison of all trained ML models."""
    return await aqi_service.get_model_evaluations()


@router.get("/summary")
async def get_dashboard_summary():
    """Get aggregated dashboard summary statistics."""
    return await aqi_service.get_dashboard_summary()
