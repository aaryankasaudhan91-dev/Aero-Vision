"""
Data Ingestion Pipelines — Module 1
Automated pipelines for downloading and storing satellite, ground, and meteorological data.
"""

import requests
import aiohttp
import asyncio
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
from loguru import logger
from app.database import supabase
from app.config import get_settings

settings = get_settings()


class CPCBIngestion:
    """Download and store CPCB air quality ground observations."""

    BASE_URL = "https://app.cpcbccr.com/ccr_docs/api"

    async def fetch_station_list(self) -> List[Dict]:
        """Fetch list of all CPCB monitoring stations."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.BASE_URL}/station_list",
                headers={"Accept": "application/json"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("stations", [])
                logger.warning(f"CPCB station list fetch failed: {resp.status}")
                return []

    async def fetch_observations(self, station_id: str, from_date: str, to_date: str) -> List[Dict]:
        """Fetch hourly observations for a station."""
        async with aiohttp.ClientSession() as session:
            params = {
                "station_id": station_id,
                "from_date": from_date,
                "to_date": to_date,
            }
            async with session.get(
                f"{self.BASE_URL}/station_data", params=params,
                headers={"Accept": "application/json"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("records", [])
                return []

    async def ingest_stations(self, stations: List[Dict]) -> int:
        """Store station metadata in Supabase."""
        inserted = 0
        for stn in stations:
            try:
                record = {
                    "station_id": stn.get("id", stn.get("station_id")),
                    "station_name": stn.get("name", stn.get("station_name", "")),
                    "city": stn.get("city", ""),
                    "state": stn.get("state", ""),
                    "latitude": float(stn.get("latitude", 0)),
                    "longitude": float(stn.get("longitude", 0)),
                    "station_type": stn.get("station_type", "CAAQMS"),
                    "is_active": True,
                }
                supabase.table("cpcb_stations").upsert(record, on_conflict="station_id").execute()
                inserted += 1
            except Exception as e:
                logger.error(f"Error inserting station {stn}: {e}")
        logger.info(f"Ingested {inserted} CPCB stations")
        return inserted

    async def ingest_observations(self, station_id: str, observations: List[Dict]) -> int:
        """Store observation records in Supabase."""
        from app.ml.aqi_engine import compute_aqi
        inserted = 0
        batch = []
        for obs in observations:
            try:
                pm25 = self._safe_float(obs.get("PM2.5", obs.get("pm25")))
                pm10 = self._safe_float(obs.get("PM10", obs.get("pm10")))
                no2 = self._safe_float(obs.get("NO2", obs.get("no2")))
                so2 = self._safe_float(obs.get("SO2", obs.get("so2")))
                co = self._safe_float(obs.get("CO", obs.get("co")))
                o3 = self._safe_float(obs.get("Ozone", obs.get("o3")))
                nh3 = self._safe_float(obs.get("NH3", obs.get("nh3")))

                aqi_res = compute_aqi({
                    "PM2.5": pm25,
                    "PM10": pm10,
                    "NO2": no2,
                    "SO2": so2,
                    "CO": co,
                    "O3": o3,
                    "NH3": nh3
                })

                record = {
                    "station_id": station_id,
                    "observed_at": obs.get("timestamp", obs.get("datetime")),
                    "pm25": pm25,
                    "pm10": pm10,
                    "no2": no2,
                    "so2": so2,
                    "co": co,
                    "o3": o3,
                    "nh3": nh3,
                    "aqi": aqi_res.get("aqi"),
                    "aqi_category": aqi_res.get("category"),
                    "prominent_pollutant": aqi_res.get("prominent_pollutant"),
                }
                batch.append(record)
                if len(batch) >= 100:
                    supabase.table("cpcb_observations").upsert(batch, on_conflict="station_id,observed_at").execute()
                    inserted += len(batch)
                    batch = []
            except Exception as e:
                logger.error(f"Error processing observation: {e}")

        if batch:
            supabase.table("cpcb_observations").upsert(batch, on_conflict="station_id,observed_at").execute()
            inserted += len(batch)

        logger.info(f"Ingested {inserted} observations for station {station_id}")
        return inserted

    @staticmethod
    def _safe_float(val) -> Optional[float]:
        if val is None or val == "" or val == "NA" or val == "None":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None


class TROPOMIIngestion:
    """Download and store Sentinel-5P TROPOMI products via GEE."""

    PRODUCTS = ["NO2", "SO2", "CO", "O3", "HCHO"]

    async def ingest_from_gee(self, product: str, start_date: str, end_date: str) -> int:
        """Extract TROPOMI data via GEE and store in Supabase."""
        from app.geospatial.gee_scripts import (
            initialize_gee, get_tropomi_no2, get_tropomi_so2,
            get_tropomi_co, get_tropomi_o3, get_tropomi_hcho,
            extract_tropomi_to_grid
        )

        initialize_gee()

        product_funcs = {
            "NO2": get_tropomi_no2,
            "SO2": get_tropomi_so2,
            "CO": get_tropomi_co,
            "O3": get_tropomi_o3,
            "HCHO": get_tropomi_hcho,
        }

        func = product_funcs.get(product)
        if not func:
            raise ValueError(f"Unknown product: {product}")

        logger.info(f"Extracting TROPOMI {product} from {start_date} to {end_date}")
        grid_data = extract_tropomi_to_grid(func, start_date, end_date)

        unit_map = {"NO2": "mol/m²", "SO2": "mol/m²", "CO": "mol/m²", "O3": "mol/m²", "HCHO": "mol/m²"}

        batch = []
        for point in grid_data:
            if point.get("column_value") is not None:
                batch.append({
                    "product_type": product,
                    "observed_date": start_date,
                    "latitude": point["latitude"],
                    "longitude": point["longitude"],
                    "column_value": point["column_value"],
                    "column_unit": unit_map[product],
                    "qa_value": 0.75,
                })
                if len(batch) >= 500:
                    supabase.table("tropomi_products").insert(batch).execute()
                    batch = []

        if batch:
            supabase.table("tropomi_products").insert(batch).execute()

        total = len(grid_data)
        logger.info(f"Ingested {total} TROPOMI {product} records")
        return total


class FIRMSIngestion:
    """Download and store NASA FIRMS active fire data."""

    BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

    async def fetch_fires(self, source: str = "MODIS_NRT", days: int = 1,
                          area: str = "world") -> List[Dict]:
        """Fetch active fire data from NASA FIRMS API."""
        url = f"{self.BASE_URL}/{settings.FIRMS_MAP_KEY}/{source}/{area}/{days}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    return self._parse_csv(text)
                logger.warning(f"FIRMS fetch failed: {resp.status}")
                return []

    def _parse_csv(self, csv_text: str) -> List[Dict]:
        """Parse FIRMS CSV response."""
        lines = csv_text.strip().split("\n")
        if len(lines) < 2:
            return []
        headers = lines[0].split(",")
        records = []
        for line in lines[1:]:
            values = line.split(",")
            if len(values) == len(headers):
                records.append(dict(zip(headers, values)))
        return records

    async def ingest_modis(self, days: int = 1) -> int:
        """Ingest MODIS fire data."""
        fires = await self.fetch_fires(source="MODIS_NRT", days=days)
        return await self._store_fires(fires, "MODIS")

    async def ingest_viirs(self, days: int = 1) -> int:
        """Ingest VIIRS fire data."""
        fires = await self.fetch_fires(source="VIIRS_SNPP_NRT", days=days)
        return await self._store_fires(fires, "VIIRS")

    async def _store_fires(self, fires: List[Dict], source: str) -> int:
        """Store fire records in Supabase."""
        batch = []
        for f in fires:
            try:
                lat = float(f.get("latitude", 0))
                lon = float(f.get("longitude", 0))
                # Filter to India bounds
                if not (6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0):
                    continue

                acq_date = f.get("acq_date", str(date.today()))
                acq_time = f.get("acq_time", "0000").zfill(4)
                dt_str = f"{acq_date} {acq_time[:2]}:{acq_time[2:]}"

                record = {
                    "source": source,
                    "detected_at": dt_str,
                    "detected_date": acq_date,
                    "latitude": lat,
                    "longitude": lon,
                    "frp": CPCBIngestion._safe_float(f.get("frp")),
                    "brightness": CPCBIngestion._safe_float(f.get("brightness")),
                    "confidence": int(f.get("confidence", 0)) if f.get("confidence", "").isdigit() else None,
                    "satellite": f.get("satellite", ""),
                    "daynight": f.get("daynight", ""),
                }
                batch.append(record)
                if len(batch) >= 500:
                    supabase.table("fire_records").insert(batch).execute()
                    batch = []
            except Exception as e:
                logger.error(f"Error processing fire record: {e}")

        if batch:
            supabase.table("fire_records").insert(batch).execute()

        total = len(batch)
        logger.info(f"Ingested {total} {source} fire records")
        return total


class ERA5Ingestion:
    """Download and store ERA5 reanalysis data via CDS API."""

    async def fetch_era5(self, target_date: str, variables: List[str] = None) -> str:
        """Download ERA5 data using CDS API."""
        import cdsapi
        c = cdsapi.Client(url=settings.CDS_API_URL, key=settings.CDS_API_KEY)

        if variables is None:
            variables = [
                "10m_u_component_of_wind", "10m_v_component_of_wind",
                "2m_temperature", "2m_dewpoint_temperature",
                "boundary_layer_height", "total_precipitation",
                "surface_pressure",
            ]

        output_file = f"era5_{target_date}.nc"
        c.retrieve(
            "reanalysis-era5-single-levels",
            {
                "product_type": "reanalysis",
                "variable": variables,
                "year": target_date[:4],
                "month": target_date[5:7],
                "day": target_date[8:10],
                "time": ["00:00", "06:00", "12:00", "18:00"],
                "area": [38, 68, 6, 98],  # India bounds: N, W, S, E
                "format": "netcdf",
            },
            output_file,
        )
        return output_file

    async def ingest_from_netcdf(self, filepath: str, source: str = "ERA5") -> int:
        """Parse NetCDF file and store in Supabase."""
        import xarray as xr
        import numpy as np
        import zipfile
        import os
        import glob

        import tempfile

        nc_files = [filepath]
        temp_dir_obj = None
        if zipfile.is_zipfile(filepath):
            temp_dir_obj = tempfile.TemporaryDirectory()
            extract_dir = temp_dir_obj.name
            with zipfile.ZipFile(filepath, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            nc_files = glob.glob(os.path.join(extract_dir, "*.nc"))
        elif not os.path.isabs(filepath) and "💖" in os.getcwd():
            # If it's not a zip, we still need to move it out of the emoji path
            temp_dir_obj = tempfile.TemporaryDirectory()
            safe_filepath = os.path.join(temp_dir_obj.name, os.path.basename(filepath))
            import shutil
            shutil.copy2(filepath, safe_filepath)
            nc_files = [safe_filepath]
        
        total_ingested = 0
        for nc_file in nc_files:
            ds = xr.open_dataset(nc_file)
            time_dim = "valid_time" if "valid_time" in ds.dims else "time"
            times = ds[time_dim].values if time_dim in ds.dims else [np.datetime64("today")]

            batch = []
            for t in times:
                dt = str(t)[:10]
                for lat in ds.latitude.values[::4]:  # Subsample for storage
                    for lon in ds.longitude.values[::4]:
                        point = ds.sel(latitude=lat, longitude=lon, **{time_dim: t}, method="nearest")
                        record = {
                            "source": source,
                            "observed_date": dt,
                            "latitude": float(lat),
                            "longitude": float(lon),
                            "temperature_2m": self._extract_val(point, "t2m"),
                            "u_wind_10m": self._extract_val(point, "u10"),
                            "v_wind_10m": self._extract_val(point, "v10"),
                            "pbl_height": self._extract_val(point, "blh"),
                            "total_precipitation": self._extract_val(point, "tp"),
                            "surface_pressure": self._extract_val(point, "sp"),
                        }
                        # Compute derived fields
                        u = record.get("u_wind_10m")
                        v = record.get("v_wind_10m")
                        if u is not None and v is not None:
                            import math
                            record["wind_speed_10m"] = round(math.sqrt(u**2 + v**2), 3)
                            record["wind_direction"] = round((math.degrees(math.atan2(-u, -v)) + 360) % 360, 1)

                        batch.append(record)
                        if len(batch) >= 500:
                            supabase.table("meteorological_data").insert(batch).execute()
                            total_ingested += len(batch)
                            batch = []

            if batch:
                supabase.table("meteorological_data").insert(batch).execute()
                total_ingested += len(batch)

            ds.close()

        logger.info(f"Ingested ERA5 data from {filepath}")
        return total_ingested

    @staticmethod
    def _extract_val(point, var_name):
        try:
            val = float(point[var_name].values)
            if not (val != val):  # Check for NaN
                return round(val, 4)
        except (KeyError, ValueError, TypeError):
            pass
        return None


class MOSDACIngestion:
    """Download INSAT-3D AOD data from MOSDAC."""

    BASE_URL = "https://mosdac.gov.in"

    async def fetch_aod(self, target_date: str) -> Optional[str]:
        """Download INSAT-3D Level-2 AOD product."""
        async with aiohttp.ClientSession() as session:
            url = f"{self.BASE_URL}/data/insat3d/aod/{target_date}"
            auth = aiohttp.BasicAuth(settings.MOSDAC_USERNAME, settings.MOSDAC_PASSWORD)
            async with session.get(url, auth=auth) as resp:
                if resp.status == 200:
                    filepath = f"insat3d_aod_{target_date}.hdf"
                    with open(filepath, "wb") as f:
                        f.write(await resp.read())
                    return filepath
                logger.warning(f"MOSDAC download failed: {resp.status}")
                return None

    async def ingest_aod(self, filepath: str, observed_date: str) -> int:
        """Parse INSAT-3D AOD HDF file and store in Supabase."""
        try:
            import xarray as xr
            ds = xr.open_dataset(filepath, engine="netcdf4")
            aod_var = None
            for var in ["AOD_550", "aod_550", "AOD", "aod"]:
                if var in ds:
                    aod_var = var
                    break
            if not aod_var:
                logger.error(f"AOD variable not found in {filepath}")
                return 0

            batch = []
            lats = ds.latitude.values if "latitude" in ds else ds.lat.values
            lons = ds.longitude.values if "longitude" in ds else ds.lon.values
            aod_data = ds[aod_var].values

            for i, lat in enumerate(lats):
                for j, lon in enumerate(lons):
                    val = float(aod_data[i, j]) if len(aod_data.shape) == 2 else float(aod_data[0, i, j])
                    if val == val and 0 <= val <= 5:  # Valid range check
                        batch.append({
                            "source": "INSAT-3D",
                            "observed_date": observed_date,
                            "latitude": round(float(lat), 4),
                            "longitude": round(float(lon), 4),
                            "aod_550nm": round(val, 4),
                        })
                        if len(batch) >= 500:
                            supabase.table("satellite_aod").insert(batch).execute()
                            batch = []

            if batch:
                supabase.table("satellite_aod").insert(batch).execute()
            ds.close()
            return len(batch)
        except Exception as e:
            logger.error(f"Error ingesting AOD: {e}")
            return 0


async def run_full_ingestion(target_date: str):
    """Run complete data ingestion pipeline for a given date."""
    logger.info(f"Starting full ingestion for {target_date}")

    cpcb = CPCBIngestion()
    tropomi = TROPOMIIngestion()
    firms = FIRMSIngestion()
    era5 = ERA5Ingestion()
    mosdac = MOSDACIngestion()

    # Ingest in parallel where possible
    tasks = [
        firms.ingest_modis(days=1),
        firms.ingest_viirs(days=1),
    ]

    # TROPOMI products
    next_date = str(date.fromisoformat(target_date) + timedelta(days=1))
    for product in ["NO2", "SO2", "CO", "O3", "HCHO"]:
        tasks.append(tropomi.ingest_from_gee(product, target_date, next_date))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            logger.error(f"Ingestion task {i} failed: {r}")
        else:
            logger.info(f"Ingestion task {i} completed: {r}")

    logger.info("Full ingestion pipeline completed")
