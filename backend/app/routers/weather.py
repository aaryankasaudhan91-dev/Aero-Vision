"""Weather API Router — FourCastNet weather and climate forecast endpoints."""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from datetime import date
from pydantic import BaseModel
from app.services.fourcastnet_service import FourCastNetService

router = APIRouter()
fourcastnet_service = FourCastNetService()

class TriggerForecastRequest(BaseModel):
    start_date: str

@router.get("/forecast")
async def get_weather_forecast(
    start_date: date = Query(..., description="Target date for the forecast (YYYY-MM-DD)"),
    variable: str = Query(
        "temperature_2m", 
        enum=["temperature_2m", "relative_humidity", "wind_speed_10m", "pbl_height", "surface_pressure"],
        description="The weather/climate variable to retrieve"
    ),
):
    """Retrieve gridded FourCastNet weather forecast overlay data over India."""
    try:
        points = await fourcastnet_service.get_forecast(str(start_date), variable)
        return points
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch forecast: {e}")

@router.post("/forecast/trigger")
async def trigger_weather_forecast(payload: TriggerForecastRequest):
    """Trigger a new 7-day FourCastNet forecasting run from a given starting date."""
    try:
        res = await fourcastnet_service.trigger_forecast(payload.start_date)
        if res.get("status") == "success":
            return res
        raise HTTPException(status_code=500, detail=res.get("message", "Forecasting trigger failed"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger forecast: {e}")
