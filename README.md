<h1 align="center">
  <br/>
  🛰️ AeroVision
  <br/>
</h1>

<h4 align="center">
  India's Premier Geospatial Atmospheric Intelligence Platform
</h4>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/Version-1.2.0-7c3aed?style=flat-square"/>
  <img alt="FastAPI" src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi"/>
  <img alt="React" src="https://img.shields.io/badge/Frontend-React%2019-61dafb?style=flat-square&logo=react"/>
  <img alt="TailwindCSS" src="https://img.shields.io/badge/Styling-Tailwind%20v4-06b6d4?style=flat-square&logo=tailwindcss"/>
  <img alt="Supabase" src="https://img.shields.io/badge/Database-Supabase-3ecf8e?style=flat-square&logo=supabase"/>
  <img alt="Status" src="https://img.shields.io/badge/Status-Live%20Production-10b981?style=flat-square"/>
</p>

<p align="center">
  AeroVision is a full-stack, real-time geospatial intelligence platform for atmospheric monitoring, air quality analysis, and public health risk assessment across the Indian subcontinent. It fuses satellite telemetry (NASA FIRMS, ESA TROPOMI/Sentinel-5P), CPCB ground sensor networks, and AI/ML models into a single premium command-center interface.
</p>

---

## ✨ Features at a Glance

| Module | Description |
|---|---|
| 🌍 **AQI Overview** | National air quality index coverage from 29 real CPCB ground stations with spatial interpolation maps |
| 📊 **Pollutant Maps** | Per-pollutant concentration charts for PM2.5, PM10, NO2, SO2, CO, O3 against CPCB NAQI safety limits |
| 🏥 **Health Impact System** | Real-time public health exposure risk scoring (0–100) combining AQI, active fires, and HCHO column density |
| 🔥 **HCHO Hotspots** | TROPOMI satellite HCHO column density anomaly detection using DBSCAN, Getis-Ord Gi* and Moran's I algorithms |
| 🛰️ **Fire Correlation** | NASA FIRMS active fire radiative power (FRP) data with HCHO emission correlation and Pearson coefficient analysis |
| 💨 **Transport Analysis** | Wind vector field visualization, Lagrangian back-trajectory analysis, and inter-regional pollutant source attribution |
| 🌦️ **Weather Dynamics** | 7-day FourCastNet AI weather forecasts with boundary layer height, temperature, wind and humidity grid layers |
| 🧠 **AI Insights** | Google Gemini-powered automated scientific anomaly detection, executive summaries, and domain-specific alerts |
| 📝 **Research Reports** | Peer-quality PDF scientific reports with watermark, auto-generated sections, and instant download |
| 🔄 **Real-Time Sync** | 15-second auto-refresh engine with live API latency tracking and "Last Sync" elapsed counter in the header |

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

The `IndiaMap2D` component renders a full interactive Leaflet map locked to the Indian subcontinent (`maxBounds: [[5.0, 65.0], [38.5, 99.0]]`) using the CARTO Voyager light tile layer. It supports:

- **Smooth mode** — pure IDW-interpolated continuous raster overlay (50×50 canvas pixel grid)
- **Hybrid mode** — overlay combined with station markers (default)
- **Grid mode** — raw observation points only
- **Wind arrows** — rotated SVG direction arrows sized by wind speed
- **Tooltips** — station name, state, measured value, wind speed & direction

The 3D globe (`IndiaMap3D`) is powered by Three.js with an orthographic projection and animated orbit controls.

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

## ⚡ Real-Time Sync Engine

All data panels refresh automatically without requiring a page reload:

1. **Axios Interceptor Timing** — every API request records `Date.now()` at dispatch and calculates round-trip duration on response, broadcasting it via a custom `api-latency` DOM event.
2. **Live Header Indicators** — the app header shows the actual measured `Server Latency` (e.g. `14ms`) and a "Last Sync" counter that ticks (`Just Now` → `5s ago` → `1m 3s ago`) and resets on every fresh data load.
3. **Auto-Refresh Toggle** — a pill toggle in the header dispatches a `refresh-active-dashboard` event every **15 seconds** to all mounted dashboard components, which silently re-fetch their data in the background.

---

## 🔧 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| API Framework | FastAPI 0.115 + Uvicorn |
| Language | Python 3.11+ |
| Database | Supabase (PostgreSQL + PostGIS) |
| Geospatial | GeoPandas, Rasterio, Shapely, pyproj, GEE |
| ML/AI | scikit-learn, XGBoost, TensorFlow, PyTorch |
| Data Ingestion | NASA FIRMS, CDS/ERA5, TROPOMI/Sentinel-5P |
| Spatial Stats | PySAL (libpysal, esda — DBSCAN, Getis-Ord, Moran's I) |
| PDF | ReportLab |
| Logging | Loguru |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet + react-leaflet (2D), Three.js (3D) |
| Charts | Recharts (Area, Line, Bar, Radar) |
| HTTP Client | Axios with interceptor-level latency tracking |
| Design System | Atmospheric Intelligence (Stitch — glassmorphic dark theme) |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- A Supabase project (URL + anon key)
- Google Earth Engine service account credentials

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/aero-vision.git
cd aero-vision
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
| `GET` | `/api/hcho/hotspots` | Spatial anomaly cluster data |
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

## 🗄️ Database Schema (Supabase)

| Table | Description |
|---|---|
| `cpcb_stations` | 29 real CPCB monitoring nodes with lat/lon, city, state |
| `aqi_observations` | Daily/hourly AQI readings per station |
| `tropomi_products` | 1000 TROPOMI HCHO column measurements |
| `fire_records` | 45 NASA FIRMS active fire detections (geocoded to Indian states) |
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
| ESA Sentinel-5P / TROPOMI | HCHO column density (L2 product) | Daily |
| ECMWF ERA5 | Wind fields, boundary layer height | 6-hourly |
| NVIDIA FourCastNet | 7-day AI weather forecast grids | On-demand |

---

## 📄 License

This project is developed for the **Indian Space Research Organisation (ISRO SAC)** atmospheric science research program. All rights reserved. Refer to project documentation for data usage and redistribution policies.

---

<p align="center">
  Built with ❤️ for India's atmospheric intelligence mission · AeroVision V1.2.0-Production
</p>
