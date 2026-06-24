# 🗄️ Database Schema

Complete reference for all 16 Supabase PostgreSQL/PostGIS tables used by AeroVision.

---

## Schema Overview

| Table | Records | Purpose |
|---|---|---|
| `cpcb_stations` | 29 | CPCB ground monitoring station metadata |
| `cpcb_observations` | 232+ | Hourly AQI readings per station |
| `tropomi_products` | 2,789+ | Sentinel-5P column densities |
| `fire_records` | 45+ | NASA FIRMS active fire detections |
| `meteorological_data` | 6,138+ | ERA5 wind, temperature, humidity |
| `satellite_aod` | — | INSAT-3D Level-2 AOD (550nm) |
| `hcho_hotspots` | — | Detected HCHO anomaly clusters |
| `fire_hcho_correlations` | — | Fire–HCHO statistical correlations |
| `transport_analysis` | — | Wind-based pollutant transport |
| `weather_forecasts` | — | FourCastNet AI model output |
| `model_metadata` | — | ML model versioning & metrics |
| `model_predictions` | — | CNN-LSTM AQI predictions |
| `ai_insights` | — | Gemini-generated alerts |
| `reports` | 4 | Generated PDF report metadata |
| `aqi_maps` | — | Aggregated spatial AQI maps |
| `india_boundaries` | — | State/district boundary geometries |

---

## Core Tables

### `cpcb_stations`

29 real CPCB (Central Pollution Control Board) air quality monitoring stations across India.

| Column | Type | Description |
|---|---|---|
| `id` | bigint (PK) | Auto-increment ID |
| `station_id` | text (unique) | CPCB station identifier |
| `station_name` | text | Station display name |
| `city` | text | City name |
| `state` | text | Indian state |
| `latitude` | double precision | Latitude (WGS84) |
| `longitude` | double precision | Longitude (WGS84) |
| `geom` | geometry(Point, 4326) | PostGIS point geometry |
| `elevation_m` | double precision | Elevation in meters |
| `station_type` | text | e.g., `CAAQMS` |
| `is_active` | boolean | Station operational status |
| `created_at` | timestamptz | Record creation timestamp |

### `cpcb_observations`

Hourly pollutant observations from CPCB stations. Linked to `cpcb_stations` via `station_id`.

| Column | Type | Description |
|---|---|---|
| `id` | bigint (PK) | Auto-increment ID |
| `station_id` | text (FK) | → `cpcb_stations.station_id` |
| `observed_at` | timestamptz | Observation timestamp |
| `pm25` | double precision | PM2.5 (µg/m³) |
| `pm10` | double precision | PM10 (µg/m³) |
| `no2` | double precision | NO₂ (µg/m³) |
| `so2` | double precision | SO₂ (µg/m³) |
| `co` | double precision | CO (mg/m³) |
| `o3` | double precision | O₃ (µg/m³) |
| `nh3` | double precision | NH₃ (µg/m³) |
| `aqi` | integer | Computed AQI value (0–500) |
| `aqi_category` | text | NAQI category (Good→Severe) |
| `prominent_pollutant` | text | Dominant pollutant |
| `quality_flag` | integer | Data quality indicator |
| `created_at` | timestamptz | Record creation timestamp |

### `tropomi_products`

Sentinel-5P TROPOMI satellite column density measurements.

| Column | Type | Description |
|---|---|---|
| `id` | bigint (PK) | Auto-increment ID |
| `product_type` | text | `NO2`, `SO2`, `CO`, `O3`, or `HCHO` |
| `observed_date` | date | Observation date |
| `latitude` | double precision | Grid point latitude |
| `longitude` | double precision | Grid point longitude |
| `geom` | geometry(Point, 4326) | PostGIS point |
| `column_value` | double precision | Column density (mol/m²) |
| `column_unit` | text | Unit (`mol/m²`) |
| `tropospheric_column` | double precision | Tropospheric column only |
| `qa_value` | double precision | Quality assurance flag (0–1) |
| `cloud_fraction` | double precision | Cloud fraction (0–1) |
| `created_at` | timestamptz | Record creation timestamp |

### `fire_records`

NASA FIRMS active fire detections (MODIS/VIIRS), geocoded to Indian states.

