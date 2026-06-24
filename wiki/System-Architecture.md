# 🏗️ System Architecture

Technical architecture overview of the AeroVision platform.

---

## High-Level Architecture

```
┌─────────────────┐     REST/JSON      ┌────────────────┐     SQL/PostGIS     ┌─────────────┐
│   React SPA     │ ◄────────────────► │   FastAPI       │ ◄────────────────► │  Supabase   │
│ Vite + TS       │     Port 5173      │   Uvicorn       │     Port 8000      │  PostgreSQL │
│ Tailwind v4     │                    │   Python 3.11   │                    │  + PostGIS  │
└─────────────────┘                    └────────┬───────┘                    └─────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                        ┌──────────┐     ┌──────────┐     ┌──────────┐
                        │  NASA    │     │  ESA     │     │  ECMWF  │
                        │  FIRMS   │     │  TROPOMI │     │  ERA5   │
                        └──────────┘     └──────────┘     └──────────┘
                              ▲                 ▲
                        ┌──────────┐     ┌──────────┐
                        │  CPCB    │     │  MOSDAC  │
                        │  Ground  │     │  INSAT   │
                        └──────────┘     └──────────┘
```

---

## Backend Architecture (`backend/app/`)

### Layer Structure

| Layer | Directory | Files | Responsibility |
|---|---|---|---|
| **API Routers** | `routers/` | 7 files | HTTP endpoints, request validation, response serialization |
| **Services** | `services/` | 7 files | Business logic, database queries, data aggregation |
| **ML Models** | `ml/` | 4 files | Statistical analysis, ML inference |
| **Pipelines** | `pipelines/` | 2 files | Automated data ingestion and preprocessing |
| **Geospatial** | `geospatial/` | 2 files | GEE scripts, spatial utilities |

### Routers → Services Mapping

| Router File | Service File | API Prefix |
|---|---|---|
| `aqi.py` | `aqi_service.py` (11.7KB) | `/api/aqi/` |
| `hcho.py` | `hcho_service.py` (12.7KB) | `/api/hcho/` |
| `fire.py` | `fire_service.py` (9.3KB) | `/api/fire/` |
| `transport.py` | `transport_service.py` (6.3KB) | `/api/transport/` |
| `weather.py` | `fourcastnet_service.py` (17KB) | `/api/weather/` |
| `insights.py` | `insights_service.py` (15.4KB) | `/api/insights/` |
| `reports.py` | `report_service.py` (29KB) | `/api/reports/` |

### ML Modules

| Module | File | Purpose |
|---|---|---|
| AQI Engine | `aqi_engine.py` (7.9KB) | India NAQI breakpoint calculation for 7 pollutants |
| HCHO Hotspot | `hcho_hotspot.py` (11.7KB) | DBSCAN, Getis-Ord Gi*, Moran's I, Percentile detection |
| Surface Estimation | `surface_estimation.py` (13.3KB) | CNN-LSTM satellite → surface AQI prediction |
| Correlation Transport | `correlation_transport.py` (9.1KB) | Fire-HCHO correlation, wind transport analysis |

### Data Pipeline Classes

| Class | Source | Target Table |
|---|---|---|
| `CPCBIngestion` | CPCB API | `cpcb_stations`, `cpcb_observations` |
| `TROPOMIIngestion` | Google Earth Engine | `tropomi_products` |
| `FIRMSIngestion` | NASA FIRMS CSV API | `fire_records` |
| `ERA5Ingestion` | Copernicus CDS (NetCDF) | `meteorological_data` |
| `MOSDACIngestion` | MOSDAC download API | `satellite_aod` |

---

## Frontend Architecture (`frontend/src/`)

### Component Tree

```
App.tsx (Root — routing, sync engine)
├── Sidebar.tsx (Navigation)
├── FilterBar.tsx (Date/state/source filters)
├── AqiDashboard.tsx (AQI overview)
├── PollutantDashboard.tsx (Per-pollutant charts)
├── HealthDashboard.tsx (Health risk scoring — 23KB)
├── HchoDashboard.tsx (HCHO hotspot maps)
├── FireDashboard.tsx (NASA FIRMS fires)
├── TransportDashboard.tsx (Wind vectors)
├── WeatherDashboard.tsx (FourCastNet forecasts)
├── InsightsDashboard.tsx (AI alerts)
├── ReportsDashboard.tsx (PDF generation — 19.7KB)
├── IndiaMap.tsx (2D/3D switcher)
│   ├── IndiaMap2D.tsx (Leaflet — 21.5KB)
│   └── IndiaMap3D.tsx (Three.js — 12.5KB)
└── services/api.ts (Axios + latency tracking)
```

### Real-Time Sync Engine

1. **Axios Interceptors** — record `Date.now()` at request dispatch, calculate RTT on response, broadcast via `api-latency` DOM event
2. **Live Header** — shows measured server latency and "Last Sync" elapsed counter
3. **Auto-Refresh** — 15-second interval dispatches `refresh-active-dashboard` event to all mounted components

---

## Design System — "Atmospheric Intelligence"

| Token | Value |
|---|---|
| Base Background | `#0b1326` |
| Glass Card | `rgba(15,23,42,0.7)` |
| Primary (Safe) | Cyan `#4cd7f6` |
| Warning (Moderate) | Amber `#ffb95f` |
| Critical (Hazardous) | Red `#ef4444` |
| Heading Font | Geist |
| Body Font | Inter |
| Glass Effect | `backdrop-filter: blur(16px)` + `1px solid rgba(255,255,255,0.1)` |
| Hover Lift | `translateY(-2px)` with intensified blur |

---

**← [[Environment Variables & API Keys]]** | **Next: [[Database Schema]] →**
