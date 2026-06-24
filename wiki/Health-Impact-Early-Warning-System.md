# 🏥 Health Impact Early Warning System

Deep documentation of AeroVision's flagship health risk assessment feature.

---

## Overview

The Health Impact Early Warning System calculates a **composite health exposure risk score (0–100)** for every CPCB-monitored city in real time by combining AQI data with active fire proximity.

**Component:** `HealthDashboard.tsx` (23.1KB — the largest component in the project)

---

## Risk Score Algorithm

```
Risk Score = base_aqi_risk(AQI) + fire_modifier(active_fires_in_state)
```

### `base_aqi_risk(AQI)`

Maps the 0–500 AQI scale to a 0–100 risk index using **tiered linear interpolation**:

| AQI Range | Risk Mapping | Category |
|---|---|---|
| 0–50 | 0–15 | 🟢 Good |
| 51–100 | 15–30 | 🟡 Satisfactory |
| 101–200 | 30–55 | 🟠 Moderate |
| 201–300 | 55–75 | 🔴 Poor |
| 301–400 | 75–90 | 🟣 Very Poor |
| 401–500 | 90–100 | ⚫ Severe |

### `fire_modifier(active_fires_in_state)`

Adds up to **+10 points** based on the count of NASA FIRMS active fires detected in the same Indian state.

| Fire Count | Modifier |
|---|---|
| 0 | +0 |
| 1–5 | +2 |
| 6–15 | +5 |
| 16–30 | +8 |
| 30+ | +10 |

### Color Coding

| Score Range | Status | Color |
|---|---|---|
| 0–25 | Good | 🟢 Green |
| 25–50 | Moderate | 🟡 Amber |
| 50–75 | Severe | 🟠 Orange |
| 75–100 | Critical | 🔴 Red |

---

## Dashboard Components

### 1. Hero Alert Banner
- **Triggers when:** Any monitoring station exceeds risk score **70**
- **Visual:** Full-width animated banner with pulsing red background
- **Content:** Most critical city name, risk score, and recommended action

### 2. Critical Exposure Zones
- **Displays:** Top 5 most impacted cities ranked by risk score
- **Visual:** Animated progress bars with gradient fills matching risk color
- **Data:** City name, state, AQI value, risk score, prominent pollutant

### 3. Radial Gauge Widgets

Two circular gauge visualizations:

| Gauge | Data Source | Range |
|---|---|---|
| **Respiratory Stress Index** | Weighted average of PM2.5 + NO₂ exposure | 0–100 |
| **Satellite Anomaly Index** | HCHO column density deviation from baseline | 0–100 |

### 4. Sensitive Group Advisories

Targeted health advisories for vulnerable populations:

| Group | Key Triggers |
|---|---|
| **Asthma/COPD** | PM2.5 > 100 µg/m³ or AQI > 200 |
| **Pediatric Care** | AQI > 150 or active fires in state |
| **Senior Citizens** | Risk score > 50 |

Each advisory includes:
- Risk level badge
- Recommended precautions
- Duration of exposure warning

### 5. Spatial Map
Geographic visualization of health risk distribution across India using the standard `IndiaMap2D` component with risk-colored markers.

### 6. 30-Day Trend Chart
- **Library:** Recharts area graph
- **Data:** Population exposure trajectory over the past 30 days
- **Metrics:** Average national risk score, peak risk events

---

## Data Sources

| Data | Table | Usage |
|---|---|---|
| Real-time AQI | `cpcb_observations` | Base risk score calculation |
| Active fires | `fire_records` | Fire modifier (state-level count) |
| HCHO density | `tropomi_products` | Satellite Anomaly Index |
| Station locations | `cpcb_stations` | Geographic mapping |

---

**← [[Mapping Engine]]** | **Next: [[AI Insights & Report Generation]] →**