| Column | Type | Description |
|---|---|---|
| `id` | bigint (PK) | Auto-increment ID |
| `source` | text | `MODIS` or `VIIRS` |
| `detected_at` | timestamptz | Detection datetime |
| `detected_date` | date | Detection date |
| `latitude` / `longitude` | double precision | Fire location |
| `geom` | geometry(Point, 4326) | PostGIS point |
| `frp` | double precision | Fire Radiative Power (MW) |
| `brightness` | double precision | Brightness temperature (K) |
| `confidence` | integer | Detection confidence (0–100) |
| `satellite` | text | Satellite name |
| `daynight` | text | `D` or `N` |
| `state` / `district` | text | Geocoded location |
| `fire_type` | text | Fire classification |
| `created_at` | timestamptz | Record timestamp |

### `meteorological_data`

ERA5 reanalysis weather grid data.

| Column | Type | Description |
|---|---|---|
| `id` | bigint (PK) | Auto-increment ID |
| `source` | text | `ERA5` |
| `observed_date` | date | Date |
| `latitude` / `longitude` | double precision | Grid point |
| `geom` | geometry(Point, 4326) | PostGIS point |
| `temperature_2m` | double precision | 2m temperature (K) |
| `relative_humidity` | double precision | Relative humidity (%) |
| `wind_speed_10m` | double precision | 10m wind speed (m/s) |
| `wind_direction` | double precision | Wind direction (degrees) |
| `u_wind_10m` / `v_wind_10m` | double precision | 10m wind components |
| `u_wind_850hpa` / `v_wind_850hpa` | double precision | 850 hPa wind components |
| `pbl_height` | double precision | Planetary boundary layer height (m) |
| `total_precipitation` | double precision | Total precipitation (m) |
| `surface_pressure` | double precision | Surface pressure (Pa) |
| `created_at` | timestamptz | Record timestamp |

---

## Analysis Tables

### `hcho_hotspots`

Detected HCHO anomaly clusters from multiple detection methods.

| Column | Type | Description |
|---|---|---|
| `detection_method` | text | `percentile`, `dbscan`, `getis_ord`, or `morans_i` |
| `hotspot_date` | date | Detection date |
| `period_type` | text | `seasonal` or `daily` |
| `cluster_id` | integer | DBSCAN cluster ID |
| `centroid_lat` / `centroid_lon` | double precision | Cluster centroid |
| `area_sq_km` | double precision | Approximate cluster area |
| `mean_hcho` / `max_hcho` | double precision | HCHO statistics |
| `percentile_rank` | double precision | Percentile threshold used |
| `z_score` / `p_value` | double precision | Statistical significance |
| `pixel_count` | integer | Number of grid pixels |
| `region_name` / `state` | text | Geographic region |
| `season` | text | Burning season |
| `fire_association` | boolean | Whether associated with active fires |
| `confidence` | double precision | Detection confidence |

### `fire_hcho_correlations`

Statistical correlation between fire activity and HCHO concentrations.

| Column | Type | Description |
|---|---|---|
| `region_name` / `state` | text | Geographic area |
| `period_start` / `period_end` | date | Analysis period |
| `season` | text | Burning season |
| `pearson_r` / `pearson_p` | double precision | Pearson correlation |
| `spearman_r` / `spearman_p` | double precision | Spearman correlation |
| `optimal_lag_days` | integer | Best lag for max correlation |
| `lag_correlation` | double precision | Correlation at optimal lag |
| `fire_count` | integer | Number of fires |
| `mean_frp` / `mean_hcho` | double precision | Mean values |

---

## Output Tables

### `reports`
| Column | Type |
|---|---|
| `report_type` | text |
| `title` / `abstract` | text |
| `content` | jsonb |
| `pdf_path` | text |
| `generated_at` | timestamptz |
| `status` | text |

### `ai_insights`
| Column | Type |
|---|---|
| `insight_type` | text |
| `title` / `summary` / `detailed_text` | text |
| `region` / `state` | text |
| `severity` | text |
| `metrics` | jsonb |

### `model_metadata` / `model_predictions`
ML model versioning and AQI prediction storage tables.

---

## PostGIS Features

- PostGIS extension enabled for spatial queries
- `geom` columns on all spatial tables (type `geometry(Point, 4326)`)
- `spatial_ref_sys` table contains 8,500 coordinate reference systems
- `india_boundaries` table stores state/district polygons for geocoding

---

**← [[System Architecture]]** | **Next: [[API Reference]] →**
