# 📦 Installation & Setup

Complete guide to setting up AeroVision for local development.

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Python** | 3.11+ | Required for backend |
| **Node.js** | 20+ | Required for frontend |
| **npm** | 10+ | Comes with Node.js |
| **Git** | Latest | Version control |
| **Supabase Account** | Free tier OK | PostgreSQL + PostGIS |
| **GEE Service Account** | — | Required for TROPOMI satellite data |

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/aero-vision.git
cd aero-vision
```

---

## 2. Backend Setup

### 2.1 Create Virtual Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate
```

### 2.2 Install Dependencies

```bash
pip install -r requirements.txt
```

The project has **64 Python dependencies** organized into these groups:

| Category | Key Packages |
|---|---|
| API Framework | `fastapi`, `uvicorn`, `python-multipart` |
| Database | `supabase`, `asyncpg`, `sqlalchemy`, `geoalchemy2` |
| Geospatial | `earthengine-api`, `rasterio`, `geopandas`, `xarray`, `netCDF4`, `shapely`, `pyproj`, `gdal` |
| Machine Learning | `scikit-learn`, `xgboost`, `numpy`, `pandas`, `scipy` |
| Deep Learning | `tensorflow`, `torch`, `torchvision` |
| Data Ingestion | `requests`, `aiohttp`, `cdsapi`, `beautifulsoup4` |
| Spatial Statistics | `libpysal`, `esda`, `pointpats` |
| PDF Generation | `reportlab`, `markdown` |
| Utilities | `pydantic`, `loguru`, `httpx`, `orjson`, `tqdm` |

> ⚠️ **GDAL Installation Note**: `gdal==3.10.0` requires system-level GDAL libraries. On Windows, consider using [prebuilt wheels from Christoph Gohlke's archive](https://github.com/cgohlke/geospatial-wheels/) or install via conda:
> ```bash
> conda install -c conda-forge gdal=3.10
> ```

### 2.3 Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your credentials
# See the "Environment Variables & API Keys" wiki page for details
```

See [[Environment Variables & API Keys]] for detailed instructions on obtaining each credential.

### 2.4 Set Up GEE Credentials

1. Place your Google Earth Engine service account JSON file in `backend/credentials/`
2. Update `GEE_SERVICE_ACCOUNT_PATH` in `.env` to point to it

### 2.5 Start the Backend Server

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2.6 Verify Backend is Running

| Endpoint | URL |
|---|---|
| Swagger UI | http://127.0.0.1:8000/api/docs |
| ReDoc | http://127.0.0.1:8000/api/redoc |
| Health Check | http://127.0.0.1:8000/api/health |

Expected health check response:
```json
{
  "status": "healthy",
  "version": "1.2.0"
}
```

---

## 3. Frontend Setup

### 3.1 Install Dependencies

```bash
cd frontend
npm install
```

### 3.2 Configure Environment

```bash
# Copy the example env file
cp .env.example .env
```

Set the API base URL in `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

### 3.3 Start Development Server

```bash
npm run dev
```

The frontend will be available at: **http://localhost:5173**

### 3.4 Production Build

```bash
npm run build
# Output is in frontend/dist/
```

---

## 4. Database Setup (Supabase)

### 4.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** from Settings → API

### 4.2 Enable PostGIS Extension

In the Supabase SQL editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4.3 Run Schema Migrations

Check the `backend/supabase/` directory for SQL migration files. Run them in order via the Supabase SQL editor.

The project uses **16 tables** — see [[Database Schema]] for complete details.

### 4.4 Seed Initial Data

After running ingestion pipelines, the following tables should have data:

| Table | Expected Records | Source |
|---|---|---|
| `cpcb_stations` | ~29 | CPCB station metadata |
| `cpcb_observations` | 200+ | Hourly AQI readings |
| `tropomi_products` | 2,500+ | TROPOMI satellite columns |
| `fire_records` | 40+ | NASA FIRMS fire detections |
| `meteorological_data` | 6,000+ | ERA5 weather grids |

---

## 5. Running the Full Stack

Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Navigate to **http://localhost:5173** to see the AeroVision dashboard.

---

## Common Installation Issues

| Issue | Solution |
|---|---|
| `ModuleNotFoundError: No module named 'gdal'` | Install GDAL via conda or use prebuilt wheels (see section 2.2) |
| `error: Microsoft Visual C++ 14.0 or greater is required` | Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| `xarray` / `netCDF4` import errors | Ensure `libnetcdf` is installed; on Windows use `conda install netcdf4` |
| Supabase `ENOTFOUND` error | Verify `SUPABASE_URL` includes `https://` prefix and is a valid Supabase project URL |
| NetCDF loading fails with emoji characters in path | The `ERA5Ingestion` class handles this automatically via `tempfile` — ensure write access to system temp directory |
| `npm install` fails on `three` types | Run `npm install --legacy-peer-deps` if peer dependency conflicts occur |
| Port 8000 already in use | Kill existing processes: `netstat -ano \| findstr :8000` then `taskkill /PID <pid> /F` |

---

**Next:** [[Environment Variables & API Keys]] →
