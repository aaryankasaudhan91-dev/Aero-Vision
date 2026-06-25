"""
Data Preprocessing — Module 2
Implements cleaning, temporal alignment, spatial matching, and feature engineering.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple
from loguru import logger
from scipy import stats
from app.database import supabase


class DataPreprocessor:
    """Comprehensive data preprocessing pipeline."""

    def __init__(self):
        self.grid_resolution = 0.1  # degrees
        self.cloud_fraction_threshold = 0.3
        self.qa_threshold = 0.75

    async def fetch_and_preprocess(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Fetch all data sources, preprocess, and create integrated dataset."""
        logger.info(f"Preprocessing data from {start_date} to {end_date}")

        # Fetch from Supabase
        observations = await self._fetch_observations(start_date, end_date)
        aod_data = await self._fetch_aod(start_date, end_date)
        tropomi_data = await self._fetch_tropomi(start_date, end_date)
        meteo_data = await self._fetch_meteorological(start_date, end_date)

        if not observations:
            logger.warning("No observations found for the specified date range")
            return pd.DataFrame()

        # Convert to DataFrames
        df_obs = pd.DataFrame(observations)
        df_aod = pd.DataFrame(aod_data) if aod_data else pd.DataFrame()
        df_tropomi = pd.DataFrame(tropomi_data) if tropomi_data else pd.DataFrame()
        df_meteo = pd.DataFrame(meteo_data) if meteo_data else pd.DataFrame()

        # Clean each source
        df_obs = self._clean_observations(df_obs)
        df_tropomi = self._clean_tropomi(df_tropomi)
        df_meteo = self._clean_meteorological(df_meteo)

        # Integrate on common grid
        integrated = self._spatial_temporal_merge(df_obs, df_aod, df_tropomi, df_meteo)

        # Feature engineering
        integrated = self._engineer_features(integrated)

        # Data quality validation
        integrated = self._validate_quality(integrated)

        logger.info(f"Preprocessed dataset shape: {integrated.shape}")
        return integrated

    async def _fetch_observations(self, start_date: str, end_date: str) -> List[Dict]:
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            result = supabase.table("cpcb_observations").select(
                "*, cpcb_stations!inner(latitude, longitude, state, city)"
            ).gte("observed_at", f"{start_date}T00:00:00").lte("observed_at", f"{end_date}T23:59:59").range(start, start + chunk_size - 1).execute()
            data = result.data or []
            all_data.extend(data)
            if len(data) < chunk_size:
                break
            start += chunk_size
        return all_data

    async def _fetch_aod(self, start_date: str, end_date: str) -> List[Dict]:
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            result = supabase.table("satellite_aod").select("*").gte(
                "observed_date", start_date).lte("observed_date", end_date).range(start, start + chunk_size - 1).execute()
            data = result.data or []
            all_data.extend(data)
            if len(data) < chunk_size:
                break
            start += chunk_size
        return all_data

    async def _fetch_tropomi(self, start_date: str, end_date: str) -> List[Dict]:
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            result = supabase.table("tropomi_products").select("*").gte(
                "observed_date", start_date).lte("observed_date", end_date).range(start, start + chunk_size - 1).execute()
            data = result.data or []
            all_data.extend(data)
            if len(data) < chunk_size:
                break
            start += chunk_size
        return all_data

    async def _fetch_meteorological(self, start_date: str, end_date: str) -> List[Dict]:
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            result = supabase.table("meteorological_data").select("*").gte(
                "observed_date", start_date).lte("observed_date", end_date).range(start, start + chunk_size - 1).execute()
            data = result.data or []
            all_data.extend(data)
            if len(data) < chunk_size:
                break
            start += chunk_size
        return all_data

    def _clean_observations(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean CPCB observations: handle missing values and outliers."""
        if df.empty:
            return df

        pollutant_cols = ["pm25", "pm10", "no2", "so2", "co", "o3"]
        for col in pollutant_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
                # Physical range checks
                limits = {"pm25": (0, 1000), "pm10": (0, 2000), "no2": (0, 500),
                          "so2": (0, 500), "co": (0, 50), "o3": (0, 300)}
                lo, hi = limits.get(col, (0, 10000))
                df.loc[(df[col] < lo) | (df[col] > hi), col] = np.nan
                # IQR outlier detection
                df[col] = self._remove_iqr_outliers(df[col])

        # Remove rows with all NaN pollutants
        df = df.dropna(subset=pollutant_cols, how="all")

        # Parse datetime
        if "observed_at" in df.columns:
            df["observed_at"] = pd.to_datetime(df["observed_at"])
            df["date"] = df["observed_at"].dt.date

        return df

    def _clean_tropomi(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean TROPOMI data: QA filtering and cloud masking."""
        if df.empty:
            return df

        # QA filtering
        if "qa_value" in df.columns:
            df = df[df["qa_value"] >= self.qa_threshold]

        # Cloud fraction filtering
        if "cloud_fraction" in df.columns:
            df = df[df["cloud_fraction"] <= self.cloud_fraction_threshold]

        # Remove negative values
        if "column_value" in df.columns:
            df = df[df["column_value"] >= 0]

        return df

    def _clean_meteorological(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean meteorological data."""
        if df.empty:
            return df
        numeric_cols = ["temperature_2m", "relative_humidity", "wind_speed_10m",
                       "pbl_height", "u_wind_10m", "v_wind_10m"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        return df

    def _spatial_temporal_merge(self, df_obs, df_aod, df_tropomi, df_meteo) -> pd.DataFrame:
        """Merge datasets using spatial-temporal nearest-neighbor matching."""
        if df_obs.empty:
            return pd.DataFrame()

        # Extract station coordinates
        if "cpcb_stations" in df_obs.columns:
            df_obs["station_lat"] = df_obs["cpcb_stations"].apply(lambda x: x.get("latitude") if isinstance(x, dict) else None)
            df_obs["station_lon"] = df_obs["cpcb_stations"].apply(lambda x: x.get("longitude") if isinstance(x, dict) else None)

        # Aggregate observations to daily means per station
        daily_cols = ["station_id", "date", "pm25", "no2", "so2", "co", "o3", "station_lat", "station_lon"]
        existing_cols = [c for c in daily_cols if c in df_obs.columns]
        if "date" in df_obs.columns:
            df_daily = df_obs[existing_cols].groupby(["station_id", "date"]).mean(numeric_only=True).reset_index()
        else:
            df_daily = df_obs

        # Match satellite data to stations (nearest grid point)
        if not df_tropomi.empty and "date" in df_daily.columns:
            df_tropomi["date"] = pd.to_datetime(df_tropomi["observed_date"]).dt.date
            for product_type in ["NO2", "SO2", "CO", "O3", "HCHO"]:
                product_df = df_tropomi[df_tropomi["product_type"] == product_type].copy()
                if not product_df.empty:
                    col_name = f"sat_{product_type.lower()}"
                    df_daily[col_name] = np.nan
                    # Simple nearest-neighbor spatial matching (within 0.15° radius)
                    for idx, row in df_daily.iterrows():
                        if "station_lat" in df_obs.columns:
                            station_info = df_obs[df_obs["station_id"] == row["station_id"]].iloc[0]
                            slat = station_info.get("station_lat")
                            slon = station_info.get("station_lon")
                            if slat and slon:
                                mask = (
                                    (abs(product_df["latitude"] - slat) < 0.15) &
                                    (abs(product_df["longitude"] - slon) < 0.15) &
                                    (product_df["date"] == row["date"])
                                )
                                matched = product_df[mask]
                                if not matched.empty:
                                    df_daily.at[idx, col_name] = matched["column_value"].mean()

        # Match AOD data to stations (nearest grid point)
        if not df_aod.empty and "date" in df_daily.columns:
            df_daily["aod_550nm"] = np.nan
            df_aod["date"] = pd.to_datetime(df_aod["observed_date"]).dt.date
            for idx, row in df_daily.iterrows():
                if "station_lat" in df_obs.columns:
                    station_info = df_obs[df_obs["station_id"] == row["station_id"]].iloc[0]
                    slat = station_info.get("station_lat")
                    slon = station_info.get("station_lon")
                    if slat and slon:
                        mask = (
                            (abs(df_aod["latitude"] - slat) < 0.15) &
                            (abs(df_aod["longitude"] - slon) < 0.15) &
                            (df_aod["date"] == row["date"])
                        )
                        matched = df_aod[mask]
                        if not matched.empty:
                            df_daily.at[idx, "aod_550nm"] = matched["aod_550nm"].mean()

        # Match meteorological data
        if not df_meteo.empty and "temperature_2m" in df_meteo.columns:
            df_meteo["date"] = pd.to_datetime(df_meteo["observed_date"]).dt.date
            for met_col in ["temperature_2m", "relative_humidity", "wind_speed_10m",
                           "wind_direction", "pbl_height"]:
                if met_col in df_meteo.columns:
                    df_daily[met_col] = np.nan
                    for idx, row in df_daily.iterrows():
                        if "station_lat" in df_obs.columns:
                            station_info = df_obs[df_obs["station_id"] == row["station_id"]].iloc[0]
                            slat = station_info.get("station_lat")
                            slon = station_info.get("station_lon")
                            if slat and slon:
                                mask = (
                                    (abs(df_meteo["latitude"] - slat) < 0.15) &
                                    (abs(df_meteo["longitude"] - slon) < 0.15) &
                                    (df_meteo["date"] == row["date"])
                                )
                                matched = df_meteo[mask]
                                if not matched.empty:
                                    df_daily.at[idx, met_col] = matched[met_col].mean()

        return df_daily

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create derived features for ML models."""
        if df.empty:
            return df

        # Date-based features
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"])
            df["day_of_year"] = df["date"].dt.dayofyear
            df["month"] = df["date"].dt.month
            df["season"] = df["month"].map(
                lambda m: "winter" if m in [12, 1, 2] else
                "pre_monsoon" if m in [3, 4, 5] else
                "monsoon" if m in [6, 7, 8, 9] else "post_monsoon"
            )
            # Cyclical encoding
            df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
            df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
            df["doy_sin"] = np.sin(2 * np.pi * df["day_of_year"] / 365)
            df["doy_cos"] = np.cos(2 * np.pi * df["day_of_year"] / 365)

        # Interaction features
        if "wind_speed_10m" in df.columns and "pbl_height" in df.columns:
            df["ventilation_index"] = df["wind_speed_10m"] * df["pbl_height"]

        # AOD-PM2.5 ratio
        if "aod_550nm" in df.columns and "pm25" in df.columns:
            df["aod_pm25_ratio"] = df["aod_550nm"] / df["pm25"].replace(0, np.nan)

        return df

    def _validate_quality(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate data quality and flag suspicious records."""
        if df.empty:
            return df

        # Remove rows where all target variables are NaN
        target_cols = ["pm25", "no2", "so2", "co", "o3"]
        existing_targets = [c for c in target_cols if c in df.columns]
        if existing_targets:
            df = df.dropna(subset=existing_targets, how="all")

        # Log quality report
        total = len(df)
        for col in df.columns:
            if df[col].dtype in [np.float64, np.int64]:
                missing = df[col].isna().sum()
                if missing > 0:
                    logger.info(f"  {col}: {missing}/{total} missing ({100*missing/total:.1f}%)")

        return df

    @staticmethod
    def _remove_iqr_outliers(series: pd.Series, factor: float = 3.0) -> pd.Series:
        """Remove outliers using IQR method."""
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - factor * iqr
        upper = q3 + factor * iqr
        return series.where((series >= lower) & (series <= upper))

    def create_train_val_test_split(
        self, df: pd.DataFrame, train_ratio: float = 0.7,
        val_ratio: float = 0.15
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Geographic region-based split to prevent spatial leakage."""
        if "station_lat" not in df.columns:
            # Fallback to random split
            n = len(df)
            train_end = int(n * train_ratio)
            val_end = int(n * (train_ratio + val_ratio))
            shuffled = df.sample(frac=1, random_state=42).reset_index(drop=True)
            return shuffled[:train_end], shuffled[train_end:val_end], shuffled[val_end:]

        # Region-based split
        regions = {
            "north": lambda row: row.get("station_lat", 0) > 28,
            "central": lambda row: 20 <= row.get("station_lat", 0) <= 28,
            "south": lambda row: row.get("station_lat", 0) < 20,
        }

        # Assign regions proportionally
        north = df[df.get("station_lat", pd.Series()) > 28] if "station_lat" in df.columns else pd.DataFrame()
        central = df[(df.get("station_lat", pd.Series()) >= 20) & (df.get("station_lat", pd.Series()) <= 28)] if "station_lat" in df.columns else pd.DataFrame()
        south = df[df.get("station_lat", pd.Series()) < 20] if "station_lat" in df.columns else pd.DataFrame()

        train_parts, val_parts, test_parts = [], [], []
        for region_df in [north, central, south]:
            if region_df.empty:
                continue
            n = len(region_df)
            shuffled = region_df.sample(frac=1, random_state=42)
            t_end = int(n * train_ratio)
            v_end = int(n * (train_ratio + val_ratio))
            train_parts.append(shuffled[:t_end])
            val_parts.append(shuffled[t_end:v_end])
            test_parts.append(shuffled[v_end:])

        return (
            pd.concat(train_parts).reset_index(drop=True),
            pd.concat(val_parts).reset_index(drop=True),
            pd.concat(test_parts).reset_index(drop=True),
        )
