# 🧠 ML Models & Algorithms

Deep dive into AeroVision's 4 machine learning and statistical analysis modules.

All modules are in `backend/app/ml/`.

---

## Module 1: AQI Engine (`aqi_engine.py`)

**Purpose:** Compute India's National Air Quality Index (NAQI) from ground pollutant concentrations.

### Algorithm

1. For each of 7 pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃), compute a **sub-index** using India's CPCB/NAQI breakpoint tables
2. **Overall AQI = max(sub-indices)**
3. The pollutant with the highest sub-index becomes the **prominent pollutant**

### NAQI Categories

| Category | AQI Range | Color |
|---|---|---|
| Good | 0–50 | 🟢 Green |
| Satisfactory | 51–100 | 🟡 Light Green |
| Moderate | 101–200 | 🟠 Yellow |
| Poor | 201–300 | 🔴 Orange |
| Very Poor | 301–400 | 🟣 Red |
| Severe | 401–500 | ⚫ Dark Red |

> ⚠️ AeroVision uses India's NAQI standard (6 categories), **not** the US EPA AQI standard.

### Usage

Called automatically during CPCB data ingestion:
```python
from app.ml.aqi_engine import compute_aqi
result = compute_aqi({"PM2.5": 85, "PM10": 120, "NO2": 40, ...})
# Returns: {"aqi": 167, "category": "Moderate", "prominent_pollutant": "PM2.5"}
```

---

## Module 2: HCHO Hotspot Detection (`hcho_hotspot.py`)

**Purpose:** Detect formaldehyde concentration anomaly clusters using 4 complementary methods.

### Class: `HCHOHotspotDetector`

**Parameters:**
- `percentile_threshold = 95` (95th percentile)
- `dbscan_eps_km = 50` (50 km radius)
- `dbscan_min_samples = 5`
- `persistence_days = 3`

### Method 1: Percentile Thresholding

Flags pixels exceeding the 95th percentile of the HCHO climatology.

- Grid: 0.5° × 0.5° spatial bins
- Minimum 3 pixels per cluster
- Area estimate: pixel_count × 25 km²

### Method 2: DBSCAN Spatial Clustering

Density-based clustering on elevated HCHO pixels (≥75th percentile).

- Converts lat/lon to km: `lat_km = lat × 111.0`, `lon_km = lon × 111.0 × cos(mean_lat)`
- DBSCAN with ε=50 km, min_samples=5, Euclidean metric
- Noise points (label = -1) are excluded

### Method 3: Getis-Ord Gi* Statistic

Local spatial autocorrelation — identifies statistically significant hot spots.

- Aggregates to 0.2° grid with mean values
- Neighbor radius: 0.5 degrees
- Gi* z-score calculation:
  ```
  Gi* = (Σ(w_j × x_j) - x̄ × Σw_j) / (S × √((n×Σw_j - (Σw_j)²) / (n-1)))
  ```
- Significant if **z > 1.96** (p < 0.05)

### Method 4: Local Moran's I

Spatial autocorrelation for High-High (HH) cluster identification.

- 0.2° grid, inverse-distance spatial weights
- Local I = (deviation_i / m2) × Σ(w_ij × deviation_j)
- HH cluster: positive Local I AND positive deviation
- Significant if z > 1.96

### Region Identification

Detected hotspots are auto-tagged to geographic regions using bounding box lookup:

| Region | Lat Range | Lon Range |
|---|---|---|
| Indo-Gangetic Plain | 24–31 | 75–88 |
| Punjab | 29.5–32.5 | 73.5–77 |
| Haryana | 27.5–31 | 74.5–77.5 |
| Delhi NCR | 28–29 | 76.5–77.5 |
| Central India | 19–25 | 76–84 |
| Northeast India | 22–28 | 89–97 |
| Western India | 18–24 | 68–75 |
| Southern India | 8–16 | 74–80 |

---

## Module 3: Surface Estimation (`surface_estimation.py`)

**Purpose:** CNN-LSTM model to predict surface AQI from satellite observations.

### Architecture

```
Input (time_steps × H × W × channels)
    ↓
2D CNN Block (spatial pattern extraction)
    ↓ Batch Normalization + ReLU
LSTM Block (temporal dependency modeling)
    ↓
Dense Output (PM2.5, NO₂, SO₂, CO, O₃ predictions)
    ↓
NAQI Conversion (sub-indices → overall AQI)
```

### Input Features
- Satellite: AOD (550nm), TROPOMI NO₂, SO₂, CO, O₃ columns
- Meteorological: wind speed/direction, temperature, relative humidity, PBL height

### Training Strategy
- **Pre-training:** High-density regions (NCR, Mumbai, Pune)
- **Fine-tuning:** Sparse monitoring regions
- **Regularization:** Dropout (p=0.3), L2 weight decay, early stopping
- **Hyperparameter tuning:** Bayesian optimization
- **Retraining:** Monthly (seasonal AOD–PM2.5 drift)

### Validation Metrics
- RMSE, MAE per pollutant species
- Pearson R against CPCB observations
- AQI category confusion matrix (6 NAQI categories)
- Spatial bias maps

---

## Module 4: Correlation & Transport (`correlation_transport.py`)

**Purpose:** Analyze fire–HCHO correlations and wind-based pollutant transport pathways.

### Fire–HCHO Correlation
- **Pearson and Spearman** correlations between area-averaged FRP and HCHO
- **Lag analysis:** 0–5 day lags to find optimal fire→HCHO delay
- Results stored in `fire_hcho_correlations` table

### Transport Analysis
- ERA5 850 hPa wind vectors for dominant transport pathway diagnosis
- Lagrangian back-trajectory computation
- Source → receptor region linkage identification (e.g., Punjab fires → Delhi NCR pollution)

### Biomass Burning Seasons

| Season | Months | Regions |
|---|---|---|
| Kharif residue burning | October–November | Punjab, Haryana |
| Rabi burning | April–May | Indo-Gangetic Plain |
| Forest fires | March–May | Central, Northeast India |

---

**← [[Data Sources & Ingestion Pipelines]]** | **Next: [[Dashboard Modules Guide]] →**
