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


def haversine_distance_vector(lat1: float, lon1: float, lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
    """Compute exact haversine distance from one point to an array of points in km."""
    R = 6371.0
    dlat = np.radians(lats - lat1)
    dlon = np.radians(lons - lon1)
    a = (np.sin(dlat / 2) ** 2 + 
         np.cos(np.radians(lat1)) * np.cos(np.radians(lats)) * np.sin(dlon / 2) ** 2)
    c = 2 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))
    return R * c


class HCHOHotspotDetector:
    """Multi-method HCHO hotspot detection system."""

    def __init__(self):
        self.percentile_threshold = 95  # 95th percentile as per strategy doc
        self.dbscan_eps_km = 50.0  # 50 km physical radius
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
            logger.warning(f"No HCHO data found for hotspot detection between {start_date} and {end_date}")
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

        # Fetch stations to determine state names dynamically based on proximity
        try:
            stn_res = supabase.table("cpcb_stations").select("state, latitude, longitude").execute()
            stations_list = stn_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch stations for state mapping: {e}")
            stations_list = []

        # Clear existing hotspots for this range to prevent duplicate accummulation
        try:
            supabase.table("hcho_hotspots").delete().gte("hotspot_date", start_date).lte("hotspot_date", end_date).execute()
        except Exception as e:
            logger.warning(f"Failed to clear old hotspots: {e}")

        # Store all hotspots
        total_stored = 0
        for method, hotspots in all_hotspots.items():
            for h in hotspots:
                h["detection_method"] = method
                h["period_start"] = start_date
                h["period_end"] = end_date
                h["season"] = season
                h["region_name"] = self._identify_region(h.get("centroid_lat"), h.get("centroid_lon"))
                h["state"] = self._identify_state(h.get("centroid_lat"), h.get("centroid_lon"), stations_list)

            if hotspots:
                batch = hotspots[:200]  # Limit batch size
                try:
                    supabase.table("hcho_hotspots").insert(batch).execute()
                    total_stored += len(batch)
                except Exception as e:
                    logger.error(f"Error storing {method} hotspots: {e}")

        logger.info(f"Detected and stored {total_stored} hotspots dynamically")
        return all_hotspots

    def _percentile_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Flag pixels exceeding the 95th percentile of HCHO concentrations."""
        threshold = np.percentile(df["column_value"], self.percentile_threshold)
        elevated = df[df["column_value"] >= threshold].copy()

        if elevated.empty:
            return []

        # Group nearby pixels using 0.3 degree grid bins (more accurate than 0.5)
        elevated["lat_bin"] = (elevated["latitude"] / 0.3).round() * 0.3
        elevated["lon_bin"] = (elevated["longitude"] / 0.3).round() * 0.3

        # Adjust minimum pixels required to qualify as a hotspot based on density
        min_pixels = 2 if len(df) > 500 else 1

        hotspots = []
        for (lat_bin, lon_bin), group in elevated.groupby(["lat_bin", "lon_bin"]):
            if len(group) >= min_pixels:
                hotspots.append({
                    "hotspot_date": str(group["observed_date"].iloc[0]),
                    "period_type": "seasonal",
                    "centroid_lat": round(group["latitude"].mean(), 4),
                    "centroid_lon": round(group["longitude"].mean(), 4),
                    "mean_hcho": round(float(group["column_value"].mean()), 6),
                    "max_hcho": round(float(group["column_value"].max()), 6),
                    "percentile_rank": float(self.percentile_threshold),
                    "pixel_count": len(group),
                    "area_sq_km": round(len(group) * 25.0, 1),
                    "confidence": round(float(min(1.0, group["column_value"].mean() / max(0.0001, threshold))), 4)
                })

        logger.info(f"Percentile method: {len(hotspots)} hotspots detected (threshold: {threshold:.6f})")
        return hotspots

    def _dbscan_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Apply DBSCAN clustering with precise Haversine distance metric."""
        # Filter to elevated values (> 75th percentile for clustering)
        threshold = np.percentile(df["column_value"], 75)
        elevated = df[df["column_value"] >= threshold].copy()

        if len(elevated) < self.dbscan_min_samples:
            return []

        # Convert lat/lon coordinates to radians for the Haversine metric
        coords_rad = np.radians(elevated[["latitude", "longitude"]].values)
        
        # DBSCAN parameters scaled to radians
        earth_radius_km = 6371.0
        epsilon_rad = self.dbscan_eps_km / earth_radius_km

        clustering = DBSCAN(
            eps=epsilon_rad,
            min_samples=self.dbscan_min_samples,
            metric="haversine"
        ).fit(coords_rad)

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
                "area_sq_km": round(len(cluster) * 25.0, 1),
                "confidence": round(float(min(1.0, cluster["column_value"].mean() / max(0.0001, threshold))), 4)
            })

        logger.info(f"DBSCAN: {len(hotspots)} clusters detected")
        return hotspots

    def _getis_ord_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Apply Getis-Ord Gi* statistic for hotspot analysis with accurate physical weights."""
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
        s = values.std(ddof=0)  # Population standard deviation

        if s == 0:
            return []

        hotspots = []
        lats = df_agg["latitude"].values
        lons = df_agg["longitude"].values

        for idx, row in df_agg.iterrows():
            # Compute Gi* using actual physical distance (50 km radius)
            distances = haversine_distance_vector(row["latitude"], row["longitude"], lats, lons)
            neighbors = distances <= 50.0
            w_sum = neighbors.sum()
            if w_sum <= 1:
                continue

            # Gi* statistic formula
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
                    "confidence": round(1.0 - p_value, 4),
                })

        logger.info(f"Getis-Ord Gi*: {len(hotspots)} significant hotspots")
        return hotspots

    def _morans_i_detection(self, df: pd.DataFrame) -> List[Dict]:
        """Apply Local Moran's I for spatial autocorrelation using exact variance/expectation formulas."""
        df_agg = df.groupby(
            [(df["latitude"] / 0.2).round() * 0.2,
             (df["longitude"] / 0.2).round() * 0.2]
        ).agg({"column_value": ["mean", "count"]}).reset_index()
        df_agg.columns = ["latitude", "longitude", "value", "count"]

        if len(df_agg) < 10:
            return []

        values = df_agg["value"].values
        n = len(values)
        x_bar = values.mean()
        deviations = values - x_bar
        m2 = (deviations ** 2).sum() / n

        if m2 == 0:
            return []

        # Kurtosis coefficient for analytical variance
        m4 = (deviations ** 4).sum() / n
        b2 = m4 / (m2 ** 2) if m2 > 0 else 3.0

        hotspots = []
        lats = df_agg["latitude"].values
        lons = df_agg["longitude"].values

        for i in range(n):
            # Compute exact Haversine distance in km
            distances = haversine_distance_vector(df_agg.iloc[i]["latitude"], df_agg.iloc[i]["longitude"], lats, lons)
            neighbors = (distances > 0) & (distances <= 50.0)
            if neighbors.sum() == 0:
                continue

            # Spatial weights (inverse physical distance in km)
            weights = np.where(neighbors, 1.0 / np.maximum(distances, 1.0), 0.0)
            weights_sum = weights.sum()
            if weights_sum > 0:
                weights /= weights_sum
            else:
                continue

            # Local Moran's I calculation
            local_i = (deviations[i] / m2) * (weights * deviations).sum()

            # Positive local I and positive deviation = High-High (hotspot)
            if local_i > 0 and deviations[i] > 0:
                e_i = -1.0 / (n - 1)
                w_i2 = (weights ** 2).sum()
                w_i_2 = 1.0 - w_i2
                
                # Precise analytical variance under normality/randomization
                if n > 2:
                    var_i = (w_i2 * (n - b2)) / (n - 1) + (2 * w_i_2 * (2 * b2 - n)) / ((n - 1) * (n - 2)) - (e_i ** 2)
                else:
                    var_i = 1.0

                std_i = np.sqrt(max(var_i, 1e-9))
                z_score = (local_i - e_i) / std_i

                if z_score > 1.96:
                    p_value = 2 * (1.0 - stats.norm.cdf(abs(z_score)))
                    hotspots.append({
                        "hotspot_date": str(df["observed_date"].iloc[0]),
                        "period_type": "seasonal",
                        "centroid_lat": round(float(df_agg.iloc[i]["latitude"]), 4),
                        "centroid_lon": round(float(df_agg.iloc[i]["longitude"]), 4),
                        "mean_hcho": round(float(df_agg.iloc[i]["value"]), 6),
                        "z_score": round(float(z_score), 4),
                        "p_value": round(float(p_value), 6),
                        "pixel_count": int(df_agg.iloc[i]["count"]),
                        "confidence": round(1.0 - p_value, 4)
                    })

        logger.info(f"Local Moran's I: {len(hotspots)} HH clusters")
        return hotspots

    @staticmethod
    def _identify_region(lat: Optional[float], lon: Optional[float]) -> str:
        """Identify the geographic region from coordinates."""
        if lat is None or lon is None:
            return "Unknown"

        regions = {
            "Indo-Gangetic Plain": (24.0, 31.0, 75.0, 88.0),
            "Punjab": (29.5, 32.5, 73.5, 77.0),
            "Haryana": (27.5, 31.0, 74.5, 77.5),
            "Delhi NCR": (28.0, 29.0, 76.5, 77.5),
            "Central India": (19.0, 25.0, 76.0, 84.0),
            "Northeast India": (22.0, 28.0, 89.0, 97.0),
            "Western India": (18.0, 24.0, 68.0, 75.0),
            "Southern India": (8.0, 16.0, 74.0, 80.0),
        }

        for name, (lat_min, lat_max, lon_min, lon_max) in regions.items():
            if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
                return name
        return "Other"

    @staticmethod
    def _identify_state(lat: Optional[float], lon: Optional[float], stations: List[Dict]) -> str:
        """Identify the Indian state dynamically by matching with the nearest CPCB monitoring station."""
        if lat is None or lon is None or not stations:
            return "Other"

        min_dist = float("inf")
        closest_state = "Other"
        for stn in stations:
            s_lat = stn.get("latitude")
            s_lon = stn.get("longitude")
            s_state = stn.get("state")
            if s_lat is not None and s_lon is not None and s_state:
                dist = (s_lat - lat) ** 2 + (s_lon - lon) ** 2
                if dist < min_dist:
                    min_dist = dist
                    closest_state = s_state
        return closest_state
