"""Fire Service — Active fire data and fire-HCHO correlation analysis."""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from app.database import supabase


class FireService:
    """Service layer for fire records and fire-HCHO correlation."""

    async def get_overview(
        self, date: Optional[date] = None, state: Optional[str] = None,
        source: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get fire overview with counts and FRP summary."""
        target_date = date or datetime.utcnow().date()
        query = supabase.table("fire_records").select("*", count="exact").eq("detected_date", str(target_date))
        if state:
            query = query.eq("state", state)
        if source:
            query = query.eq("source", source)
        result = query.limit(500).execute()
        fires = result.data or []

        frp_values = [f["frp"] for f in fires if f.get("frp")]
        state_counts = {}
        for f in fires:
            s = f.get("state", "Unknown")
            state_counts[s] = state_counts.get(s, 0) + 1

        return {
            "date": str(target_date),
            "total_fires": result.count or 0,
            "avg_frp": round(sum(frp_values) / len(frp_values), 2) if frp_values else None,
            "max_frp": round(max(frp_values), 2) if frp_values else None,
            "state_distribution": state_counts,
            "fires": fires[:200],
        }

    async def get_records(
        self, start_date: Optional[date] = None, end_date: Optional[date] = None,
        state: Optional[str] = None, source: Optional[str] = None,
        fire_type: Optional[str] = None, min_frp: Optional[float] = None,
        lat: Optional[float] = None, lon: Optional[float] = None,
        radius_km: float = 100.0, limit: int = 500
    ) -> List[Dict]:
        """Get fire records with filtering."""
        query = supabase.table("fire_records").select("*")
        if start_date:
            query = query.gte("detected_date", str(start_date))
        if end_date:
            query = query.lte("detected_date", str(end_date))
        if state:
            query = query.eq("state", state)
        if source:
            query = query.eq("source", source)
        if fire_type:
            query = query.eq("fire_type", fire_type)
        if min_frp:
            query = query.gte("frp", min_frp)

        result = query.order("detected_date", desc=True).limit(limit).execute()
        data = result.data or []

        if lat is not None and lon is not None:
            from app.geospatial.utils import haversine_filter
            data = haversine_filter(data, lat, lon, radius_km)
        return data

    async def get_correlations(
        self, region: Optional[str] = None, state: Optional[str] = None,
        season: Optional[str] = None
    ) -> List[Dict]:
        """Get fire-HCHO correlation results."""
        query = supabase.table("fire_hcho_correlations").select("*")
        if region:
            query = query.eq("region_name", region)
        if state:
            query = query.eq("state", state)
        if season:
            query = query.eq("season", season)
        result = query.execute()
        return result.data or []

    async def get_correlation_timeseries(
        self, region: str, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Get aligned FRP and HCHO time-series for scatter plots."""
        # Fire data aggregated by date
        fire_query = supabase.table("fire_records").select(
            "detected_date, frp"
        ).gte("detected_date", str(start_date)).lte("detected_date", str(end_date))
        fire_result = fire_query.limit(5000).execute()

        # HCHO data aggregated by date
        hcho_query = supabase.table("tropomi_products").select(
            "observed_date, column_value"
        ).eq("product_type", "HCHO").gte(
            "observed_date", str(start_date)
        ).lte("observed_date", str(end_date))
        hcho_result = hcho_query.limit(5000).execute()

        # Aggregate by date
        fire_daily = {}
        for r in (fire_result.data or []):
            d = r["detected_date"]
            if d not in fire_daily:
                fire_daily[d] = []
            if r.get("frp"):
                fire_daily[d].append(r["frp"])

        hcho_daily = {}
        for r in (hcho_result.data or []):
            d = r["observed_date"]
            if d not in hcho_daily:
                hcho_daily[d] = []
            if r.get("column_value"):
                hcho_daily[d].append(r["column_value"])

        # Merge
        all_dates = sorted(set(fire_daily.keys()) | set(hcho_daily.keys()))
        timeseries = []
        for d in all_dates:
            frp_vals = fire_daily.get(d, [])
            hcho_vals = hcho_daily.get(d, [])
            timeseries.append({
                "date": d,
                "fire_count": len(frp_vals),
                "mean_frp": round(sum(frp_vals) / len(frp_vals), 2) if frp_vals else None,
                "mean_hcho": round(sum(hcho_vals) / len(hcho_vals), 6) if hcho_vals else None,
            })

        return {"region": region, "timeseries": timeseries}

    async def get_trends(
        self, start_date: date, end_date: date,
        state: Optional[str] = None, granularity: str = "daily"
    ) -> List[Dict]:
        """Get fire count and FRP trends."""
        query = supabase.table("fire_records").select(
            "detected_date, frp, source"
        ).gte("detected_date", str(start_date)).lte("detected_date", str(end_date))
        if state:
            query = query.eq("state", state)
        result = query.order("detected_date").limit(10000).execute()
        data = result.data or []

        daily = {}
        for r in data:
            d = r["detected_date"]
            if d not in daily:
                daily[d] = {"fire_count": 0, "frp_sum": 0, "frp_values": []}
            daily[d]["fire_count"] += 1
            if r.get("frp"):
                daily[d]["frp_sum"] += r["frp"]
                daily[d]["frp_values"].append(r["frp"])

        trends = []
        for d, v in sorted(daily.items()):
            trends.append({
                "date": d,
                "fire_count": v["fire_count"],
                "total_frp": round(v["frp_sum"], 2),
                "avg_frp": round(v["frp_sum"] / v["fire_count"], 2) if v["fire_count"] else 0,
            })
        return trends

    async def get_heatmap(
        self, start_date: Optional[date] = None, end_date: Optional[date] = None,
        resolution: float = 0.5
    ) -> Dict:
        """Get gridded fire density for heatmap."""
        query = supabase.table("fire_records").select("latitude, longitude, frp")
        if start_date:
            query = query.gte("detected_date", str(start_date))
        if end_date:
            query = query.lte("detected_date", str(end_date))
        result = query.limit(10000).execute()
        data = result.data or []

        import math
        grid = {}
        for r in data:
            lat_bin = math.floor(r["latitude"] / resolution) * resolution
            lon_bin = math.floor(r["longitude"] / resolution) * resolution
            key = f"{lat_bin},{lon_bin}"
            if key not in grid:
                grid[key] = {"lat": lat_bin + resolution / 2, "lon": lon_bin + resolution / 2, "count": 0, "frp_sum": 0}
            grid[key]["count"] += 1
            if r.get("frp"):
                grid[key]["frp_sum"] += r["frp"]

        cells = list(grid.values())
        for c in cells:
            c["avg_frp"] = round(c["frp_sum"] / c["count"], 2) if c["count"] else 0
        return {"resolution": resolution, "cells": cells}
