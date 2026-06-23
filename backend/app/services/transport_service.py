"""Transport Service — Wind-based pollutant transport analysis."""

from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from app.database import supabase
import math


class TransportService:
    """Service for wind vector analysis and transport pathway computation."""

    async def get_overview(self, date: Optional[date] = None, source_region: Optional[str] = None) -> List[Dict]:
        """Get transport analysis overview."""
        query = supabase.table("transport_analysis").select("*")
        if date:
            query = query.eq("analysis_date", str(date))
        if source_region:
            query = query.eq("source_region", source_region)
        result = query.order("analysis_date", desc=True).limit(100).execute()
        return result.data or []

    async def get_wind_vectors(self, date: date, level: str = "850hpa", bounds: Optional[str] = None) -> List[Dict]:
        """Get wind vector field for map visualization."""
        attempts = 0
        current_query_date = date
        data = []

        while attempts < 10:
            query = supabase.table("meteorological_data").select(
                "latitude, longitude, u_wind_850hpa, v_wind_850hpa, "
                "u_wind_10m, v_wind_10m, wind_speed_10m, wind_direction"
            ).eq("observed_date", str(current_query_date)).not_.is_("u_wind_10m", "null")

            result = query.limit(5000).execute()
            if result.data:
                data = result.data
                break

            if isinstance(current_query_date, str):
                current_query_date = datetime.strptime(current_query_date, "%Y-%m-%d").date()
            current_query_date = current_query_date - timedelta(days=1)
            attempts += 1

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
        result = query.order("analysis_date").limit(500).execute()
        return result.data or []

    async def get_source_attribution(
        self, receptor_lat: float, receptor_lon: float, date: date, hours_back: int = 72
    ) -> Dict:
        """Compute source attribution for a receptor location using wind back-tracking."""
        attempts = 0
        current_query_date = date
        data = []

        while attempts < 10:
            met_data = supabase.table("meteorological_data").select(
                "latitude, longitude, u_wind_850hpa, v_wind_850hpa, u_wind_10m, v_wind_10m, wind_speed_10m"
            ).eq("observed_date", str(current_query_date)).not_.is_("u_wind_10m", "null").limit(2000).execute()

            if met_data.data:
                data = met_data.data
                break

            if isinstance(current_query_date, str):
                current_query_date = datetime.strptime(current_query_date, "%Y-%m-%d").date()
            current_query_date = current_query_date - timedelta(days=1)
            attempts += 1

        if not data:
            return {"receptor": {"lat": receptor_lat, "lon": receptor_lon}, "sources": [], "date": str(date), "trajectory": []}

        # Simple back-trajectory estimation
        trajectory = [{"lat": receptor_lat, "lon": receptor_lon, "hour": 0}]
        current_lat, current_lon = receptor_lat, receptor_lon

        for hour in range(1, hours_back + 1):
            # Find nearest wind observation
            best = None
            best_dist = float("inf")
            for obs in data:
                dlat = obs["latitude"] - current_lat
                dlon = obs["longitude"] - current_lon
                dist = dlat ** 2 + dlon ** 2
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
                    dlon = -u * dt_hours * 3600 / (111000 * math.cos(math.radians(current_lat)))
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
