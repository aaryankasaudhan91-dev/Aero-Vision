# 🖥️ Dashboard Modules Guide

User guide for all 9 interactive dashboard views in AeroVision.

---

## Navigation

The collapsible **Sidebar** (`Sidebar.tsx`) provides icon-based navigation to all modules. Click the hamburger icon to expand/collapse.

The **FilterBar** (`FilterBar.tsx`) at the top of each dashboard provides:
- 📅 Date picker
- 🗺️ State selector (Indian states)
- 📡 Data source toggles

---

## Module 1: 🌍 AQI Overview

**Component:** `AqiDashboard.tsx` (11.4KB)

The national air quality overview showing all 29 CPCB monitoring stations.

**Features:**
- Interactive India map with station markers color-coded by AQI category
- Station cards with real-time AQI values, prominent pollutant, and category badge
- State-level filtering
- Spatial interpolation (IDW) for continuous AQI surface visualization
- Summary statistics (national average, worst station, best station)

---

## Module 2: 📊 Pollutant Maps

**Component:** `PollutantDashboard.tsx` (8KB)

Per-pollutant concentration analysis with NAQI safety limit reference lines.

**Features:**
- Individual charts for PM2.5, PM10, NO₂, SO₂, CO, O₃
- CPCB NAQI safety limit thresholds shown as horizontal reference lines
- Station comparison bar charts
- Pollutant-specific color gradients

---

## Module 3: 🏥 Health Impact

**Component:** `HealthDashboard.tsx` (23.1KB) — *largest dashboard*

Real-time public health exposure risk scoring system. See [[Health Impact Early Warning System]] for full details.

**Features:**
- Composite risk score (0–100) per city
- Hero Alert Banner (triggers at risk > 70)
- Top 5 Critical Exposure Zones with animated progress bars
- Radial gauge widgets (Respiratory Stress Index, Satellite Anomaly Index)
- Sensitive group advisories (Asthma/COPD, Pediatric, Senior)
- 30-day trend chart (Recharts area graph)

---

## Module 4: 🔥 HCHO Hotspots

**Component:** `HchoDashboard.tsx` (9KB)

TROPOMI satellite HCHO concentration anomaly clusters.

**Features:**
- Hotspot map with detection method overlay
- Detection method selector (Percentile, DBSCAN, Getis-Ord Gi*, Moran's I)
- Cluster statistics (mean/max HCHO, area, z-score, p-value)
- Region-tagged hotspot list

---

## Module 5: 🛰️ Fire Correlation

**Component:** `FireDashboard.tsx` (9.5KB)

NASA FIRMS active fire data with HCHO emission correlation.

**Features:**
- Active fire map with FRP-sized markers
- Fire count by state breakdown
- Pearson correlation coefficient display
- Fire–HCHO scatter plot
- MODIS/VIIRS source toggle

---

## Module 6: 💨 Transport Analysis

**Component:** `TransportDashboard.tsx` (14KB)

Wind vector field visualization and pollutant source attribution.

**Features:**
- ERA5 wind vector field with directional arrows
- Lagrangian back-trajectory visualization
- Source → receptor region attribution table
- Wind speed/direction statistics

---

## Module 7: 🌦️ Weather Dynamics

**Component:** `WeatherDashboard.tsx` (14.4KB)

FourCastNet AI weather forecasts with multiple data layers.

**Features:**
- 7-day forecast grid
- Switchable layers: temperature, wind, humidity, PBL height, precipitation
- Spatial grid overlay on India map
- Forecast confidence indicators

---

## Module 8: 🧠 AI Insights

**Component:** `InsightsDashboard.tsx` (6.2KB)

Google Gemini-powered automated analysis and alerts.

**Features:**
- Anomaly detection alerts with severity badges
- Executive summaries of atmospheric conditions
- Domain-specific advisories (health, agriculture, environment)
- "Generate New Insight" button to trigger fresh analysis

---

## Module 9: 📝 Research Reports

**Component:** `ReportsDashboard.tsx` (19.7KB)

Scientific PDF report generation and management.

**Features:**
- Report generation form (type, region, date range)
- Report list with status indicators
- PDF preview/download
- Auto-generated sections (methodology, data analysis, conclusions)
- Professional watermark overlay

---

## Real-Time Sync Engine

All dashboards participate in the real-time sync system:

1. **Auto-Refresh:** Every 15 seconds, a `refresh-active-dashboard` event triggers silent data re-fetch
2. **Latency Display:** Header shows measured API round-trip time
3. **Last Sync Counter:** "Just Now" → "5s ago" → "1m 3s ago"
4. **Toggle:** Auto-refresh can be disabled via header pill toggle

---

**← [[ML Models & Algorithms]]** | **Next: [[Mapping Engine]] →**
