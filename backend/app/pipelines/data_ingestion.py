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
                query = supabase.table("cpcb_stations").upsert(record, on_conflict="station_id")
                await asyncio.to_thread(query.execute)
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
                    query = supabase.table("cpcb_observations").upsert(batch, on_conflict="station_id,observed_at")
                    await asyncio.to_thread(query.execute)
                    inserted += len(batch)
                    batch = []
            except Exception as e:
                logger.error(f"Error processing observation: {e}")

        if batch:
            query = supabase.table("cpcb_observations").upsert(batch, on_conflict="station_id,observed_at")
            await asyncio.to_thread(query.execute)
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
                    query = supabase.table("tropomi_products").insert(batch)
                    await asyncio.to_thread(query.execute)
                    batch = []

        if batch:
            query = supabase.table("tropomi_products").insert(batch)
            await asyncio.to_thread(query.execute)

        total = len(grid_data)
        logger.info(f"Ingested {total} TROPOMI {product} records")
        return total


class FIRMSIngestion:
    """Download and store NASA FIRMS active fire data."""

    BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

    async def fetch_fires(self, source: str = "MODIS_NRT", days: int = 1,
                          area: str = "68,6,98,38") -> List[Dict]:
        """Fetch active fire data from NASA FIRMS API."""
        query_days = min(5, max(1, days))
        if area == "world":
            area = "68,6,98,38"
        url = f"{self.BASE_URL}/{settings.FIRMS_MAP_KEY}/{source}/{area}/{query_days}"
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
                    query = supabase.table("fire_records").insert(batch)
                    await asyncio.to_thread(query.execute)
                    batch = []
            except Exception as e:
                logger.error(f"Error processing fire record: {e}")

        if batch:
            query = supabase.table("fire_records").insert(batch)
            await asyncio.to_thread(query.execute)

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
                            query = supabase.table("meteorological_data").insert(batch)
                            await asyncio.to_thread(query.execute)
                            total_ingested += len(batch)
                            batch = []

            if batch:
                query = supabase.table("meteorological_data").insert(batch)
                await asyncio.to_thread(query.execute)
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
    """Download INSAT-3D AOD data from MOSDAC and ingest it."""

    BASE_URL = "https://mosdac.gov.in"
    DATASET_ID = "3DIMG_L2G_AOD"

    async def fetch_aod(self, target_date: str) -> int:
        """Fetch INSAT-3D Level-2 AOD product from MOSDAC, aggregate to daily mean, and store in DB."""
        import os
        import tempfile
        import shutil
        import xarray as xr

        # 1. Obtain Access Token
        token_url = f"{self.BASE_URL}/download_api/gettoken"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(token_url, json={
                    "username": settings.MOSDAC_USERNAME,
                    "password": settings.MOSDAC_PASSWORD
                }) as resp:
                    if resp.status != 200:
                        logger.error(f"MOSDAC authentication failed: {resp.status} - {await resp.text()}")
                        return 0
                    tokens = await resp.json()
                    access_token = tokens.get("access_token")
        except Exception as e:
            logger.error(f"Error getting MOSDAC token: {e}")
            return 0

        # 2. Search for entries
        search_url = f"{self.BASE_URL}/apios/datasets.json"
        search_params = {
            "datasetId": self.DATASET_ID,
            "startTime": target_date,
            "endTime": target_date
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, params=search_params) as resp:
                    if resp.status != 200:
                        logger.error(f"MOSDAC search failed: {resp.status} - {await resp.text()}")
                        return 0
                    search_data = await resp.json()
                    entries = search_data.get("entries", [])
        except Exception as e:
            logger.error(f"Error searching MOSDAC dataset: {e}")
            return 0

        if not entries:
            logger.warning(f"No MOSDAC AOD entries found for {target_date}")
            return 0

        logger.info(f"Found {len(entries)} MOSDAC AOD files for {target_date}. Starting download...")

        # 3. Download files to safe temp directory
        temp_dir = tempfile.mkdtemp()
        download_url = f"{self.BASE_URL}/download_api/download"
        downloaded_paths = []

        try:
            async with aiohttp.ClientSession() as session:
                for entry in entries:
                    record_id = entry.get("id")
                    identifier = entry.get("identifier")
                    headers = {"Authorization": f"Bearer {access_token}"}
                    
                    try:
                        async with session.get(download_url, headers=headers, params={"id": record_id}) as resp:
                            if resp.status == 200:
                                filepath = os.path.join(temp_dir, identifier)
                                with open(filepath, "wb") as f:
                                    f.write(await resp.read())
                                downloaded_paths.append(filepath)
                                logger.info(f"Downloaded {identifier}")
                            else:
                                logger.warning(f"Failed to download {identifier}: {resp.status}")
                    except Exception as e:
                        logger.error(f"Error downloading {identifier}: {e}")

            if not downloaded_paths:
                logger.error("No AOD files were successfully downloaded.")
                return 0

            # 4. Load and aggregate files using xarray
            logger.info("Aggregating AOD frames to daily mean...")
            aod_arrays = []
            for filepath in downloaded_paths:
                try:
                    ds = xr.open_dataset(filepath, engine="netcdf4")
                    # Slice to India bounds: Latitude descending (38 to 6), Longitude ascending (68 to 98)
                    ds_india = ds.sel(latitude=slice(38.0, 6.0), longitude=slice(68.0, 98.0))
                    # Squeeze the time dimension if it exists to make it a 2D array
                    aod_2d = ds_india['AOD'].squeeze('time', drop=True)
                    aod_arrays.append(aod_2d.load())
                    ds.close()
                except Exception as e:
                    logger.error(f"Error loading/processing AOD file {filepath}: {e}")

            if not aod_arrays:
                logger.error("No AOD data was successfully loaded.")
                return 0

            # Concatenate along time_of_day and average
            aod_concat = xr.concat(aod_arrays, dim='time_of_day')
            aod_daily_mean = aod_concat.mean(dim='time_of_day', skipna=True)

            # 5. Ingest daily mean to Supabase
            return await self.ingest_daily_mean(aod_daily_mean, target_date)

        finally:
            # Clean up temp folder
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.warning(f"Error cleaning up temporary directory: {e}")

    async def ingest_daily_mean(self, aod_mean, observed_date: str) -> int:
        """Ingest the aggregated daily mean AOD array into Supabase."""
        try:
            batch = []
            lats = aod_mean.latitude.values
            lons = aod_mean.longitude.values
            aod_data = aod_mean.values

            inserted = 0
            for i, lat in enumerate(lats):
                for j, lon in enumerate(lons):
                    val = float(aod_data[i, j])
                    # Valid range checks (val == val checks for NaN)
                    if val == val and 0 <= val <= 5:
                        batch.append({
                            "source": "INSAT-3D",
                            "observed_date": observed_date,
                            "latitude": round(float(lat), 4),
                            "longitude": round(float(lon), 4),
                            "aod_550nm": round(val, 4),
                        })
                        if len(batch) >= 500:
                            query = supabase.table("satellite_aod").insert(batch)
                            await asyncio.to_thread(query.execute)
                            inserted += len(batch)
                            batch = []

            if batch:
                query = supabase.table("satellite_aod").insert(batch)
                await asyncio.to_thread(query.execute)
                inserted += len(batch)

            logger.info(f"Ingested {inserted} daily mean AOD records into satellite_aod")
            return inserted
        except Exception as e:
            logger.error(f"Error ingesting daily mean AOD: {e}")
            return 0


