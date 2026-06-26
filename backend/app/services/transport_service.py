"""Transport Service — Wind-based pollutant transport analysis."""

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from app.database import supabase
from app.services.utils import find_nearest_date
import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance between two points in km."""
    r = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class TransportService:
    """Service for wind vector analysis and transport pathway computation."""

    async def get_overview(self, date: Optional[date] = None, source_region: Optional[str] = None) -> List[Dict]:
        """Get transport analysis overview."""
        query = supabase.table("transport_analysis").select("*")
        if date:
            query = query.eq("analysis_date", str(date))
        if source_region:
            query = query.eq("source_region", source_region)
        result = await asyncio.to_thread(query.order("analysis_date", desc=True).limit(100).execute)
        return result.data or []

    async def get_wind_vectors(self, date: date, level: str = "850hpa", bounds: Optional[str] = None) -> List[Dict]:
        """Get wind vector field for map visualization."""
        current_query_date = find_nearest_date("meteorological_data", "observed_date", date)

        query = supabase.table("meteorological_data").select(
            "latitude, longitude, u_wind_850hpa, v_wind_850hpa, "
            "u_wind_10m, v_wind_10m, wind_speed_10m, wind_direction"
        ).eq("observed_date", str(current_query_date)).not_.is_("u_wind_10m", "null")

        result = await asyncio.to_thread(query.limit(5000).execute)
        data = result.data or []

        vectors = []
        for r in data:
            u = None
            v = None
            if level == "850hpa":
                u = r.get("u_wind_850hpa")
                v = r.get("v_wind_850hpa")
            
            if u is None or v is None:
                u = r.get("u_wind_10m")
                v = r.get("v_wind_10m")

            if u is not None and v is not None:
                speed = math.sqrt(u ** 2 + v ** 2)
                direction = (math.degrees(math.atan2(-u, -v)) + 360) % 360
                vectors.append({
                    "lat": r["latitude"], "lon": r["longitude"],
                    "u": round(u, 3), "v": round(v, 3),
                    "speed": round(speed, 2), "direction": round(direction, 1),
                })

        if bounds:
            parts = [float(x) for x in bounds.split(",")]
            if len(parts) == 4:
                lat_min, lon_min, lat_max, lon_max = parts
                vectors = [v for v in vectors
                           if lat_min <= v["lat"] <= lat_max and lon_min <= v["lon"] <= lon_max]

        return vectors

    async def get_pathways(
        self, start_date: date, end_date: date, source_region: Optional[str] = None
    ) -> List[Dict]:
        """Get transport pathways."""
        query = supabase.table("transport_analysis").select("*").gte(
            "analysis_date", str(start_date)
        ).lte("analysis_date", str(end_date))
        if source_region:
            query = query.eq("source_region", source_region)
        result = await asyncio.to_thread(query.order("analysis_date").limit(500).execute)
        return result.data or []

    async def get_source_attribution(
        self, receptor_lat: float, receptor_lon: float, date: date, hours_back: int = 72
    ) -> Dict:
        """Compute source attribution for a receptor location using wind back-tracking."""
        current_query_date = find_nearest_date("meteorological_data", "observed_date", date)

        query = supabase.table("meteorological_data").select(
            "latitude, longitude, u_wind_850hpa, v_wind_850hpa, u_wind_10m, v_wind_10m, wind_speed_10m"
        ).eq("observed_date", str(current_query_date)).not_.is_("u_wind_10m", "null")
        
        met_data = await asyncio.to_thread(query.limit(2000).execute)
        data = met_data.data or []

        if not data:
            return {"receptor": {"lat": receptor_lat, "lon": receptor_lon}, "sources": [], "date": str(date), "trajectory": []}


        # Simple back-trajectory estimation
        trajectory = [{"lat": receptor_lat, "lon": receptor_lon, "hour": 0}]
        current_lat, current_lon = receptor_lat, receptor_lon

        for hour in range(1, hours_back + 1):
            # Find nearest wind observation using mathematically correct Haversine distance
            best = None
            best_dist = float("inf")
            for obs in data:
                dist = haversine_distance(obs["latitude"], obs["longitude"], current_lat, current_lon)
                if dist < best_dist:
                    best_dist = dist
                    best = obs

            if best:
                u = best.get("u_wind_850hpa")
                v = best.get("v_wind_850hpa")
                
                # Fallback to 10m wind components
                if u is None or v is None:
                    u = best.get("u_wind_10m")
                    v = best.get("v_wind_10m")

                if u is not None and v is not None:
                    # Back-track: move opposite to wind direction
                    dt_hours = 1
                    dlat = -v * dt_hours * 3600 / 111000  # m/s to degrees
                    
                    # Prevent division by zero near poles
                    cos_lat = math.cos(math.radians(current_lat))
                    if abs(cos_lat) < 0.01:
                        cos_lat = 0.01 if cos_lat >= 0 else -0.01
                    
                    dlon = -u * dt_hours * 3600 / (111000 * cos_lat)
                    
                    current_lat += dlat
                    current_lon += dlon
                    trajectory.append({"lat": round(current_lat, 4), "lon": round(current_lon, 4), "hour": -hour})
                else:
                    break
            else:
                break

        return {
            "receptor": {"lat": receptor_lat, "lon": receptor_lon},
            "date": str(current_query_date),
            "trajectory": trajectory,
            "estimated_source": trajectory[-1] if trajectory else None,
        }
