<h1 align="center">
  <br/>
  🛰️ AeroVision — Backend Service
  <br/>
</h1>

<p align="center">
  The core API engine powering the AeroVision geospatial intelligence platform.
</p>

## Overview

This backend is built on **FastAPI (Python 3.11+)** and serves as the data ingestion, ML inference, and spatial analysis hub for the AeroVision dashboard. It connects to external satellite data providers (NASA FIRMS, ESA Sentinel-5P, ECMWF ERA5), processes large geospatial datasets (NetCDF, GeoJSON), leverages AI APIs (Google Gemini, NVIDIA FourCastNet), and synchronizes data to a PostgreSQL/PostGIS database hosted on **Supabase**.

---

## 🏗️ Technology Stack

- **Framework:** FastAPI, Uvicorn
- **Database:** Supabase (PostgreSQL with PostGIS), asyncpg, SQLAlchemy 2.0, GeoAlchemy2
- **Geospatial Processing:** GeoPandas, Rasterio, Shapely, pyproj, xarray, netCDF4, Google Earth Engine API
- **Machine Learning & Stats:** scikit-learn, XGBoost, PySAL (libpysal, esda)
- **Data Ingestion:** httpx, aiohttp, cdsapi (Copernicus Climate Data Store)
- **Reporting:** ReportLab (for PDF generation), Markdown
- **Validation & Settings:** Pydantic V2

---

## 🗂️ Module Architecture

The application code lives inside `app/` and follows a clear **Router -> Service -> Database** pattern:

### 1. **Routers (`app/routers/`)**
Expose the REST API endpoints to the frontend.
- `aqi.py` — Endpoints for CPCB surface AQI observations.
- `hcho.py` — Endpoints for TROPOMI HCHO spatial anomaly clusters.
- `fire.py` — Endpoints for NASA FIRMS active fire records & correlation logic.
- `transport.py` — Endpoints for wind fields and trajectory attribution.
- `weather.py` — Endpoints for querying NVIDIA's FourCastNet API.
- `insights.py` — Endpoints for Gemini AI-generated executive summaries.
- `reports.py` — Endpoints to generate and download watermark-stamped PDF reports.

### 2. **Services (`app/services/`)**
Contains the business logic, external API integrations, and heavy geospatial operations.
- `aqi_service.py`
- `hcho_service.py`
- `fire_service.py`
- `transport_service.py` — Parses `era5.nc` NetCDF files.
- `fourcastnet_service.py`
- `insights_service.py`
- `report_service.py`

### 3. **Configuration & Core**
- `main.py` — FastAPI application lifecycle, CORS, and router registration.
- `config.py` — Centralized Pydantic settings loading from `.env`.
- `database.py` — Async database dependency injection for Supabase.
- `schemas.py` — Pydantic models for request validation and response serialization.

---

## ⚙️ Environment Configuration

Create a `.env` file in the root of the `backend` directory based on `.env.example`:

```env
# ── Supabase ──
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# ── Google Earth Engine ──
GEE_PROJECT_ID=your-gcp-project-id
GEE_SERVICE_ACCOUNT_PATH=/path/to/gee-credentials.json

# ── Application ──
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ── External APIs ──
FIRMS_MAP_KEY=your-nasa-firms-key
CDS_API_KEY=your-cds-api-key
CDS_API_URL=https://cds.climate.copernicus.eu/api
DATA_GOV_IN_API_KEY=your-data-gov-in-key
GEMINI_API_KEY=your-gemini-api-key
NVIDIA_API_KEY=your-nvidia-fourcastnet-api-key
```

---

## 🚀 Getting Started

1. **Virtual Environment Setup**
   ```bash
   python -m venv venv
   source venv/bin/activate       # On Linux/macOS
   # .\venv\Scripts\activate      # On Windows
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Development Server**
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **API Documentation**
   Once running, you can access the interactive API docs at:
   - **Swagger UI:** `http://127.0.0.1:8000/api/docs`
   - **ReDoc:** `http://127.0.0.1:8000/api/redoc`

---

## 🛰️ Key Workflows

- **HCHO Anomaly Detection:** The system downloads Sentinel-5P L2 products, extracts column density values, and uses **DBSCAN** spatial clustering in `hcho_service.py` to identify dangerous exposure hotspots.
- **Fire Correlation:** The `fire_service.py` maps NASA FIRMS fire radiative power (FRP) points against AQI/HCHO data to compute dynamic Pearson correlation coefficients for the Health Impact Warning System.
- **Wind Vector Processing:** ECMWF ERA5 NetCDF files (`.nc`) are processed using `xarray` to extract u/v wind components, generating dynamic wind arrows on the frontend maps.
- **Automated Insights:** `insights_service.py` gathers current state data from the DB, formats it as a structured prompt, and queries Google Gemini for scientific anomaly detection and safety alerts.
