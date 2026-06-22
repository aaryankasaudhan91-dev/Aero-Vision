"""Transport API Router — Wind-based pollutant transport analysis."""

from fastapi import APIRouter, Query
from typing import Optional
from datetime import date
from app.services.transport_service import TransportService

router = APIRouter()
transport_service = TransportService()


@router.get("/")
async def get_transport_overview(
    date: Optional[date] = Query(None),
    source_region: Optional[str] = Query(None),
):
    """Get pollutant transport analysis overview."""
    return await transport_service.get_overview(date=date, source_region=source_region)


@router.get("/wind-vectors")
async def get_wind_vectors(
    date: date = Query(...),
    level: str = Query("850hpa", enum=["surface", "850hpa"]),
    bounds: Optional[str] = Query(None, description="lat_min,lon_min,lat_max,lon_max"),
):
    """Get wind vector field data for map visualization."""
    return await transport_service.get_wind_vectors(date=date, level=level, bounds=bounds)


@router.get("/pathways")
async def get_transport_pathways(
    start_date: date = Query(...),
    end_date: date = Query(...),
    source_region: Optional[str] = Query(None),
):
    """Get dominant transport pathways from source regions."""
    return await transport_service.get_pathways(
        start_date=start_date, end_date=end_date, source_region=source_region
    )


@router.get("/source-attribution")
async def get_source_attribution(
    receptor_lat: float = Query(...),
    receptor_lon: float = Query(...),
    date: date = Query(...),
    hours_back: int = Query(72),
):
    """Get source attribution for a receptor location."""
    return await transport_service.get_source_attribution(
        receptor_lat=receptor_lat, receptor_lon=receptor_lon,
        date=date, hours_back=hours_back
    )
