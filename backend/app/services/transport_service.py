"""Transport Service — Wind-based pollutant transport analysis."""

from datetime import date
from typing import Optional, List, Dict, Any
from app.database import supabase
import math


class TransportService:
    """Service for wind vector analysis and transport pathway computation."""

    async def get_overview(self, date: Optional[date] = None, source_region: Optional[str] = None) -> Dict:
        """Get transport analysis overview."""
        query = supabase.table("transport_analysis").select("*", count="exact")
        if date:
            query = query.eq("analysis_date", str(date))
        if source_region:
            query = query.eq("source_region", source_region)
        result = query.order("analysis_date", desc=True).limit(100).execute()

        regions = {}
        for r in (result.data or []):
            src = r.get("source_region", "Unknown")
            if src not in regions:
                regions[src] = {"count": 0, "avg_wind_speed": [], "primary_direction": []}
            regions[src]["count"] += 1
            if r.get("wind_speed"):
                regions[src]["avg_wind_speed"].append(r["wind_speed"])
            if r.get("wind_direction"):
                regions[src]["primary_direction"].append(r["wind_direction"])

        region_summary = {}
        for rname, v in regions.items():
            region_summary[rname] = {
                "transport_events": v["count"],
                "avg_wind_speed": round(sum(v["avg_wind_speed"]) / len(v["avg_wind_speed"]), 2) if v["avg_wind_speed"] else None,
            }

        return {"total_records": result.count or 0, "region_summary": region_summary}

    async def get_wind_vectors(self, date: date, level: str = "850hpa", bounds: Optional[str] = None) -> List[Dict]:
        """Get wind vector field for map visualization."""
        query = supabase.table("meteorological_data").select(
            "latitude, longitude, u_wind_850hpa, v_wind_850hpa, "
            "u_wind_10m, v_wind_10m, wind_speed_10m, wind_direction"
        ).eq("observed_date", str(date))

        result = query.limit(5000).execute()
        data = result.data or []

        vectors = []
        for r in data:
            if level == "850hpa":
                u = r.get("u_wind_850hpa")
                v = r.get("v_wind_850hpa")
            else:
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
        met_data = supabase.table("meteorological_data").select(
            "latitude, longitude, u_wind_850hpa, v_wind_850hpa, wind_speed_10m"
        ).eq("observed_date", str(date)).limit(2000).execute()

        data = met_data.data or []
        if not data:
            return {"receptor": {"lat": receptor_lat, "lon": receptor_lon}, "sources": []}

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

            if best and best.get("u_wind_850hpa") and best.get("v_wind_850hpa"):
                u = best["u_wind_850hpa"]
                v = best["v_wind_850hpa"]
                # Back-track: move opposite to wind direction
                dt_hours = 1
                dlat = -v * dt_hours * 3600 / 111000  # m/s to degrees
                dlon = -u * dt_hours * 3600 / (111000 * math.cos(math.radians(current_lat)))
                current_lat += dlat
                current_lon += dlon
                trajectory.append({"lat": round(current_lat, 4), "lon": round(current_lon, 4), "hour": -hour})

        return {
            "receptor": {"lat": receptor_lat, "lon": receptor_lon},
            "date": str(date),
            "trajectory": trajectory,
            "estimated_source": trajectory[-1] if trajectory else None,
        }
