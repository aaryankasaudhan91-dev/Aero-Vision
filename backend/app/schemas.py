"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum


# ── Enums ──
class AQICategory(str, Enum):
    GOOD = "Good"
    SATISFACTORY = "Satisfactory"
    MODERATE = "Moderate"
    POOR = "Poor"
    VERY_POOR = "Very Poor"
    SEVERE = "Severe"


class PollutantType(str, Enum):
    PM25 = "PM2.5"
    PM10 = "PM10"
    NO2 = "NO2"
    SO2 = "SO2"
    CO = "CO"
    O3 = "O3"
    HCHO = "HCHO"


class HotspotMethod(str, Enum):
    DBSCAN = "dbscan"
    GETIS_ORD = "getis_ord"
    MORANS_I = "morans_i"
    PERCENTILE = "percentile"


class Season(str, Enum):
    KHARIF = "kharif"
    RABI = "rabi"
    FOREST_FIRE = "forest_fire"
    ANNUAL = "annual"


# ── Base Schemas ──
class GeoPoint(BaseModel):
    latitude: float
    longitude: float


class DateRange(BaseModel):
    start_date: date
    end_date: date


# ── AQI Schemas ──
class AQIObservation(BaseModel):
    station_id: str
    station_name: str
    city: str
    state: str
    latitude: float
    longitude: float
    observed_at: datetime
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    o3: Optional[float] = None
    aqi: Optional[int] = None
    aqi_category: Optional[str] = None
    prominent_pollutant: Optional[str] = None


class AQIPrediction(BaseModel):
    latitude: float
    longitude: float
    prediction_date: date
    model_name: str
    pm25_predicted: Optional[float] = None
    no2_predicted: Optional[float] = None
    so2_predicted: Optional[float] = None
    co_predicted: Optional[float] = None
    o3_predicted: Optional[float] = None
    aqi_predicted: Optional[int] = None
    aqi_category: Optional[str] = None
    confidence: Optional[float] = None


class AQIMapResponse(BaseModel):
    map_type: str
    map_date: date
    region_type: str
    region_name: Optional[str] = None
    avg_aqi: Optional[float] = None
    max_aqi: Optional[float] = None
    dominant_pollutant: Optional[str] = None
    aqi_category: Optional[str] = None
    pm25_avg: Optional[float] = None
    no2_avg: Optional[float] = None
    so2_avg: Optional[float] = None
    co_avg: Optional[float] = None
    o3_avg: Optional[float] = None
    raster_path: Optional[str] = None


class AQIQueryParams(BaseModel):
    date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    state: Optional[str] = None
    city: Optional[str] = None
    map_type: Optional[str] = "daily"
    region_type: Optional[str] = "india"


# ── HCHO Schemas ──
class HCHOHotspot(BaseModel):
    id: int
    detection_method: str
    hotspot_date: date
    period_type: str
    cluster_id: Optional[int] = None
    centroid_lat: float
    centroid_lon: float
    area_sq_km: Optional[float] = None
    mean_hcho: Optional[float] = None
    max_hcho: Optional[float] = None
    percentile_rank: Optional[float] = None
    z_score: Optional[float] = None
    p_value: Optional[float] = None
    pixel_count: Optional[int] = None
    region_name: Optional[str] = None
    state: Optional[str] = None
    season: Optional[str] = None
    fire_association: bool = False
    confidence: Optional[float] = None


class HCHOQueryParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    method: Optional[HotspotMethod] = None
    season: Optional[Season] = None
    state: Optional[str] = None
    min_hcho: Optional[float] = None


# ── Fire Schemas ──
class FireRecord(BaseModel):
    source: str
    detected_at: datetime
    latitude: float
    longitude: float
    frp: Optional[float] = None
    brightness: Optional[float] = None
    confidence: Optional[int] = None
    satellite: Optional[str] = None
    state: Optional[str] = None
    fire_type: Optional[str] = None


class FireHCHOCorrelation(BaseModel):
    region_name: str
    state: Optional[str] = None
    season: Optional[str] = None
    pearson_r: Optional[float] = None
    pearson_p: Optional[float] = None
    spearman_r: Optional[float] = None
    spearman_p: Optional[float] = None
    optimal_lag_days: Optional[int] = None
    lag_correlation: Optional[float] = None
    fire_count: Optional[int] = None
    mean_frp: Optional[float] = None
    mean_hcho: Optional[float] = None


# ── Transport Schemas ──
class TransportVector(BaseModel):
    analysis_date: date
    source_lat: float
    source_lon: float
    wind_u_850: Optional[float] = None
    wind_v_850: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    transport_distance_km: Optional[float] = None
    source_region: Optional[str] = None
    receptor_region: Optional[str] = None


# ── Insight Schemas ──
class AIInsight(BaseModel):
    id: int
    insight_type: str
    title: str
    summary: str
    detailed_text: Optional[str] = None
    region: Optional[str] = None
    state: Optional[str] = None
    severity: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


# ── Report Schemas ──
class ReportRequest(BaseModel):
    report_type: str = "research_paper"
    title: str = "Surface AQI & HCHO Hotspot Analysis"
    date_range: Optional[DateRange] = None
    include_sections: List[str] = Field(
        default=["abstract", "introduction", "methodology",
                 "datasets", "results", "discussion",
                 "conclusion", "references"]
    )


class ReportResponse(BaseModel):
    id: int
    report_type: str
    title: str
    abstract: Optional[str] = None
    pdf_path: Optional[str] = None
    generated_at: datetime
    status: str


# ── Model Evaluation ──
class ModelEvaluation(BaseModel):
    model_name: str
    target_variable: str
    rmse: float
    mae: float
    r_squared: float
    pearson_r: float
    training_samples: int
    is_active: bool = False


# ── Dashboard Summary ──
class DashboardSummary(BaseModel):
    total_stations: int
    active_stations: int
    latest_aqi_date: Optional[date] = None
    avg_aqi_today: Optional[float] = None
    hotspot_count: Optional[int] = None
    fire_count_today: Optional[int] = None
    models_trained: int
    best_model: Optional[str] = None
    best_model_r2: Optional[float] = None


# ── Generic Responses ──
class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
