<h1 align="center">
  <br/>
  🛰️ AeroVision Wiki
  <br/>
</h1>

<h4 align="center">
  India's Premier Geospatial Atmospheric Intelligence Platform
</h4>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/Version-1.2.0-7c3aed?style=flat-square"/>
  <img alt="FastAPI" src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi"/>
  <img alt="React" src="https://img.shields.io/badge/Frontend-React%2019-61dafb?style=flat-square&logo=react"/>
  <img alt="Supabase" src="https://img.shields.io/badge/Database-Supabase-3ecf8e?style=flat-square&logo=supabase"/>
</p>

---

## 🌐 About AeroVision

AeroVision is a full-stack, real-time geospatial intelligence platform for atmospheric monitoring, air quality analysis, and public health risk assessment across the Indian subcontinent. It fuses satellite telemetry (NASA FIRMS, ESA TROPOMI/Sentinel-5P), CPCB ground sensor networks, and AI/ML models into a single premium command-center interface.

The project aligns with the **National Clean Air Programme (NCAP)**, **UN SDG 11.6**, and **ISRO/SAC** atmospheric science mandates.

---

## 📖 Wiki Navigation

### 📦 Getting Started
| Page | Description |
|---|---|
| [[Installation & Setup]] | Step-by-step local development environment setup |
| [[Environment Variables & API Keys]] | How to obtain all required credentials and API keys |

### 🏗️ Architecture & Design
| Page | Description |
|---|---|
| [[System Architecture]] | Full technical architecture — backend, frontend, data flow |
| [[Database Schema]] | All 16 PostgreSQL/PostGIS tables with column details |
| [[API Reference]] | Complete REST API documentation for all 17 endpoints |

### 🛰️ Data & Machine Learning
| Page | Description |
|---|---|
| [[Data Sources & Ingestion Pipelines]] | Satellite, ground, and weather data acquisition pipelines |
| [[ML Models & Algorithms]] | AQI engine, HCHO hotspot detection, CNN-LSTM, transport analysis |

### 🖥️ Feature Guides
| Page | Description |
|---|---|
| [[Dashboard Modules Guide]] | User guide for all 9 dashboard views |
| [[Mapping Engine]] | 2D Leaflet and 3D Three.js spatial visualization |
| [[Health Impact Early Warning System]] | Composite health risk scoring system |
| [[AI Insights & Report Generation]] | Gemini AI analysis and scientific PDF reports |

### ⚙️ Operations
| Page | Description |
|---|---|
| [[Deployment Guide]] | Production deployment instructions |
| [[Troubleshooting & Known Issues]] | Common problems and solutions |

---

## 🔧 Tech Stack Overview

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11+, FastAPI 0.115, Uvicorn |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| **Database** | Supabase (PostgreSQL + PostGIS) |
| **Maps** | Leaflet + react-leaflet (2D), Three.js (3D) |
| **Charts** | Recharts |
| **ML/AI** | scikit-learn, TensorFlow, PyTorch, Google Gemini |
| **Geospatial** | GeoPandas, xarray, Rasterio, PySAL, Google Earth Engine |
| **Data Sources** | NASA FIRMS, ESA TROPOMI, CPCB, ECMWF ERA5, MOSDAC INSAT-3D |

---

## 📊 Key Metrics

- **29** real CPCB ground monitoring stations
- **17** REST API endpoints
- **9** interactive dashboard modules
- **4** ML/statistical analysis algorithms
- **5** automated data ingestion pipelines
- **16** database tables with PostGIS spatial support
- **15-second** auto-refresh real-time sync engine

---

## 📌 Version History

| Version | Date | Highlights |
|---|---|---|
| V1.2.0 | June 2026 | Production release — Health Impact System, Transport Analysis, AI Insights |
| V1.1.0 | — | HCHO hotspot detection, Fire correlation, Weather forecasts |
| V1.0.0 | — | Initial release — AQI dashboard, Pollutant maps, 2D/3D mapping |

---

<p align="center">
  Built with ❤️ for India's atmospheric intelligence mission
</p>
