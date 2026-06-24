# 🛰️ Data Sources & Ingestion Pipelines

How AeroVision acquires, processes, and stores satellite, ground, and meteorological data.

---

## Data Sources Overview

| Source | API/Portal | Variables | Frequency | Pipeline Class |
|---|---|---|---|---|
| **CPCB India** | `airquality.cpcb.gov.in` | PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃ | Hourly | `CPCBIngestion` |
| **NASA FIRMS** | `firms.modaps.eosdis.nasa.gov` | FRP, brightness, confidence | Near real-time | `FIRMSIngestion` |
| **ESA Sentinel-5P** | Google Earth Engine | NO₂, SO₂, CO, O₃, HCHO columns | Daily | `TROPOMIIngestion` |
| **ECMWF ERA5** | Copernicus CDS | Wind (u/v), T2m, RH, PBL height, precipitation | 6-hourly | `ERA5Ingestion` |
| **ISRO INSAT-3D** | MOSDAC | AOD (550nm) | Sub-daily | `MOSDACIngestion` |

---

## Pipeline Architecture

All pipelines are defined in `backend/app/pipelines/data_ingestion.py` (581 lines).

### Orchestration

```python
async def run_full_ingestion(target_date: str):
    """Run complete data ingestion pipeline for a given date."""
    # Runs all pipelines in parallel via asyncio.gather()
```

This function launches FIRMS (MODIS + VIIRS), MOSDAC AOD, and all 5 TROPOMI products concurrently.

---

## Pipeline Details

### 1. CPCB Ground Stations (`CPCBIngestion`)

**Source:** CPCB Air Quality API  
**Target Tables:** `cpcb_stations`, `cpcb_observations`

**Process:**
1. Fetch station list from CPCB API
2. Upsert station metadata (29 stations with lat/lon, city, state)
3. For each station, fetch hourly observations
4. Auto-compute AQI using `aqi_engine.py` (India NAQI breakpoints)
5. Batch upsert to `cpcb_observations` (100 records per batch)

**Key Detail:** AQI is computed at ingestion time — not on-the-fly. The `compute_aqi()` function calculates sub-indices for all 7 pollutants and takes the maximum as the overall AQI.

---

### 2. TROPOMI Satellite Products (`TROPOMIIngestion`)

**Source:** Google Earth Engine (Sentinel-5P TROPOMI L3 daily composites)  
**Target Table:** `tropomi_products`  
**Products:** NO₂, SO₂, CO, O₃, HCHO

**Process:**
1. Initialize GEE via service account credentials
2. Call product-specific extraction function (`get_tropomi_no2()`, etc.)
3. Extract to 0.1° × 0.1° grid over India
4. Batch insert to `tropomi_products` (500 records per batch)

**Quality Filters:**
- QA value ≥ 0.75
- Cloud fraction ≤ 0.3

---

### 3. NASA FIRMS Active Fires (`FIRMSIngestion`)

**Source:** NASA FIRMS REST API (CSV format)  
**Target Table:** `fire_records`  
**Sources:** MODIS_NRT, VIIRS_SNPP_NRT

**Process:**
1. Fetch CSV from FIRMS API with area bounds `68,6,98,38` (India)
2. Parse CSV into records
3. Filter to India geographic bounds (lat 6–38, lon 68–98)
4. Construct datetime from `acq_date` + `acq_time`
5. Batch insert (500 per batch)

**API URL Pattern:**
```
https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAYS}
```

**Rate Limits:** 10 requests/minute, daily download quota.

---

### 4. ERA5 Reanalysis Weather (`ERA5Ingestion`)

**Source:** Copernicus CDS API → NetCDF files  
**Target Table:** `meteorological_data`

**Process:**
1. Download ERA5 single-level reanalysis via `cdsapi` for India bounds (N:38, W:68, S:6, E:98)
2. Variables: 10m u/v wind, 2m temperature, dewpoint, PBL height, precipitation, surface pressure
3. Time steps: 00:00, 06:00, 12:00, 18:00 UTC
4. Parse NetCDF with `xarray`, subsample every 4th grid point
5. Compute derived fields: wind speed = √(u² + v²), wind direction = atan2(-u, -v)
6. Batch insert (500 per batch)

**Special Handling:** Files in paths with emoji characters (e.g., `💖`) are automatically copied to a safe temp directory before xarray loading.

---

### 5. MOSDAC INSAT-3D AOD (`MOSDACIngestion`)

**Source:** MOSDAC download API  
**Target Table:** `satellite_aod`  
**Dataset:** `3DIMG_L2G_AOD`

**Process:**
1. Authenticate with MOSDAC (username/password → access token)
2. Search for AOD entries for target date
3. Download all files to temp directory
4. Load with xarray, slice to India bounds (lat 38→6, lon 68→98)
5. Squeeze time dimension, concatenate along `time_of_day`
6. Compute daily mean AOD
7. Filter valid range (0–5), batch insert

**Standalone Downloader:** The `mdapi.py` (779 lines) in the project root is a separate CLI tool for bulk MOSDAC downloads with pagination, retry logic, progress bars, and organize-by-date folder structure.

---

## Data Quality Standards

| Filter | Threshold | Applied To |
|---|---|---|
| Cloud fraction | > 0.3 rejected | TROPOMI, MOSDAC |
| TROPOMI QA flag | < 0.75 rejected | TROPOMI products |
| AOD valid range | 0–5 | INSAT-3D AOD |
| Geographic bounds | Lat 6–38, Lon 68–98 | All spatial data |
| NaN check | `val != val` | ERA5, AOD |

---

## Running Pipelines Manually

From the backend, you can trigger ingestion via the Python API:

```python
from app.pipelines.data_ingestion import run_full_ingestion
import asyncio

asyncio.run(run_full_ingestion("2026-06-24"))
```

Or run individual pipelines:

```python
from app.pipelines.data_ingestion import FIRMSIngestion
firms = FIRMSIngestion()
asyncio.run(firms.ingest_modis(days=1))
```

---

**← [[API Reference]]** | **Next: [[ML Models & Algorithms]] →**
