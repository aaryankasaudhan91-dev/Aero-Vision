"""
Google Earth Engine Scripts — Sentinel-5P TROPOMI data extraction.
Extracts NO₂, SO₂, CO, O₃, HCHO daily composites over India.
"""

import ee
from datetime import date, timedelta
from typing import List, Dict, Optional
from loguru import logger
from app.config import get_settings

settings = get_settings()


def initialize_gee():
    """Initialize Google Earth Engine with service account."""
    if settings.GEE_SERVICE_ACCOUNT_PATH:
        credentials = ee.ServiceAccountCredentials(
            settings.GEE_PROJECT_ID,
            settings.GEE_SERVICE_ACCOUNT_PATH
        )
        ee.Initialize(credentials, project=settings.GEE_PROJECT_ID)
    else:
        ee.Initialize(project=settings.GEE_PROJECT_ID)
    logger.info("Google Earth Engine initialized")


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