async def run_full_ingestion(target_date: str):
    """Run complete data ingestion pipeline for a given date."""
    logger.info(f"Starting full ingestion for {target_date}")

    cpcb = CPCBIngestion()
    tropomi = TROPOMIIngestion()
    firms = FIRMSIngestion()
    era5 = ERA5Ingestion()
    mosdac = MOSDACIngestion()

    async def run_cpcb():
        try:
            logger.info("Starting CPCB ingestion task...")
            stations = await cpcb.fetch_station_list()
            if stations:
                await cpcb.ingest_stations(stations)
                # Ingest observations for the first 15 stations to keep it optimized
                for stn in stations[:15]:
                    stn_id = stn.get("id", stn.get("station_id"))
                    if stn_id:
                        obs = await cpcb.fetch_observations(stn_id, target_date, target_date)
                        if obs:
                            await cpcb.ingest_observations(stn_id, obs)
            logger.info("CPCB Ingestion task completed")
        except Exception as e:
            logger.error(f"CPCB Ingestion task failed: {e}")

    # Ingest in parallel where possible
    tasks = [
        run_cpcb(),
        firms.ingest_modis(days=1),
        firms.ingest_viirs(days=1),
        mosdac.fetch_aod(target_date),
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

    # Run spatial analytics on the ingested data
    logger.info("Starting analytical pipelines...")
    try:
        from app.ml.hcho_hotspot import HCHOHotspotDetector
        detector = HCHOHotspotDetector()
        await detector.detect_hotspots(target_date, target_date, season="monsoon" if "06" <= target_date[5:7] <= "09" else "annual")
    except Exception as e:
        logger.error(f"HCHO Hotspot Detection failed: {e}")

    try:
        from app.ml.correlation_transport import FireHCHOAnalyzer, TransportAnalyzer
        analyzer = FireHCHOAnalyzer()
        await analyzer.run_correlation_analysis(target_date, target_date, season="monsoon" if "06" <= target_date[5:7] <= "09" else "annual")
        
        transport = TransportAnalyzer()
        await transport.analyze_transport(target_date)
    except Exception as e:
        logger.error(f"Fire-HCHO Correlation or Transport Analysis failed: {e}")

    logger.info("Full ingestion pipeline completed")
