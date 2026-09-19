"""
Google Earth Engine Scripts — Sentinel-5P TROPOMI data extraction.
Extracts NO₂, SO₂, CO, O₃, HCHO daily composites over India.
"""

import ee
import json
import base64
from pathlib import Path
from datetime import date, timedelta
from typing import List, Dict, Optional
from loguru import logger
from app.config import get_settings

settings = get_settings()


def initialize_gee():
    """Initialize Google Earth Engine with service account from env var or file."""
    project_id = settings.GEE_PROJECT_ID
    credentials = None

    # 1. Try GEE_SERVICE_ACCOUNT_JSON from env (supports raw JSON string or base64)
    if settings.GEE_SERVICE_ACCOUNT_JSON:
        raw_val = settings.GEE_SERVICE_ACCOUNT_JSON.strip()
        try:
            if not raw_val.startswith("{"):
                raw_val = base64.b64decode(raw_val).decode("utf-8")

            key_dict = json.loads(raw_val)
            if not project_id and "project_id" in key_dict:
                project_id = key_dict["project_id"]

            credentials = ee.ServiceAccountCredentials(
                key_data=json.dumps(key_dict)
            )
            logger.info("Configured GEE credentials from GEE_SERVICE_ACCOUNT_JSON env variable")
        except Exception as e:
            logger.error(f"Failed to parse GEE_SERVICE_ACCOUNT_JSON: {e}")
            raise

    # 2. Fall back to GEE_SERVICE_ACCOUNT_PATH if credentials not set
    if not credentials and settings.GEE_SERVICE_ACCOUNT_PATH:
        cred_path = Path(settings.GEE_SERVICE_ACCOUNT_PATH)
        if not cred_path.is_file():
            # Try resolving relative to backend directory
            alt_path = Path(__file__).resolve().parent.parent.parent / settings.GEE_SERVICE_ACCOUNT_PATH.lstrip("./")
            if alt_path.is_file():
                cred_path = alt_path

        if cred_path.is_file():
            credentials = ee.ServiceAccountCredentials(
                project_id or None,
                str(cred_path)
            )
            logger.info(f"Configured GEE credentials from file: {cred_path}")
        else:
            logger.warning(f"GEE service account file not found at: {settings.GEE_SERVICE_ACCOUNT_PATH}")

    # 3. Initialize Earth Engine
    if credentials:
        ee.Initialize(credentials, project=project_id or None)
    elif project_id:
        ee.Initialize(project=project_id)
    else:
        ee.Initialize()

    logger.info(f"Google Earth Engine initialized successfully (project: {project_id or 'default'})")


def get_india_geom():
    return ee.Geometry.Rectangle([68.0, 6.0, 98.0, 38.0])


def get_tropomi_no2(start_date: str, end_date: str, region=None) -> ee.Image:
    """Get TROPOMI NO₂ tropospheric column composite."""
    geometry = region or get_india_geom()
    collection = (
        ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_NO2")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select("tropospheric_NO2_column_number_density")
    )
    return collection.mean().clip(geometry)


def get_tropomi_so2(start_date: str, end_date: str, region=None) -> ee.Image:
    """Get TROPOMI SO₂ column composite."""
    geometry = region or get_india_geom()
    collection = (
        ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_SO2")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select("SO2_column_number_density")
    )
    return collection.mean().clip(geometry)


def get_tropomi_co(start_date: str, end_date: str, region=None) -> ee.Image:
    """Get TROPOMI CO column composite."""
    geometry = region or get_india_geom()
    collection = (
        ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_CO")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select("CO_column_number_density")
    )
    return collection.mean().clip(geometry)


def get_tropomi_o3(start_date: str, end_date: str, region=None) -> ee.Image:
    """Get TROPOMI O₃ column composite."""
    geometry = region or get_india_geom()
    collection = (
        ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_O3")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select("O3_column_number_density")
    )
    return collection.mean().clip(geometry)


def get_tropomi_hcho(start_date: str, end_date: str, region=None) -> ee.Image:
    """Get TROPOMI HCHO tropospheric column composite."""
    geometry = region or get_india_geom()
    collection = (
        ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_HCHO")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select("tropospheric_HCHO_column_number_density")
    )
    return collection.mean().clip(geometry)


def extract_tropomi_to_grid(
    product_func, start_date: str, end_date: str,
    scale: int = 11132, max_pixels: int = 1e8
) -> List[Dict]:
    """Extract TROPOMI product to a list of lat/lon/value dictionaries."""
    image = product_func(start_date, end_date)
    band_name = image.bandNames().getInfo()[0]

    # Sample the image at grid points
    sample = image.sample(
        region=get_india_geom(),
        scale=scale,
        numPixels=4500,
        seed=42,
        geometries=True
    )

    features = sample.getInfo()["features"]
    results = []
    for f in features:
        coords = f["geometry"]["coordinates"]
        props = f["properties"]
        results.append({
            "longitude": round(coords[0], 4),
            "latitude": round(coords[1], 4),
            "column_value": props.get(band_name),
        })
    return results


def get_modis_fire(start_date: str, end_date: str, region=None) -> ee.Image:
    """Get MODIS active fire data from GEE."""
    geometry = region or get_india_geom()
    collection = (
        ee.ImageCollection("MODIS/061/MOD14A1")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select("MaxFRP")
    )
    return collection.max().clip(geometry)


def get_era5_wind(start_date: str, end_date: str, region=None) -> ee.Image:
    """Get ERA5 wind components from GEE."""
    geometry = region or get_india_geom()
    collection = (
        ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY")
        .filterDate(start_date, end_date)
        .filterBounds(geometry)
        .select(["u_component_of_wind_10m", "v_component_of_wind_10m",
                 "temperature_2m", "dewpoint_temperature_2m"])
    )
    return collection.mean().clip(geometry)


def compute_hcho_anomaly(
    target_start: str, target_end: str,
    baseline_start: str = "2019-01-01", baseline_end: str = "2023-12-31"
) -> ee.Image:
    """Compute HCHO anomaly relative to multi-year climatology."""
    target = get_tropomi_hcho(target_start, target_end)
    baseline = get_tropomi_hcho(baseline_start, baseline_end)
    anomaly = target.subtract(baseline)
    return anomaly
