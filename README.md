<h1 align="center">
  <br/>
  🛰️ AeroVision
  <br/>
</h1>

<h4 align="center">
  India's Premier Geospatial Atmospheric Intelligence Platform
</h4>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/Version-1.2.1-7c3aed?style=flat-square"/>
  <img alt="FastAPI" src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi"/>
  <img alt="React" src="https://img.shields.io/badge/Frontend-React%2019-61dafb?style=flat-square&logo=react"/>
  <img alt="Three.js" src="https://img.shields.io/badge/3D%20WebGL-Three.js-black?style=flat-square&logo=three.js"/>
  <img alt="Supabase" src="https://img.shields.io/badge/Database-Supabase%20%2B%20SQLite%20Fallback-3ecf8e?style=flat-square&logo=supabase"/>
  <img alt="Status" src="https://img.shields.io/badge/Status-Live%20Production-10b981?style=flat-square"/>
</p>

<p align="center">
  <strong>🚀 Live Web Application:</strong> <a href="https://aero-vision-chi.vercel.app/">https://aero-vision-chi.vercel.app/</a><br/>
  <strong>⚡ Production API Endpoint:</strong> <a href="https://aero-vision.onrender.com/api/health">https://aero-vision.onrender.com/api</a>
</p>

<p align="center">
  <strong>Lead Developer / Student Researcher:</strong> Aaryan Kasaudhan (<a href="mailto:aaryankasaudhan91@gmail.com">aaryankasaudhan91@gmail.com</a>)<br/>
  <em>Academic Student Research Project · Non-Commercial Open Science Demonstration</em>
</p>

<p align="center">
  AeroVision is a full-stack, real-time geospatial intelligence platform for atmospheric monitoring, air quality analysis, and public health risk assessment across the Indian subcontinent. It fuses satellite telemetry (NASA FIRMS, ESA TROPOMI/Sentinel-5P NRTI), CPCB ground sensor networks, and AI/ML spatial models into a high-performance command-center interface.
</p>

---

## ✨ Features at a Glance

