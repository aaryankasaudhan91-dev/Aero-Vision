"""
HCHO Hotspot Detection — Module 5
Implements DBSCAN, Getis-Ord Gi*, Local Moran's I, and Percentile Thresholding.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple
from loguru import logger
from sklearn.cluster import DBSCAN
from scipy import stats
from app.database import supabase


class HCHOHotspotDetector:
    """Multi-method HCHO hotspot detection system."""

    def __init__(self):
        self.percentile_threshold = 95  # 95th percentile as per strategy doc
        self.dbscan_eps_km = 50  # 50 km radius
        self.dbscan_min_samples = 5
        self.persistence_days = 3  # Minimum 3 consecutive days

    async def detect_hotspots(
        self, start_date: str, end_date: str, season: str = "annual"
    ) -> Dict[str, List[Dict]]:
        """Run all hotspot detection methods and store results."""
        # Fetch HCHO data
        result = supabase.table("tropomi_products").select(
            "observed_date, latitude, longitude, column_value"
        ).eq("product_type", "HCHO").gte(
            "observed_date", start_date
        ).lte("observed_date", end_date).limit(50000).execute()

        data = result.data or []
        if not data:
            logger.warning("No HCHO data found for hotspot detection")
            return {"hotspots": []}

        df = pd.DataFrame(data)
        df["column_value"] = pd.to_numeric(df["column_value"], errors="coerce")
        df = df.dropna(subset=["column_value"])

        all_hotspots = {}

        # Method 1: Percentile Thresholding
        percentile_hotspots = self._percentile_detection(df)
        all_hotspots["percentile"] = percentile_hotspots

        # Method 2: DBSCAN Spatial Clustering
        dbscan_hotspots = self._dbscan_detection(df)
        all_hotspots["dbscan"] = dbscan_hotspots

        # Method 3: Getis-Ord Gi*
        getis_hotspots = self._getis_ord_detection(df)
        all_hotspots["getis_ord"] = getis_hotspots

        # Method 4: Local Moran's I
        morans_hotspots = self._morans_i_detection(df)
        all_hotspots["morans_i"] = morans_hotspots

        # Store all hotspots
        total_stored = 0
        for method, hotspots in all_hotspots.items():
            for h in hotspots:
                h["detection_method"] = method
                h["period_start"] = start_date
                h["period_end"] = end_date
                h["season"] = season
                h["region_name"] = self._identify_region(h.get("centroid_lat"), h.get("centroid_lon"))

            if hotspots:
                batch = hotspots[:200]  # Limit batch size
                try:
                    supabase.table("hcho_hotspots").insert(batch).execute()
                    total_stored += len(batch)
                except Exception as e:
                    logger.error(f"Error storing {method} hotspots: {e}")

        logger.info(f"Detected and stored {total_stored} hotspots")
        return all_hotspots

    def _percentile_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Flag pixels exceeding the 95th percentile of HCHO climatology."""
        threshold = np.percentile(df["column_value"], self.percentile_threshold)
        elevated = df[df["column_value"] >= threshold].copy()

        if elevated.empty:
            return []

        # Group nearby pixels (simple grid aggregation)
        elevated["lat_bin"] = (elevated["latitude"] / 0.5).round() * 0.5
        elevated["lon_bin"] = (elevated["longitude"] / 0.5).round() * 0.5

        hotspots = []
        for (lat_bin, lon_bin), group in elevated.groupby(["lat_bin", "lon_bin"]):
            if len(group) >= 3:
                hotspots.append({
                    "hotspot_date": str(group["observed_date"].iloc[0]),
                    "period_type": "seasonal",
                    "centroid_lat": round(group["latitude"].mean(), 4),
                    "centroid_lon": round(group["longitude"].mean(), 4),
                    "mean_hcho": round(float(group["column_value"].mean()), 6),
                    "max_hcho": round(float(group["column_value"].max()), 6),
                    "percentile_rank": self.percentile_threshold,
                    "pixel_count": len(group),
                    "area_sq_km": round(len(group) * 25, 1),  # Approx area per pixel
                })

        logger.info(f"Percentile method: {len(hotspots)} hotspots detected (threshold: {threshold:.6f})")
        return hotspots

    def _dbscan_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Apply DBSCAN clustering to elevated HCHO pixels."""
        # Filter to elevated values (> 75th percentile for clustering)
        threshold = np.percentile(df["column_value"], 75)
        elevated = df[df["column_value"] >= threshold].copy()

        if len(elevated) < self.dbscan_min_samples:
            return []

        # Convert lat/lon to approximate km for DBSCAN
        coords = elevated[["latitude", "longitude"]].values
        coords_km = coords.copy()
        coords_km[:, 0] *= 111.0  # lat degrees to km
        coords_km[:, 1] *= 111.0 * np.cos(np.radians(coords[:, 0].mean()))

        # DBSCAN clustering
        clustering = DBSCAN(
            eps=self.dbscan_eps_km,
            min_samples=self.dbscan_min_samples,
            metric="euclidean"
        ).fit(coords_km)

        elevated["cluster"] = clustering.labels_

        hotspots = []
        for cluster_id in set(clustering.labels_):
            if cluster_id == -1:  # Skip noise
                continue
            cluster = elevated[elevated["cluster"] == cluster_id]
            hotspots.append({
                "hotspot_date": str(cluster["observed_date"].iloc[0]),
                "period_type": "seasonal",
                "cluster_id": int(cluster_id),
                "centroid_lat": round(float(cluster["latitude"].mean()), 4),
                "centroid_lon": round(float(cluster["longitude"].mean()), 4),
                "mean_hcho": round(float(cluster["column_value"].mean()), 6),
                "max_hcho": round(float(cluster["column_value"].max()), 6),
                "pixel_count": len(cluster),
                "area_sq_km": round(len(cluster) * 25, 1),
            })

        logger.info(f"DBSCAN: {len(hotspots)} clusters detected")
        return hotspots

    def _getis_ord_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Apply Getis-Ord Gi* statistic for hot spot analysis."""
        # Create spatial grid
        df_agg = df.groupby(
            [(df["latitude"] / 0.2).round() * 0.2,
             (df["longitude"] / 0.2).round() * 0.2]
        ).agg({"column_value": ["mean", "count"]}).reset_index()
        df_agg.columns = ["latitude", "longitude", "mean_value", "count"]

        if len(df_agg) < 10:
            return []

        n = len(df_agg)
        values = df_agg["mean_value"].values
        x_bar = values.mean()
        s = values.std()

        if s == 0:
            return []

        hotspots = []
        for idx, row in df_agg.iterrows():
            # Compute Gi* using neighbors within 0.5 degrees
            distances = np.sqrt(
                (df_agg["latitude"].values - row["latitude"]) ** 2 +
                (df_agg["longitude"].values - row["longitude"]) ** 2
            )
            neighbors = distances <= 0.5
            w_sum = neighbors.sum()
            if w_sum <= 1:
                continue

            # Gi* statistic
            numerator = (values * neighbors).sum() - x_bar * w_sum
            denominator = s * np.sqrt((n * w_sum - w_sum ** 2) / (n - 1))
            if denominator == 0:
                continue

            gi_star = numerator / denominator

            # Significant hot spot: z > 1.96 (p < 0.05)
            if gi_star > 1.96:
                p_value = 2 * (1 - stats.norm.cdf(abs(gi_star)))
                hotspots.append({
                    "hotspot_date": str(df["observed_date"].iloc[0]),
                    "period_type": "seasonal",
                    "centroid_lat": round(float(row["latitude"]), 4),
                    "centroid_lon": round(float(row["longitude"]), 4),
                    "mean_hcho": round(float(row["mean_value"]), 6),
                    "z_score": round(float(gi_star), 4),
                    "p_value": round(float(p_value), 6),
                    "pixel_count": int(row["count"]),
                    "confidence": round(1 - p_value, 4),
                })

        logger.info(f"Getis-Ord Gi*: {len(hotspots)} significant hotspots")
        return hotspots

    def _morans_i_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Apply Local Moran's I for spatial autocorrelation analysis."""
        df_agg = df.groupby(
            [(df["latitude"] / 0.2).round() * 0.2,
             (df["longitude"] / 0.2).round() * 0.2]
        ).agg({"column_value": "mean"}).reset_index()
        df_agg.columns = ["latitude", "longitude", "value"]

        if len(df_agg) < 10:
            return []

        values = df_agg["value"].values
        n = len(values)
        x_bar = values.mean()
        deviations = values - x_bar
        m2 = (deviations ** 2).sum() / n

        if m2 == 0:
            return []

        hotspots = []
        for i in range(n):
            # Neighbors within 0.5 degrees
            distances = np.sqrt(
                (df_agg["latitude"].values - df_agg.iloc[i]["latitude"]) ** 2 +
                (df_agg["longitude"].values - df_agg.iloc[i]["longitude"]) ** 2
            )
            neighbors = (distances > 0) & (distances <= 0.5)
            if neighbors.sum() == 0:
                continue

            # Spatial weights (inverse distance)
            weights = np.where(neighbors, 1.0 / np.maximum(distances, 0.01), 0)
            weights /= weights.sum() if weights.sum() > 0 else 1

            # Local Moran's I
            local_i = (deviations[i] / m2) * (weights * deviations).sum()

            # Positive local I with positive deviation = Hot spot (High-High)
            if local_i > 0 and deviations[i] > 0:
                # Z-score approximation
                e_i = -1 / (n - 1)
                z_score = (local_i - e_i) / max(abs(local_i), 0.001)

                if z_score > 1.96:
                    hotspots.append({
                        "hotspot_date": str(df["observed_date"].iloc[0]),
                        "period_type": "seasonal",
                        "centroid_lat": round(float(df_agg.iloc[i]["latitude"]), 4),
                        "centroid_lon": round(float(df_agg.iloc[i]["longitude"]), 4),
                        "mean_hcho": round(float(df_agg.iloc[i]["value"]), 6),
                        "z_score": round(float(z_score), 4),
                        "pixel_count": 1,
                    })

        logger.info(f"Local Moran's I: {len(hotspots)} HH clusters")
        return hotspots

    @staticmethod
    def _identify_region(lat: Optional[float], lon: Optional[float]) -> str:
        """Identify the geographic region from coordinates."""
        if lat is None or lon is None:
            return "Unknown"

        regions = {
            "Indo-Gangetic Plain": (24, 31, 75, 88),
            "Punjab": (29.5, 32.5, 73.5, 77),
            "Haryana": (27.5, 31, 74.5, 77.5),
            "Delhi NCR": (28, 29, 76.5, 77.5),
            "Central India": (19, 25, 76, 84),
            "Northeast India": (22, 28, 89, 97),
            "Western India": (18, 24, 68, 75),
            "Southern India": (8, 16, 74, 80),
        }

        for name, (lat_min, lat_max, lon_min, lon_max) in regions.items():
            if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
                return name
        return "Other"
