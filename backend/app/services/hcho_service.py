"""HCHO Service — Formaldehyde hotspot detection and analysis."""

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from loguru import logger
from app.database import supabase
from app.services.utils import find_nearest_date


class HCHOService:
    """Service layer for HCHO concentration and hotspot analysis."""

    async def get_overview(
        self, date: Optional[date] = None, state: Optional[str] = None,
        season: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get HCHO overview with hotspot summary."""
        target_date = date or datetime.now(timezone.utc).date()

        current_query_date = find_nearest_date("tropomi_products", "observed_date", target_date, {"product_type": "HCHO"})

        query = supabase.table("tropomi_products").select("column_value, latitude, longitude").eq("product_type", "HCHO").eq("observed_date", str(current_query_date))
        res = await asyncio.to_thread(query.limit(2000).execute)
        obs_data = res.data or []

        hcho_vals = [r["column_value"] for r in obs_data if r.get("column_value") is not None]
        avg_hcho = sum(hcho_vals) / len(hcho_vals) if hcho_vals else 0.0

        hotspots_data = []
        hotspot_query_date = current_query_date
        
        # Dynamic check and calculation to ensure no static mock data is used
        hq_total = supabase.table("hcho_hotspots").select("id", count="exact").eq("hotspot_date", str(hotspot_query_date))
        h_total_res = await asyncio.to_thread(hq_total.limit(1).execute)
        if (h_total_res.count or 0) == 0:
            try:
                from app.ml.hcho_hotspot import HCHOHotspotDetector
                detector = HCHOHotspotDetector()
                logger.info(f"Dynamically computing HCHO hotspots for date: {hotspot_query_date}")
                await detector.detect_hotspots(str(hotspot_query_date), str(hotspot_query_date), season or "annual")
            except Exception as e:
                logger.error(f"Error computing dynamic HCHO hotspots: {e}")

        hq = supabase.table("hcho_hotspots").select("*", count="exact").eq("hotspot_date", str(hotspot_query_date))
        if state:
            hq = hq.eq("state", state)
        if season:
            hq = hq.eq("season", season)
        h_res = await asyncio.to_thread(hq.limit(100).execute)
        hotspots_data = h_res.data or []
        total_hotspots = h_res.count or len(hotspots_data)

        regions = {}
        for h in hotspots_data:
            r = h.get("region_name", "Unknown")
            if r not in regions:
                regions[r] = {"count": 0, "mean_hcho": []}
            regions[r]["count"] += 1
            if h.get("mean_hcho"):
                regions[r]["mean_hcho"].append(h["mean_hcho"])

        region_summary = {}
        for r, v in regions.items():
            avg = sum(v["mean_hcho"]) / len(v["mean_hcho"]) if v["mean_hcho"] else 0
            region_summary[r] = {"hotspot_count": v["count"], "avg_hcho": round(avg, 6)}

        highest_region = "N/A"
        if region_summary:
            highest_region = max(region_summary.keys(), key=lambda r: region_summary[r]["avg_hcho"])

        return {
            "date": str(current_query_date),
            "total_hotspots": total_hotspots,
            "region_summary": region_summary,
            "hotspots": hotspots_data[:500],
            "avg_hcho": avg_hcho,
            "hotspot_count": total_hotspots,
            "highest_region": highest_region,
        }

    async def get_concentrations(
        self, start_date: Optional[date] = None, end_date: Optional[date] = None,
        state: Optional[str] = None, lat: Optional[float] = None,
        lon: Optional[float] = None, radius_km: float = 50.0, limit: int = 500
    ) -> List[Dict]:
        """Get raw HCHO TROPOMI data."""
        query = supabase.table("tropomi_products").select("*").eq("product_type", "HCHO")
        if start_date:
            query = query.gte("observed_date", str(start_date))
        if end_date:
            query = query.lte("observed_date", str(end_date))
        result = await asyncio.to_thread(query.order("observed_date", desc=True).limit(limit).execute)
        data = result.data or []

        if lat is not None and lon is not None:
            from app.geospatial.utils import haversine_filter
            data = haversine_filter(data, lat, lon, radius_km)

        return data

    async def get_hotspots(
        self, start_date: Optional[date] = None, end_date: Optional[date] = None,
        method: Optional[str] = None, season: Optional[str] = None,
        state: Optional[str] = None, period_type: Optional[str] = None,
        min_hcho: Optional[float] = None, limit: int = 1000
    ) -> List[Dict]:
        """Get detected HCHO hotspots with filtering."""
        target_date = start_date or datetime.now(timezone.utc).date()

        if start_date and end_date and start_date == end_date:
            current_query_date = find_nearest_date("tropomi_products", "observed_date", start_date, {"product_type": "HCHO"})
            
            # Dynamic check and calculation to ensure no static mock data is used
            hq_total = supabase.table("hcho_hotspots").select("id", count="exact").eq("hotspot_date", str(current_query_date))
            h_total_res = await asyncio.to_thread(hq_total.limit(1).execute)
            if (h_total_res.count or 0) == 0:
                try:
                    from app.ml.hcho_hotspot import HCHOHotspotDetector
                    detector = HCHOHotspotDetector()
                    logger.info(f"Dynamically computing HCHO hotspots in get_hotspots for date: {current_query_date}")
                    await detector.detect_hotspots(str(current_query_date), str(current_query_date), season or "annual")
                except Exception as e:
                    logger.error(f"Error computing dynamic HCHO hotspots in get_hotspots: {e}")
            
            query = supabase.table("hcho_hotspots").select("*").eq("hotspot_date", str(current_query_date))
        else:
            query = supabase.table("hcho_hotspots").select("*")
            if start_date:
                query = query.gte("hotspot_date", str(start_date))
            if end_date:
                query = query.lte("hotspot_date", str(end_date))


        if method:
            query = query.eq("detection_method", method)
        if season:
            query = query.eq("season", season)
        if state:
            query = query.eq("state", state)
        if period_type:
            query = query.eq("period_type", period_type)
        if min_hcho:
            query = query.gte("mean_hcho", min_hcho)

        result = await asyncio.to_thread(query.order("mean_hcho", desc=True).limit(limit).execute)
        return result.data or []

    async def get_hotspot_regions(self) -> List[Dict]:
        """Get aggregated hotspot region summary."""
        result = await asyncio.to_thread(
            supabase.table("hcho_hotspots").select(
                "region_name, state, season, mean_hcho, max_hcho, area_sq_km, "
                "detection_method, centroid_lat, centroid_lon"
            ).execute
        )
        data = result.data or []

        regions = {}
        for h in data:
            key = h.get("region_name", "Unknown")
            if key not in regions:
                regions[key] = {
                    "region_name": key,
                    "state": h.get("state"),
                    "hotspot_count": 0,
                    "avg_hcho": [],
                    "max_hcho": 0,
                    "total_area_sq_km": 0,
                    "centroid_lat": h.get("centroid_lat"),
                    "centroid_lon": h.get("centroid_lon"),
                    "seasons": set(),
                }
            regions[key]["hotspot_count"] += 1
            if h.get("mean_hcho"):
                regions[key]["avg_hcho"].append(h["mean_hcho"])
            if h.get("max_hcho") and h["max_hcho"] > regions[key]["max_hcho"]:
                regions[key]["max_hcho"] = h["max_hcho"]
            if h.get("area_sq_km"):
                regions[key]["total_area_sq_km"] += h["area_sq_km"]
            if h.get("season"):
                regions[key]["seasons"].add(h["season"])

        result_list = []
        for r in regions.values():
            avg = sum(r["avg_hcho"]) / len(r["avg_hcho"]) if r["avg_hcho"] else 0
            result_list.append({
                "region_name": r["region_name"],
                "state": r["state"],
                "hotspot_count": r["hotspot_count"],
                "avg_hcho": round(avg, 6),
                "max_hcho": r["max_hcho"],
                "total_area_sq_km": round(r["total_area_sq_km"], 1),
                "centroid_lat": r["centroid_lat"],
                "centroid_lon": r["centroid_lon"],
                "seasons": list(r["seasons"]),
            })
        return sorted(result_list, key=lambda x: x["hotspot_count"], reverse=True)

    async def get_seasonal_hotspots(self, season: str, year: Optional[int] = None) -> List[Dict]:
        """Get seasonal aggregated hotspots."""
        query = supabase.table("hcho_hotspots").select("*").eq("season", season)
        if year:
            query = query.gte("period_start", f"{year}-01-01").lte("period_end", f"{year}-12-31")
        result = await asyncio.to_thread(query.order("mean_hcho", desc=True).limit(200).execute)
        return result.data or []

    async def get_trends(
        self, start_date: date, end_date: date,
        state: Optional[str] = None, region: Optional[str] = None
    ) -> List[Dict]:
        """Get HCHO time-series trends."""
        query = supabase.table("tropomi_products").select(
            "observed_date, column_value, latitude, longitude"
        ).eq("product_type", "HCHO").gte(
            "observed_date", str(start_date)
        ).lte("observed_date", str(end_date))

        result = await asyncio.to_thread(query.order("observed_date").limit(5000).execute)
        data = result.data or []

        # Aggregate to daily means
        daily = {}
        for row in data:
            d = row["observed_date"]
            if d not in daily:
                daily[d] = {"date": d, "values": []}
            if row.get("column_value"):
                daily[d]["values"].append(row["column_value"])

        trends = []
        for d, v in sorted(daily.items()):
            vals = v["values"]
            trends.append({
                "date": d,
                "mean_hcho": round(sum(vals) / len(vals), 6) if vals else None,
                "max_hcho": round(max(vals), 6) if vals else None,
                "count": len(vals),
            })
        return trends

    async def get_climatology(self, state: Optional[str] = None) -> Dict:
        """Get multi-year HCHO climatology statistics."""
        query = supabase.table("tropomi_products").select(
            "observed_date, column_value"
        ).eq("product_type", "HCHO")
        result = await asyncio.to_thread(query.limit(10000).execute)
        data = result.data or []

        # Monthly climatology
        monthly = {i: [] for i in range(1, 13)}
        for row in data:
            if row.get("column_value") and row.get("observed_date"):
                month = int(row["observed_date"][5:7])
                monthly[month].append(row["column_value"])

        climatology = {}
        import numpy as np
        for month, vals in monthly.items():
            if vals:
                arr = np.array(vals)
                climatology[month] = {
                    "mean": round(float(np.mean(arr)), 6),
                    "std": round(float(np.std(arr)), 6),
                    "p50": round(float(np.percentile(arr, 50)), 6),
                    "p90": round(float(np.percentile(arr, 90)), 6),
                    "p95": round(float(np.percentile(arr, 95)), 6),
                    "count": len(vals),
                }
        return {"monthly_climatology": climatology}
