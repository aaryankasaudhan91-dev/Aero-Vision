# 🛰️ Project AeroVision: Surface AQI & HCHO Hotspots over India

[![Vite Build](https://img.shields.io/badge/Vite-Build%20Success-green?logo=vite)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115-blue?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL/PostGIS](https://img.shields.io/badge/Database-PostgreSQL%2FPostGIS-blue?logo=postgresql)](https://postgis.net/)
[![Python ML/DL](https://img.shields.io/badge/Models-RandomForest%20%7C%20XGBoost%20%7C%20CNN--LSTM-orange?logo=python)](https://pytorch.org/)

An advanced Remote Sensing & Deep Learning system to estimate **Surface AQI** and detect **Formaldehyde (HCHO) Hotspots** across India using multi-satellite products, meteorological reanalysis, and ground-truth CAQMS monitoring.

---

## 📖 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [Scientific Methodology & Mathematical Formulations](#-scientific-methodology--mathematical-formulations)
3. [System Architecture](#-system-architecture)
4. [Database Design](#-database-design)
5. [API Documentation](#-api-documentation)
6. [3D Map Visualizations (WebGL/Three.js)](#-3d-map-visualizations-webglthreejs)
7. [Installation & Setup](#-installation--setup)
8. [Production Optimization & Troubleshooting](#-production-optimization--troubleshooting)

---

## 🧠 Executive Summary

### The Challenge
Ground-level Air Quality Index (AQI) monitoring in India is limited to approximately **500 Continuous Ambient Air Quality Monitoring Stations (CAAQMS)** under the CPCB. Over 80% of India's population lives in suburban or rural areas situated more than **100 km away** from the nearest ground station. This spatial gap masks the severe exposure risks faced by rural communities, particularly during seasonal agricultural residue burning (stubble burning) in northwest India and forest fires in northeast India.

### The Solution: AeroVision
Project AeroVision resolves this monitoring gap by utilizing high-resolution satellite remote sensing to interpolate ground observations:
* **Hybrid Surface Estimation:** Predicts surface-level criteria pollutants ($PM_{2.5}, NO_2, SO_2, CO, O_3$) at $0.1^\circ \times 0.1^\circ$ (~10 km) daily resolution using a customized **CNN-LSTM** model trained on **INSAT-3D AOD** and **Sentinel-5P TROPOMI** column densities.
* **HCHO Hotspot Tracking:** Detects **Formaldehyde (HCHO)** (a key Volatile Organic Compound indicator) using spatial autocorrelation (**Getis-Ord $Gi^*$** and **Local Moran's I**) to identify emission source zones.
* **Fire & Transport Coupling:** Correlates NASA **MODIS/VIIRS Fire Radiative Power (FRP)** with HCHO columns with a 1–3 day lag, tracing transport pathways using **ERA5 wind vectors** with fallback models for 10m surface winds.

---

## 🔬 Scientific Methodology & Mathematical Formulations

```mermaid
graph TD
    A[Satellite & Model Data] --> D[Data Preprocessor]
    B[Ground Truth CAQMS] --> D
    C[ERA5 Meteorology] --> D
    D -->|Spatial-Temporal Merge| E[Feature Store]
    E --> F[Hybrid CNN-LSTM Model]
    E --> G[XGBoost & Random Forest]
    F -->|Surface Prediction| H[AQI Calculation]
    I[TROPOMI HCHO] --> J[Getis-Ord Gi* Statistics]
    J --> K[DBSCAN Clustering]
    K -->|Hotspot Detection| L[Fire-HCHO Correlation]
    M[MODIS/VIIRS FRP] --> L
    N[ERA5 Wind Vectors] --> O[Transport Pathways]
```

### 1. Data Processing & Masking
* **Cloud Masking:** Satellite pixels with a cloud fraction $> 0.3$ or TROPOMI Quality Assurance ($QA$) value $< 0.75$ are automatically masked to prevent retrieval biases.
* **Spatial Harmonization:** All coordinates are projected onto a standard Indian grid boundary ($8^\circ\text{N}–38^\circ\text{N}$, $68^\circ\text{E}–98^\circ\text{E}$) with $0.1^\circ$ spacing using **Kriging interpolation** for gaps.

### 2. Hybrid CNN-LSTM Architecture
* **Spatial Feature Extraction (CNN):** A $7 \times 7$ grid of satellite parameters surrounding a grid point is processed via 2D Convolutional layers.
* **Temporal Dependency (LSTM):** Modulates the previous 7 days of meteorological factors ($PBLH, RH, Temp$) to model the accumulation and dispersion of pollutants.

### 3. Spatial Statistics for Hotspot Detection
* **Getis-Ord $Gi^*$ Statistic:** Identifies statistically significant spatial clusters of high HCHO concentrations:
  $$G_i^* = \frac{\sum_{j=1}^n w_{ij} x_j - \bar{X}\sum_{j=1}^n w_{ij}}{S \sqrt{\frac{n\sum_{j=1}^n w_{ij}^2 - (\sum_{j=1}^n w_{ij})^2}{n-1}}}$$
  *Where $w_{ij}$ represents spatial weights, $x_j$ represents HCHO value at location $j$, $\bar{X}$ is the mean, and $S$ is the standard deviation.*
* **DBSCAN Clustering:** Segregates diffuse regional plumes from dense point-source hotspots using search radius parameters ($\varepsilon = 50\text{ km}$, $\text{min\_samples} = 5$).

### 4. Wind-Based Pollutant Transport & Back-Trajectories
AeroVision analyzes regional transport using wind vector fields derived from ERA5 reanalysis data:
* **Lagrangian Back-Trajectory Tracking:** Evaluates the source region of pollutants by backtracking the path of an air parcel starting from a receptor station (such as Delhi NCR). The tracking algorithm backsteps hour-by-hour:
  $$\text{Lat}_{t-1} = \text{Lat}_t - \left( v \times \Delta t \times \frac{360^\circ}{2\pi R} \right)$$
  $$\text{Lon}_{t-1} = \text{Lon}_t - \left( u \times \Delta t \times \frac{360^\circ}{2\pi R \cos(\text{Lat}_t)} \right)$$
  *Where $u$ and $v$ are the zonal and meridional wind components (m/s), $\Delta t = 3600\text{ s}$ (1 hour), and $R$ is the Earth's radius.*
* **Wind Vector Fallback Hierarchy:** In order to avoid missing calculations due to data gaps (without introducing synthetic/mock vectors), the system prioritizes ERA5 **850 hPa winds** (geostrophic layer) and seamlessly falls back to **10m surface winds** if 850 hPa is null.

---

## 🏗️ System Architecture

```
├── backend/
│   ├── app/
│   │   ├── geospatial/     # GEE, wind vector, and PostGIS utils
│   │   ├── ml/             # RF, XGBoost, CNN-LSTM model definitions
│   │   ├── pipelines/      # Data ingestion & cleaning
│   │   ├── routers/        # FastAPI endpoint definitions
│   │   ├── services/       # Core business logic (AQI, HCHO, reports)
│   │   ├── database.py     # SQLAlchemy & Supabase connectors
│   │   └── main.py         # App entrypoint
│   └── supabase/           # PostGIS schema migrations
└── frontend/
    ├── src/
    │   ├── components/     # Beautiful Glassmorphism Dashboards
    │   │   ├── IndiaMap3D.tsx        # WebGL 3D Map Component
    │   │   ├── TransportDashboard.tsx # Transport analytics
    │   │   └── ...
    │   ├── services/       # Axios API layer
    │   └── App.tsx         # Dashboard assembly
```

---

## 🗄️ Database Design

AeroVision leverages **PostgreSQL** with the **PostGIS** extension to support rapid geo-spatial queries (e.g., nearest-station queries and trajectory line strings).

### Primary Schema Tables
1. `cpcb_stations`: Ground monitor stations, coordinates, types, and geometries.
2. `cpcb_observations`: Ground truth air quality logs ($PM_{2.5}, NO_2, SO_2, CO, O_3$, and AQI values).
3. `satellite_aod`: Daily INSAT-3D Aerosol Optical Depth ($550\text{ nm}$).
4. `tropomi_products`: High-resolution Sentinel-5P column density variables ($HCHO, NO_2, SO_2, CO$).
5. `meteorological_data`: ERA5 reanalysis fields ($U/V$ wind components at 10m and 850 hPa, temperature, PBLH, humidity).
6. `fire_records`: MODIS & VIIRS thermal anomalies with Fire Radiative Power (FRP).
7. `model_predictions`: Predicted concentrations and estimated surface AQI.
8. `hcho_hotspots`: Multi-polygon clusters indicating spatial anomalies.
9. `fire_hcho_correlations`: Pearson/Spearman correlation metrics, lag times, and FRP summaries.
10. `transport_analysis`: Regional daily transport speed, direction, distance, and vector fields.

*PL/pgSQL Triggers are implemented to automatically compute and synchronize PostGIS geometries (`geom` and `centroid_geom`) on inserts/updates.*

---

## 🔌 API Documentation

All backend endpoints are built using **FastAPI** with auto-generated OpenAPI docs available at `/docs`.

### AQI Endpoints (`/api/aqi`)
* `GET /api/aqi/overview`: Retrieves country-wide mean/max/min AQI and CPCB ground observations.
* `GET /api/aqi/stations`: Returns list of monitored ground stations and activation status.
* `GET /api/aqi/trends`: Returns historical daily time-series.
* `GET /api/aqi/predictions`: Returns CNN-LSTM predicted future AQI values.

### Transport Endpoints (`/api/transport`)
* `GET /api/transport/`: Returns calculated regional transport records from `transport_analysis`.
* `GET /api/transport/wind-vectors`: Fetches wind vector coordinates ($u$, $v$, speed, direction) for the spatial grid.
* `GET /api/transport/pathways`: Returns transport path logs between date boundaries.
* `GET /api/transport/source-attribution`: Calculates receptor backtracking coordinates (`trajectory`) and source zone percentages.

---

## 🗺️ 3D Map Visualizations (WebGL/Three.js)

The application provides a premium, interactive **3D WebGL Map** of India using **Three.js** inside `IndiaMap3D.tsx`:
* **Geometry Extrusion:** Extrudes the Indian boundary polygon to create a stylized glassmorphic 3D base.
* **Spatial Data Bars:** Renders 3D cylinders at data coordinate points. Height represents the pollutant concentration or value, and glowing sphere markers are placed on top.
* **Trajectory Mapping:** Displays back-trajectory path coordinates on the map.
* **Performance Subsampling:** Subsamples dense coordinates (such as the 1000-point wind vector grid) using a modulo filter (`index % 25 === 0`) to prevent WebGL frame rate drops, ensuring 60fps interaction speed.

---

## ⚙️ Installation & Setup

### Prerequisites
* Python 3.10+
* Node.js 18+
* PostgreSQL + PostGIS (or a Supabase project)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Copy `.env.example` to `.env` and fill in credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
GEE_SERVICE_ACCOUNT_PATH=./credentials/gee-service-account.json
```
Run migrations:
```bash
# Execute supabase/schema.sql and schema_part2.sql on your database console.
```
Start development server:
```bash
python -m app.main
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠️ Production Optimization & Troubleshooting

### PostgREST Pagination & Limit Caps
By default, Supabase (PostgREST) caps query responses to **1000 records** per page. 
* **The Issue:** When retrieving meteorological wind vectors (6,138 records per day), the API only fetched the first 1000 records. Because these first records happened to have null wind components, the client did not receive any wind data, resulting in blank maps.
* **The Solution:** We eliminated the query constraint by applying filter operations directly inside the Supabase client query. By executing `.not_.is_("u_wind_10m", "null")`, the server automatically skips null rows and returns 1000 valid records containing active measurements.

### Enforcing "No Mock Data"
All synthetic mock wind flow generators and placeholder arrays were removed:
* If ERA5 850 hPa winds are missing, the system utilizes 10m surface winds.
* If all meteorological fields are missing, the trajectory terminates naturally rather than injecting synthetic waves, ensuring the analytics represent real science.
* Hardcoded frontend visual placeholders were updated to render empty charts with proper error panels in the absence of telemetry.