| Module | Description |
|---|---|
| 🌍 **AQI Overview** | National air quality coverage from 29 CPCB ground stations with spatial IDW interpolation and continuous wind streamlines |
| 📊 **Pollutant Maps** | Per-pollutant concentration charts for PM2.5, PM10, NO2, SO2, CO, O3 evaluated against CPCB NAQI safety standards |
| 🏥 **Health Impact System** | Real-time public health exposure risk scoring (0–100) combining ground AQI, active fires, and satellite HCHO density |
| 🔥 **HCHO Hotspots & Real-Time Stream** | TROPOMI satellite HCHO column density anomaly detection (DBSCAN, Getis-Ord Gi*, Moran's I) with **live telemetry polling (`/api/hcho/live`)** and ranked active clusters |
| 🌐 **Interactive 2D/3D Mapping** | Dual-engine mapping: Leaflet 2D with IDW raster overlay + Three.js 3D WebGL with India vector boundary masking, continuous animated atmospheric wind streamlines, smooth camera lerp, and full-screen portal |
| 🛰️ **Fire Correlation** | NASA FIRMS active fire radiative power (FRP) data with HCHO emission correlation and Pearson coefficient analysis |
| 💨 **Transport Analysis** | ERA5 wind vector field visualization, Lagrangian back-trajectory analysis, and inter-regional pollutant source attribution |
| 🌦️ **Weather Dynamics** | 7-day FourCastNet AI weather forecasts with boundary layer height, temperature, wind, and humidity layers |
| 🧠 **AI Insights** | Google Gemini-powered automated scientific anomaly detection, executive summaries, and domain-specific advisories |
| 📝 **Research Reports** | Peer-quality PDF scientific reports with auto-generated methodology, analysis charts, and instant export |
| 🔄 **Real-Time Sync Engine** | Header telemetry indicator, 15-second dashboard refresh, and dedicated 5s/10s/30s live stream polling cadence |
| 🛡️ **Resilient Hybrid Database** | Cloud Supabase (PostgreSQL + PostGIS) with seamless offline fallback to embedded SQLite (`aerovision.db`) |

---

## 🚀 Live Production Links

| Service | Host | URL |
|---|---|---|
| 🌐 **Frontend Application** | Vercel Edge CDN | [https://aero-vision-chi.vercel.app/](https://aero-vision-chi.vercel.app/) |
| ⚡ **Backend REST API** | Render Cloud | [https://aero-vision.onrender.com](https://aero-vision.onrender.com) |
| 📚 **Interactive Swagger API Docs** | Render Cloud | [https://aero-vision.onrender.com/docs](https://aero-vision.onrender.com/docs) |
| 🗄️ **Geospatial Database** | Supabase Cloud (PostGIS) | AWS ap-south-1 (Mumbai) |

---

## 🏗️ Architecture

```
aero-vision/
├── backend/                        # Python FastAPI service
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint & CORS config
│   │   ├── config.py               # Settings & environment management
│   │   ├── database.py             # Supabase async client
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── routers/                # REST API endpoints
│   │   │   ├── aqi.py              # AQI surface observations
│   │   │   ├── hcho.py             # TROPOMI HCHO satellite data
│   │   │   ├── fire.py             # NASA FIRMS active fires
│   │   │   ├── transport.py        # Wind vector & trajectory
│   │   │   ├── weather.py          # FourCastNet forecast grids
│   │   │   ├── insights.py         # AI-generated alerts
│   │   │   └── reports.py          # PDF report generation
│   │   ├── services/               # Business logic & DB queries
│   │   │   ├── aqi_service.py
│   │   │   ├── hcho_service.py
│   │   │   ├── fire_service.py
│   │   │   ├── transport_service.py
│   │   │   ├── fourcastnet_service.py
│   │   │   ├── insights_service.py
│   │   │   └── report_service.py
│   │   ├── ml/                     # ML model training & inference
│   │   ├── geospatial/             # Spatial analysis utilities
│   │   └── pipelines/              # Data ingestion pipelines
│   └── requirements.txt
│
└── frontend/                       # React + Vite + TypeScript SPA
    ├── src/
    │   ├── App.tsx                 # Root app, routing, real-time sync engine
    │   ├── components/
    │   │   ├── Sidebar.tsx         # Navigation sidebar with collapse/expand
    │   │   ├── AqiDashboard.tsx    # AQI overview view
    │   │   ├── PollutantDashboard.tsx
    │   │   ├── HealthDashboard.tsx # Health Impact Early Warning System
    │   │   ├── HchoDashboard.tsx
    │   │   ├── FireDashboard.tsx
    │   │   ├── TransportDashboard.tsx
    │   │   ├── WeatherDashboard.tsx
    │   │   ├── InsightsDashboard.tsx
    │   │   ├── ReportsDashboard.tsx
    │   │   ├── IndiaMap.tsx        # 2D/3D map switcher
    │   │   ├── IndiaMap2D.tsx      # Leaflet map with IDW interpolation
    │   │   ├── IndiaMap3D.tsx      # Three.js 3D globe render
    │   │   └── FilterBar.tsx
    │   └── services/
    │       └── api.ts              # Centralized Axios client + latency events
    └── package.json
```

---

## 🗺️ Mapping Engine

AeroVision provides a dual-engine geospatial visualization stack:

### 2D Interactive GIS (`IndiaMap2D.tsx`)
Locked to the Indian subcontinent (`maxBounds: [[5.0, 65.0], [38.5, 99.0]]`) using the CARTO Voyager light tile layer:
- **Smooth Mode** — Continuous IDW (Inverse Distance Weighting) raster surface (50×50 pixel grid).
- **Hybrid Mode (Default)** — Continuous interpolated surface combined with interactive station markers.
- **Grid Mode** — Discrete observation points with NAQI-coded severity markers.
- **Continuous Wind Streamlines** — High-performance HTML5 Canvas streamline overlay (`WindStreamlinesOverlay.tsx`) rendering real-time vector velocity fields across India.
- **Station Tooltips & Cards** — Immediate telemetry readout on hover and click.

### 3D WebGL Atmospheric Canvas (`IndiaMap3D.tsx`)
Built on Three.js, offering a state-of-the-art interactive spatial experience:
- **Strict India Boundary Masking** — High-precision GeoJSON vector clipping focuses visual emphasis on sovereign borders, with surrounding subcontinental terrain rendered in subdued deep-slate relief.
- **Stationary by Default with Continuous Wind Flow** — Default view is locked stationary for stable observation while 320 continuous fluid atmospheric wind streamline particles flow dynamically according to regional meteorological vectors.
- **Smooth Camera Transitions (LERP)** — Smooth linear camera interpolation when focusing on specific stations or resetting perspectives.
- **Glowing 3D Station Pins & Extrusions** — Interactive 3D cylinders and pulsing beacon rings extruded in the Z-axis proportionally to AQI severity.
- **Edge-to-Edge Full-Screen Portal** — Modal portal allowing users to expand the 3D canvas to a distraction-free full-screen analytical environment.

---

## ⚡ Real-Time Streaming & Sync Engine

AeroVision features dual-tier real-time data synchronization:

1. **Live HCHO Telemetry Stream (`/api/hcho/live`)**:
   - Direct streaming integration for Sentinel-5P / TROPOMI NRTI Level-3 data.
   - **Real-Time Mode Toggle**: Switch between historic date analysis and continuous live telemetry.
   - **Configurable Cadence**: 5s, 10s, or 30s polling intervals with an animated countdown clock and "Syncing..." status.
   - **"⚡ Live Today" Preset**: Instant jump to the current UTC satellite pass.
   - **Live Event Feed Ticker**: Real-time activity stream displaying newly detected column density anomalies and high-severity hotspot alerts.
   - **Ranked Active Clusters Table**: Live table sorting detected anomalies by statistical significance ($Z$-score) and peak column density.

2. **Global Application Sync**:
   - **Axios Interceptor Timing**: Every API request records latency at dispatch, broadcasting round-trip ping times via custom `api-latency` DOM events.
   - **Live Header Diagnostics**: Real-time server latency indicator (e.g., `14ms`) and elapsed "Last Sync" counter (`Just Now` → `5s ago` → `1m ago`).
   - **Global Auto-Refresh**: Background 15-second refresh cycle for AQI, Weather, and Fire observation panels.

---

## 🏥 Health Impact Early Warning System

A flagship feature that calculates a **composite health exposure risk score (0–100)** for every CPCB-monitored city in real time:

```
Risk Score = base_aqi_risk(AQI) + fire_modifier(active_fires_in_state)
```

Where:
- `base_aqi_risk` maps the 0–500 AQI scale to a 0–100 risk index using tiered linear interpolation
- `fire_modifier` adds up to +10 points based on the count of NASA FIRMS active fires in the same state
- Scores are color-coded: 🟢 Good → 🟡 Moderate → 🟠 Severe → 🔴 Critical

The dashboard surfaces:
- **Hero Alert Banner** — flashes when any station exceeds risk score 70
- **Critical Exposure Zones** — top 5 most impacted cities with animated progress bars
- **Radial Gauge Widgets** — Respiratory Stress Index & Satellite Anomaly Index
- **Sensitive Group Advisories** — Asthma/COPD, Pediatric Care, Senior Citizens
- **Spatial Map** — geographic health risk distribution across India
- **30-Day Trend Chart** — Recharts area graph of population exposure trajectory

---

## 🔧 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| API Framework | FastAPI 0.115 + Uvicorn |
| Language | Python 3.11+ |
| Database | Supabase (PostgreSQL + PostGIS) with SQLite Local Fallback |
| Geospatial | GeoPandas, Rasterio, Shapely, pyproj, Google Earth Engine |
| ML/AI | scikit-learn, XGBoost, TensorFlow, PyTorch |
| Data Ingestion | NASA FIRMS, CDS/ERA5, Sentinel-5P NRTI TROPOMI |
| Spatial Stats | PySAL (libpysal, esda — DBSCAN, Getis-Ord Gi*, Moran's I) |
| PDF | ReportLab |
| Logging | Loguru |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet + react-leaflet (2D GIS), Three.js (3D WebGL Canvas) |
| Charts | Recharts (Area, Line, Bar, Radar) |
| HTTP Client | Axios with interceptor-level latency tracking |
| Design System | Atmospheric Intelligence (Stitch — glassmorphic dark theme) |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- A Supabase project (URL + anon key) or offline local SQLite fallback
- Google Earth Engine service account credentials (optional for live GEE fetch)

### 1. Clone the Repository

```bash
git clone https://github.com/aaryankasaudhan91-dev/Aero-Vision.git
cd Aero-Vision
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
source venv/bin/activate         # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL, keys, and API credentials

# Start the API server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at:
- **Swagger UI**: http://127.0.0.1:8000/api/docs
- **ReDoc**: http://127.0.0.1:8000/api/redoc
- **Health Check**: http://127.0.0.1:8000/api/health

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:8000/api

# Start dev server
npm run dev
```

The frontend will be available at: **http://localhost:5173**

### 4. Production Build

```bash
cd frontend
npm run build
# Output is in /dist
```

---

## 🌐 API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/aqi/` | AQI overview with observations for a date/state |
| `GET` | `/api/aqi/stations` | Active CPCB monitoring stations |
| `GET` | `/api/aqi/observations` | Raw ground sensor observations |
| `GET` | `/api/aqi/trends` | AQI time-series for charts |
| `GET` | `/api/hcho/` | HCHO hotspot overview |
| `GET` | `/api/hcho/live` | **Real-time Sentinel-5P NRTI streaming telemetry & active clusters** |
| `GET` | `/api/hcho/hotspots` | Spatial anomaly cluster data (DBSCAN, Getis-Ord, Moran's I) |
| `GET` | `/api/hcho/trends` | HCHO column density trends |
| `GET` | `/api/fire/` | Active fire overview |
| `GET` | `/api/fire/records` | NASA FIRMS fire detections |
| `GET` | `/api/fire/correlation` | Fire ↔ HCHO correlation analysis |
| `GET` | `/api/transport/wind-vectors` | ERA5 wind field grid |
| `GET` | `/api/transport/source-attribution` | Back-trajectory pollutant attribution |
| `GET` | `/api/weather/forecast` | FourCastNet AI weather grid |
| `GET` | `/api/insights/` | AI-generated environmental alerts |
| `POST` | `/api/insights/generate` | Trigger new Gemini AI insight generation |
| `POST` | `/api/reports/generate` | Generate & download a scientific PDF report |
| `GET` | `/api/health` | Service health check |

---

## 🗄️ Resilient Hybrid Database Architecture

AeroVision incorporates a fail-safe data persistence layer:

1. **Cloud Production Layer (Supabase PostgreSQL + PostGIS)**:
   - Full spatial indexing (`geometry(Point, 4326)`).
   - Real-time row subscriptions and centralized cloud persistence.
2. **Local Engine Fallback (`aerovision.db`)**:
   - High-performance embedded SQLite database managed by `LocalQueryExecutor`.
   - **Auto-Schema Evolution**: Dynamically adds missing statistical columns (`centroid_lat`, `centroid_lon`, `max_hcho`, `z_score`, `p_value`) at runtime.
   - Ensures continuous offline execution and uninterrupted academic demonstrations during network drops.

| Table | Description |
|---|---|
| `cpcb_stations` | 29 real CPCB monitoring nodes with lat/lon, city, state |
| `aqi_observations` | Daily/hourly AQI readings per station |
| `tropomi_products` | Sentinel-5P TROPOMI HCHO column measurements |
| `fire_records` | NASA FIRMS active fire detections (geocoded to Indian states) |
| `weather_forecasts` | FourCastNet model output grid |
| `ai_insights` | Gemini-generated alert records |
| `reports` | Generated report metadata & PDF storage |

---

## 📐 Design System — Atmospheric Intelligence

The UI is built on the **Atmospheric Intelligence** design system generated via Google Stitch:

- **Theme**: Glassmorphic dark (`#0b1326` base, `rgba(15,23,42,0.7)` glass cards)
- **Primary Color**: Cyan `#4cd7f6` (safe air quality signal)
- **Warning Color**: Amber `#ffb95f` (moderate risk)
- **Critical Color**: Red `#ef4444` (hazardous conditions)
- **Typography**: Geist (headings/data), Inter (body text)
- **Glass Effect**: `backdrop-filter: blur(16px)` + `1px solid rgba(255,255,255,0.1)` borders
- **Hover Lift**: Cards animate `translateY(-2px)` with intensified blur and border opacity

---

## 🔒 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/service role key |
| `GEMINI_API_KEY` | Google Gemini API key for AI insights |
| `GEE_SERVICE_ACCOUNT` | Google Earth Engine service account email |
| `GEE_KEY_PATH` | Path to GEE credentials JSON |
| `NASA_FIRMS_API_KEY` | NASA FIRMS active fire API key |
| `APP_ENV` | `development` or `production` |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL (e.g. `http://localhost:8000/api`) |

---

## 📊 Data Sources

| Source | Dataset | Update Frequency |
|---|---|---|
| CPCB India | Ground AQI observations (PM2.5, PM10, NO2, SO2, CO, O3) | Hourly |
| NASA FIRMS | Active fire radiative power (MODIS/VIIRS) | Near real-time |
| ESA Sentinel-5P / TROPOMI | HCHO column density (NRTI & Offline L2/L3 products) | Real-time stream / Daily |
| ECMWF ERA5 | Wind fields, boundary layer height | 6-hourly |
| NVIDIA FourCastNet | 7-day AI weather forecast grids | On-demand |

---

## 📄 License & Academic Attribution

This project is an **Academic Student Research Project** led by **Aaryan Kasaudhan** (<a href="mailto:aaryankasaudhan91@gmail.com">aaryankasaudhan91@gmail.com</a>) for educational, scientific, and non-commercial public interest research.

Atmospheric datasets are sourced from open satellite and public observation networks (ESA Copernicus Sentinel-5P, NASA FIRMS, CPCB India, and ECMWF). All rights to underlying satellite data belong to their respective agencies.

---

<p align="center">
  Built with ❤️ by Aaryan Kasaudhan for India's atmospheric intelligence mission · AeroVision V1.2.1
</p>
