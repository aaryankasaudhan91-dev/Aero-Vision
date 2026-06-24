# 📡 API Reference

Complete REST API documentation for all 17 AeroVision endpoints.

**Base URL:** `http://localhost:8000/api`  
**Swagger UI:** `http://localhost:8000/api/docs`  
**ReDoc:** `http://localhost:8000/api/redoc`

---

## Health Check

### `GET /api/health`

Returns service health status.

**Response:**
```json
{ "status": "healthy", "version": "1.2.0" }
```

---

## AQI Endpoints (`/api/aqi/`)

### `GET /api/aqi/`

AQI overview with observations filtered by date and state.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string (YYYY-MM-DD) | No | Target date (default: today) |
| `state` | string | No | Filter by Indian state name |

### `GET /api/aqi/stations`

Returns all 29 active CPCB monitoring stations.

**Response:** Array of station objects with `station_id`, `station_name`, `city`, `state`, `latitude`, `longitude`.

### `GET /api/aqi/observations`

Raw ground sensor pollutant observations.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Target date |
| `state` | string | No | Filter by state |
| `station_id` | string | No | Filter by specific station |

**Response:** Array with `pm25`, `pm10`, `no2`, `so2`, `co`, `o3`, `nh3`, `aqi`, `aqi_category`.

### `GET /api/aqi/trends`

AQI time-series data for charts.

| Param | Type | Required | Description |
|---|---|---|---|
| `station_id` | string | No | Station to get trends for |
| `days` | integer | No | Number of days (default: 30) |

---

## HCHO Endpoints (`/api/hcho/`)

### `GET /api/hcho/`

HCHO hotspot overview with summary statistics.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Target date |

### `GET /api/hcho/hotspots`

Spatial anomaly cluster data from all four detection methods (Percentile, DBSCAN, Getis-Ord Gi*, Moran's I).

| Param | Type | Required | Description |
|---|---|---|---|
| `start_date` | string | No | Period start |
| `end_date` | string | No | Period end |

### `GET /api/hcho/trends`

HCHO column density time-series trends.

| Param | Type | Required | Description |
|---|---|---|---|
| `days` | integer | No | Lookback days |

---

## Fire Endpoints (`/api/fire/`)

### `GET /api/fire/`

Active fire overview with summary counts.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Target date |

### `GET /api/fire/records`

Individual NASA FIRMS fire detections.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Target date |
| `state` | string | No | Filter by state |
| `source` | string | No | `MODIS` or `VIIRS` |

**Response fields:** `latitude`, `longitude`, `frp`, `brightness`, `confidence`, `satellite`, `daynight`, `state`, `district`.

### `GET /api/fire/correlation`

Fire ↔ HCHO statistical correlation analysis.

| Param | Type | Required | Description |
|---|---|---|---|
| `start_date` | string | No | Analysis period start |
| `end_date` | string | No | Analysis period end |

**Response fields:** `pearson_r`, `pearson_p`, `spearman_r`, `spearman_p`, `optimal_lag_days`.

---

## Transport Endpoints (`/api/transport/`)

### `GET /api/transport/wind-vectors`

ERA5 wind field grid data for vector visualization.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Target date |

**Response fields:** `latitude`, `longitude`, `u_wind`, `v_wind`, `wind_speed`, `wind_direction`.

### `GET /api/transport/source-attribution`

Back-trajectory pollutant source attribution.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Target date |

---

## Weather Endpoints (`/api/weather/`)

### `GET /api/weather/forecast`

FourCastNet AI weather forecast grid.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | Forecast base date |

**Response:** Grid of temperature, wind, humidity, precipitation, and PBL height forecasts.

---

## Insights Endpoints (`/api/insights/`)

### `GET /api/insights/`

Retrieve stored AI-generated environmental alerts.

### `POST /api/insights/generate`

Trigger new Gemini AI insight generation.

**Body:** Optional parameters for region/date scope.

**Response:** Generated insight with `title`, `summary`, `detailed_text`, `severity`, `region`.

---

## Reports Endpoints (`/api/reports/`)

### `POST /api/reports/generate`

Generate and download a scientific PDF report.

**Body:** Report configuration (type, region, date range).

**Response:** PDF file download or report metadata with `pdf_path`.

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "detail": "Error description message"
}
```

| Status Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request / invalid parameters |
| 404 | Resource not found |
| 500 | Internal server error |

---

**← [[Database Schema]]** | **Next: [[Data Sources & Ingestion Pipelines]] →**
