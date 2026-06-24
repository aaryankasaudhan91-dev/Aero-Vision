"""AQI Service — Business logic for Air Quality Index operations."""

from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from loguru import logger
from app.database import supabase


class AQIService:
    """Service layer for AQI data retrieval and processing."""

    async def get_aqi_overview(
        self, date: Optional[date] = None, state: Optional[str] = None, city: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get AQI overview with latest data."""
        target_date = date or datetime.utcnow().date()
        observations = []
        attempts = 0
        current_query_date = target_date

        while attempts < 10:
            query = supabase.table("cpcb_observations").select(
                "*, cpcb_stations!inner(station_name, city, state, latitude, longitude)"
            ).gte("observed_at", f"{current_query_date}T00:00:00").lte("observed_at", f"{current_query_date}T23:59:59")

            if state:
                query = query.eq("cpcb_stations.state", state)
            if city:
                query = query.eq("cpcb_stations.city", city)

            result = query.order("observed_at", desc=True).limit(2000).execute()
            if result.data:
                observations = result.data
                break

            if isinstance(current_query_date, str):
                current_query_date = datetime.strptime(current_query_date, "%Y-%m-%d").date()
            current_query_date = current_query_date - timedelta(days=1)
            attempts += 1

        # Compute summary statistics
        aqi_values = [o["aqi"] for o in observations if o.get("aqi")]
        category_counts = {}
        for o in observations:
            cat = o.get("aqi_category", "Unknown")
            category_counts[cat] = category_counts.get(cat, 0) + 1

        avg_aqi = sum(aqi_values) / len(aqi_values) if aqi_values else None
        avg_category = None
        if avg_aqi is not None:
            from app.ml.aqi_engine import AQI_CATEGORIES
            for (lo, hi), cat in AQI_CATEGORIES.items():
                if lo <= avg_aqi <= hi:
                    avg_category = cat
                    break
            if avg_aqi > 500:
                avg_category = "Severe"

        return {
            "date": str(current_query_date),
            "total_observations": len(observations),
            "avg_aqi": round(avg_aqi, 1) if avg_aqi is not None else None,
            "max_aqi": max(aqi_values) if aqi_values else None,
            "min_aqi": min(aqi_values) if aqi_values else None,
            "aqi_category": avg_category,
            "category_distribution": category_counts,
            "observations": observations[:1500],
        }

    async def get_stations(
        self, state: Optional[str] = None, city: Optional[str] = None, is_active: bool = True
    ) -> List[Dict]:
        """Get CPCB monitoring stations."""
        query = supabase.table("cpcb_stations").select("*").eq("is_active", is_active)
        if state:
            query = query.eq("state", state)
        if city:
            query = query.eq("city", city)
        result = query.order("state").execute()
        return result.data if result.data else []

    async def get_observations(
        self, station_id: Optional[str] = None,
        start_date: Optional[date] = None, end_date: Optional[date] = None,
        state: Optional[str] = None, city: Optional[str] = None, limit: int = 100
    ) -> List[Dict]:
        """Get CPCB ground observations."""
        if start_date and end_date and start_date == end_date:
            attempts = 0
            current_query_date = start_date
            while attempts < 10:
                query = supabase.table("cpcb_observations").select(
                    "*, cpcb_stations!inner(station_name, city, state, latitude, longitude)"
                ).gte("observed_at", f"{current_query_date}T00:00:00").lte("observed_at", f"{current_query_date}T23:59:59")
                if station_id:
                    query = query.eq("station_id", station_id)
                if state:
                    query = query.eq("cpcb_stations.state", state)
                if city:
                    query = query.eq("cpcb_stations.city", city)

                result = query.limit(limit).execute()
                if result.data:
                    return result.data

                if isinstance(current_query_date, str):
                    current_query_date = datetime.strptime(current_query_date, "%Y-%m-%d").date()
                current_query_date = current_query_date - timedelta(days=1)
                attempts += 1
            return []
        query = supabase.table("cpcb_observations").select(
            "*, cpcb_stations!inner(station_name, city, state, latitude, longitude)"
        )
        if station_id:
            query = query.eq("station_id", station_id)
        if start_date:
            query = query.gte("observed_at", f"{start_date}T00:00:00")
        if end_date:
            query = query.lte("observed_at", f"{end_date}T23:59:59")
        if state:
            query = query.eq("cpcb_stations.state", state)
        if city:
            query = query.eq("cpcb_stations.city", city)

        result = query.order("observed_at", desc=True).limit(limit).execute()
        return result.data if result.data else []

    async def get_predictions(
        self, date: Optional[date] = None,
        start_date: Optional[date] = None, end_date: Optional[date] = None,
        model_name: Optional[str] = None, state: Optional[str] = None,
        lat: Optional[float] = None, lon: Optional[float] = None,
        radius_km: float = 50.0, limit: int = 500
    ) -> Dict[str, Any]:
        """Get ML model predictions."""
        query = supabase.table("model_predictions").select("*")

        if date:
            query = query.eq("prediction_date", str(date))
        if start_date:
            query = query.gte("prediction_date", str(start_date))
        if end_date:
            query = query.lte("prediction_date", str(end_date))
        if model_name:
            query = query.eq("model_name", model_name)

        result = query.order("prediction_date", desc=True).limit(limit).execute()
        predictions = result.data if result.data else []

        # Filter by radius if coordinates provided
        if lat is not None and lon is not None:
            from app.geospatial.utils import haversine_filter
            predictions = haversine_filter(predictions, lat, lon, radius_km)

        return {
            "total": len(predictions),
            "predictions": predictions,
        }

    async def get_aqi_maps(
        self, map_type: str = "daily", date: Optional[date] = None,
        region_type: str = "india", region_name: Optional[str] = None,
    ) -> List[Dict]:
        """Get pre-computed AQI maps."""
        query = supabase.table("aqi_maps").select("*").eq("map_type", map_type).eq("region_type", region_type)
        if date:
            query = query.eq("map_date", str(date))
        if region_name:
            query = query.eq("region_name", region_name)
        result = query.order("map_date", desc=True).limit(50).execute()
        return result.data if result.data else []

    async def get_trends(
        self, start_date: date, end_date: date,
        state: Optional[str] = None, city: Optional[str] = None,
        pollutant: Optional[str] = None
    ) -> List[Dict]:
        """Get AQI time-series trends for charting."""
        query = supabase.table("cpcb_observations").select(
            "observed_at, pm25, no2, so2, co, o3, aqi, aqi_category, "
            "cpcb_stations!inner(station_name, city, state)"
        ).gte("observed_at", f"{start_date}T00:00:00").lte("observed_at", f"{end_date}T23:59:59")

        if state:
            query = query.eq("cpcb_stations.state", state)
        if city:
            query = query.eq("cpcb_stations.city", city)

        result = query.order("observed_at").limit(2000).execute()
        data = result.data if result.data else []

        # Aggregate to daily means
        daily = {}
        for row in data:
            d = row["observed_at"][:10]
            if d not in daily:
                daily[d] = {"date": d, "pm25": [], "no2": [], "so2": [], "co": [], "o3": [], "aqi": []}
            for key in ["pm25", "no2", "so2", "co", "o3", "aqi"]:
                if row.get(key) is not None:
                    daily[d][key].append(row[key])

        trends = []
        for d, vals in sorted(daily.items()):
            entry = {"date": d}
            for key in ["pm25", "no2", "so2", "co", "o3", "aqi"]:
                arr = vals[key]
                entry[key] = round(sum(arr) / len(arr), 2) if arr else None
            trends.append(entry)

        return trends

    async def get_pollutant_map(self, pollutant: str, date: Optional[date] = None) -> Dict:
        """Get individual pollutant concentration map data."""
        target_date = date or datetime.utcnow().date()

        # Get from model predictions
        result = supabase.table("model_predictions").select(
            "latitude, longitude, pm25_predicted, no2_predicted, "
            "so2_predicted, co_predicted, o3_predicted, prediction_date, model_name"
        ).eq("prediction_date", str(target_date)).limit(2000).execute()

        field_map = {
            "PM2.5": "pm25_predicted", "NO2": "no2_predicted",
            "SO2": "so2_predicted", "CO": "co_predicted", "O3": "o3_predicted"
        }
        field = field_map.get(pollutant, "pm25_predicted")
        data = result.data if result.data else []
        points = [
            {"lat": r["latitude"], "lon": r["longitude"], "value": r.get(field)}
            for r in data if r.get(field) is not None
        ]

        return {"pollutant": pollutant, "date": str(target_date), "points": points}

    async def get_model_evaluations(self) -> List[Dict]:
        """Get model performance comparison."""
        result = supabase.table("model_metadata").select("*").order("r_squared", desc=True).execute()
        return result.data if result.data else []

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get aggregated summary for dashboard header."""
        stations = supabase.table("cpcb_stations").select("id", count="exact").eq("is_active", True).execute()
        models = supabase.table("model_metadata").select("*").eq("is_active", True).execute()

        best_model = None
        best_r2 = None
        if models.data:
            best = max(models.data, key=lambda m: m.get("r_squared", 0))
            best_model = best.get("model_name")
            best_r2 = best.get("r_squared")

        today = datetime.utcnow().date()
        obs_today = supabase.table("cpcb_observations").select(
            "aqi", count="exact"
        ).gte("observed_at", f"{today}T00:00:00").execute()

        aqi_values = [o["aqi"] for o in (obs_today.data or []) if o.get("aqi")]

        hotspots = supabase.table("hcho_hotspots").select("id", count="exact").execute()
        fires = supabase.table("fire_records").select(
            "id", count="exact"
        ).eq("detected_date", str(today)).execute()

        return {
            "total_stations": stations.count or 0,
            "active_stations": stations.count or 0,
            "latest_aqi_date": str(today),
            "avg_aqi_today": round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else None,
            "hotspot_count": hotspots.count or 0,
            "fire_count_today": fires.count or 0,
            "models_trained": len(models.data) if models.data else 0,
            "best_model": best_model,
            "best_model_r2": best_r2,
        }
