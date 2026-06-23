"""
Fire-HCHO Correlation Analysis — Module 6
Pearson/Spearman correlation, lag analysis, and trend quantification.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from scipy import stats
from loguru import logger
from app.database import supabase
from app.geospatial.utils import INDIA_REGIONS, BURNING_SEASONS


class FireHCHOAnalyzer:
    """Analyzes correlation between fire activity and HCHO concentrations."""

    def __init__(self):
        self.max_lag_days = 5

    async def run_correlation_analysis(
        self, start_date: str, end_date: str, season: str = "annual"
    ) -> List[Dict]:
        """Run complete fire-HCHO correlation analysis for all regions."""
        # Fetch fire data
        fire_result = supabase.table("fire_records").select(
            "detected_date, latitude, longitude, frp, source"
        ).gte("detected_date", start_date).lte("detected_date", end_date).limit(20000).execute()

        # Fetch HCHO data
        hcho_result = supabase.table("tropomi_products").select(
            "observed_date, latitude, longitude, column_value"
        ).eq("product_type", "HCHO").gte(
            "observed_date", start_date
        ).lte("observed_date", end_date).limit(20000).execute()

        fire_data = fire_result.data or []
        hcho_data = hcho_result.data or []

        if not fire_data or not hcho_data:
            logger.warning("Insufficient data for fire-HCHO correlation")
            return []

        df_fire = pd.DataFrame(fire_data)
        df_hcho = pd.DataFrame(hcho_data)

        all_correlations = []

        for region_name, bounds in INDIA_REGIONS.items():
            lat_min, lat_max = bounds["lat_min"], bounds["lat_max"]
            lon_min, lon_max = bounds["lon_min"], bounds["lon_max"]

            # Filter to region
            region_fire = df_fire[
                (df_fire["latitude"] >= lat_min) & (df_fire["latitude"] <= lat_max) &
                (df_fire["longitude"] >= lon_min) & (df_fire["longitude"] <= lon_max)
            ]
            region_hcho = df_hcho[
                (df_hcho["latitude"] >= lat_min) & (df_hcho["latitude"] <= lat_max) &
                (df_hcho["longitude"] >= lon_min) & (df_hcho["longitude"] <= lon_max)
            ]

            if region_fire.empty or region_hcho.empty:
                continue

            # Aggregate to daily means
            daily_fire = region_fire.groupby("detected_date").agg(
                fire_count=("frp", "count"),
                mean_frp=("frp", "mean"),
                total_frp=("frp", "sum")
            ).reset_index()
            daily_fire.columns = ["date", "fire_count", "mean_frp", "total_frp"]

            daily_hcho = region_hcho.groupby("observed_date").agg(
                mean_hcho=("column_value", "mean"),
                max_hcho=("column_value", "max")
            ).reset_index()
            daily_hcho.columns = ["date", "mean_hcho", "max_hcho"]

            # Merge on date
            merged = pd.merge(daily_fire, daily_hcho, on="date", how="inner")
            if len(merged) < 10:
                continue

            # Compute correlations
            corr_result = self._compute_correlations(merged, region_name, season)
            if corr_result:
                all_correlations.append(corr_result)

        # Store results
        if all_correlations:
            try:
                supabase.table("fire_hcho_correlations").insert(all_correlations).execute()
            except Exception as e:
                logger.error(f"Error storing correlations: {e}")

        logger.info(f"Computed correlations for {len(all_correlations)} regions")
        return all_correlations

    def _compute_correlations(self, merged: pd.DataFrame, region: str, season: str) -> Optional[Dict]:
        """Compute Pearson, Spearman correlations and lag analysis."""
        frp = merged["mean_frp"].values
        hcho = merged["mean_hcho"].values

        # Remove NaN pairs
        mask = ~(np.isnan(frp) | np.isnan(hcho))
        frp_clean = frp[mask]
        hcho_clean = hcho[mask]

        if len(frp_clean) < 10:
            return None

        # Pearson correlation
        pearson_r, pearson_p = stats.pearsonr(frp_clean, hcho_clean)

        # Spearman correlation
        spearman_r, spearman_p = stats.spearmanr(frp_clean, hcho_clean)

        # Lag analysis (0-5 days)
        best_lag = 0
        best_lag_corr = pearson_r

        for lag in range(1, self.max_lag_days + 1):
            if lag >= len(frp_clean):
                break
            lagged_frp = frp_clean[:-lag]
            lagged_hcho = hcho_clean[lag:]
            min_len = min(len(lagged_frp), len(lagged_hcho))
            if min_len >= 10:
                lr, _ = stats.pearsonr(lagged_frp[:min_len], lagged_hcho[:min_len])
                if abs(lr) > abs(best_lag_corr):
                    best_lag_corr = lr
                    best_lag = lag

        # Trend analysis (linear regression on HCHO over time)
        x = np.arange(len(hcho_clean))
        slope, _, _, p_value, _ = stats.linregress(x, hcho_clean)

        result = {
            "region_name": region,
            "period_start": str(merged["date"].min()),
            "period_end": str(merged["date"].max()),
            "season": season,
            "pearson_r": round(float(pearson_r), 4),
            "pearson_p": round(float(pearson_p), 6),
            "spearman_r": round(float(spearman_r), 4),
            "spearman_p": round(float(spearman_p), 6),
            "optimal_lag_days": int(best_lag),
            "lag_correlation": round(float(best_lag_corr), 4),
            "fire_count": int(merged["fire_count"].sum()),
            "mean_frp": round(float(merged["mean_frp"].mean()), 2),
            "mean_hcho": round(float(merged["mean_hcho"].mean()), 6),
        }

        logger.info(
            f"  {region}: Pearson r={pearson_r:.3f} (p={pearson_p:.4f}), "
            f"Best lag={best_lag}d (r={best_lag_corr:.3f})"
        )
        return result


class TransportAnalyzer:
    """Module 7 — Wind-based pollutant transport analysis."""

    async def analyze_transport(self, analysis_date: str) -> List[Dict]:
        """Analyze pollutant transport using ERA5 wind fields."""
        met_result = supabase.table("meteorological_data").select(
            "latitude, longitude, u_wind_850hpa, v_wind_850hpa, "
            "u_wind_10m, v_wind_10m, wind_speed_10m, wind_direction"
        ).eq("observed_date", analysis_date).not_.is_("u_wind_10m", "null").limit(5000).execute()

        met_data = met_result.data or []
        if not met_data:
            return []

        transport_records = []
        for region_name, bounds in INDIA_REGIONS.items():
            region_met = [
                m for m in met_data
                if (bounds["lat_min"] <= m["latitude"] <= bounds["lat_max"] and
                    bounds["lon_min"] <= m["longitude"] <= bounds["lon_max"])
            ]

            if not region_met:
                continue

            # Average wind in region (fallback to 10m wind if 850hpa is missing)
            u_vals = [m.get("u_wind_850hpa") for m in region_met if m.get("u_wind_850hpa") is not None]
            v_vals = [m.get("v_wind_850hpa") for m in region_met if m.get("v_wind_850hpa") is not None]

            if not u_vals or not v_vals:
                u_vals = [m.get("u_wind_10m") for m in region_met if m.get("u_wind_10m") is not None]
                v_vals = [m.get("v_wind_10m") for m in region_met if m.get("v_wind_10m") is not None]

            if not u_vals or not v_vals:
                continue

            import math
            avg_u = np.mean(u_vals)
            avg_v = np.mean(v_vals)
            speed = math.sqrt(avg_u ** 2 + avg_v ** 2)
            direction = (math.degrees(math.atan2(-avg_u, -avg_v)) + 360) % 360

            # Estimate 24-hour transport
            transport_km = speed * 24 * 3.6

            # Receptor location (downwind from source centroid)
            src_lat = (bounds["lat_min"] + bounds["lat_max"]) / 2
            src_lon = (bounds["lon_min"] + bounds["lon_max"]) / 2

            record = {
                "analysis_date": analysis_date,
                "source_lat": round(src_lat, 4),
                "source_lon": round(src_lon, 4),
                "wind_u_850": round(float(avg_u), 3),
                "wind_v_850": round(float(avg_v), 3),
                "wind_speed": round(float(speed), 2),
                "wind_direction": round(float(direction), 1),
                "transport_distance_km": round(float(transport_km), 1),
                "source_region": region_name,
            }
            transport_records.append(record)

        if transport_records:
            try:
                supabase.table("transport_analysis").insert(transport_records).execute()
            except Exception as e:
                logger.error(f"Error storing transport analysis: {e}")

        logger.info(f"Transport analysis for {analysis_date}: {len(transport_records)} regions")
        return transport_records
