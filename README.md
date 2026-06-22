# 🛰️ Project AeroVision: Surface AQI & HCHO Hotspots over India

[![Vite Build](https://img.shields.io/badge/Vite-Build%20Success-green?logo=vite)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115-blue?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL/PostGIS](https://img.shields.io/badge/Database-PostgreSQL%2FPostGIS-blue?logo=postgresql)](https://postgis.net/)
[![Python ML/DL](https://img.shields.io/badge/Models-RandomForest%20%7C%20XGBoost%20%7C%20CNN--LSTM-orange?logo=python)](https://pytorch.org/)

An advanced Remote Sensing & Deep Learning system to estimate **Surface AQI** and detect **Formaldehyde (HCHO) Hotspots** across India using multi-satellite products, meteorological reanalysis, and ground-truth CAQMS monitoring.

---

## 📖 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [Scientific Methodology](#-scientific-methodology)
3. [System Architecture](#-system-architecture)
4. [Database Design](#-database-design)
5. [Installation & Setup](#-installation--setup)

---

## 🧠 Executive Summary

### The Challenge
Ground-level Air Quality Index (AQI) monitoring in India is limited to approximately **500 Continuous Ambient Air Quality Monitoring Stations (CAAQMS)** under the CPCB. Over 80% of India's population lives in suburban or rural areas situated more than **100 km away** from the nearest ground station. This spatial gap masks the severe exposure risks faced by rural communities, particularly during seasonal agricultural residue burning (stubble burning) in northwest India and forest fires in northeast India.

### The Solution: AeroVision
Project AeroVision resolves this monitoring gap by utilizing high-resolution satellite remote sensing to interpolate ground observations:
* **Hybrid Surface Estimation:** Predicts surface-level criteria pollutants ($PM_{2.5}, NO_2, SO_2, CO, O_3$) at $0.1^\circ \times 0.1^\circ$ (~10 km) daily resolution using a customized **CNN-LSTM** model trained on **INSAT-3D AOD** and **Sentinel-5P TROPOMI** column densities.
* **HCHO Hotspot Tracking:** Detects **Formaldehyde (HCHO)** (a key Volatile Organic Compound indicator) using spatial autocorrelation (**Getis-Ord $Gi^*$** and **Local Moran's I**) to identify emission source zones.
* **Fire & Transport Coupling:** Correlates NASA **MODIS/VIIRS Fire Radiative Power (FRP)** with HCHO columns with a 1–3 day lag, tracing transport pathways using **ERA5 850 hPa wind vectors**.

---

## 🔬 Scientific Methodology

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
* **DBSCAN Clustering:** Segregates diffuse regional plumes from dense point-source hotspots using search radius parameters ($\varepsilon = 50\text{ km}$, $\text{min\_samples} = 5$).

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
    │   ├── services/       # Axios API layer
    │   └── App.tsx         # Dashboard assembly
```

---

## 🗄️ Database Design

AeroVision leverages **PostgreSQL** with the **PostGIS** extension to support rapid geo-spatial queries (e.g., nearest-station queries and trajectory line strings).

### Primary Tables
1. `cpcb_stations`: Stores coordinates and structural types of monitoring stations.
2. `cpcb_observations`: Ground truth air quality logs.
3. `tropomi_products`: High-resolution Sentinel-5P column density variables ($HCHO, NO_2, SO_2, CO$).
4. `fire_records`: MODIS & VIIRS thermal anomalies with Fire Radiative Power (FRP).
5. `model_predictions`: Estimated ground-level concentrations and resulting estimated AQI.
6. `hcho_hotspots`: Multi-polygon clusters indicating HCHO concentration regions.

*Triggers are implemented in PL/pgSQL to automatically sync `geom` points on inserts.*

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
SUPABASE_KEY=your-anon-key
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




