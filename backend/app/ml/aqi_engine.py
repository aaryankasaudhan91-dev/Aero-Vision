"""
AQI Engine — Module 4
Implements official CPCB National AQI (NAQI) methodology.
Generates daily/weekly/monthly AQI at India/state/district levels.
"""

import numpy as np
from typing import Dict, Optional, Tuple
from loguru import logger


# CPCB NAQI Breakpoints — 6 categories
# Each pollutant: list of (AQI_low, AQI_high, Conc_low, Conc_high)
BREAKPOINTS = {
    "PM2.5": [  # μg/m³, 24-hour average
        (0, 50, 0, 30),
        (51, 100, 31, 60),
        (101, 200, 61, 90),
        (201, 300, 91, 120),
        (301, 400, 121, 250),
        (401, 500, 251, 380),
    ],
    "PM10": [  # μg/m³, 24-hour average
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 200, 101, 250),
        (201, 300, 251, 350),
        (301, 400, 351, 430),
        (401, 500, 431, 510),
    ],
    "NO2": [  # μg/m³, 24-hour average
        (0, 50, 0, 40),
        (51, 100, 41, 80),
        (101, 200, 81, 180),
        (201, 300, 181, 280),
        (301, 400, 281, 400),
        (401, 500, 401, 520),
    ],
    "SO2": [  # μg/m³, 24-hour average
        (0, 50, 0, 40),
        (51, 100, 41, 80),
        (101, 200, 81, 380),
        (201, 300, 381, 800),
        (301, 400, 801, 1600),
        (401, 500, 1601, 2100),
    ],
    "CO": [  # mg/m³, 8-hour average
        (0, 50, 0, 1.0),
        (51, 100, 1.1, 2.0),
        (101, 200, 2.1, 10.0),
        (201, 300, 10.1, 17.0),
        (301, 400, 17.1, 34.0),
        (401, 500, 34.1, 46.0),
    ],
    "O3": [  # μg/m³, 8-hour average
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 200, 101, 168),
        (201, 300, 169, 208),
        (301, 400, 209, 748),
        (401, 500, 749, 940),
    ],
    "NH3": [  # μg/m³, 24-hour average
        (0, 50, 0, 200),
        (51, 100, 201, 400),
        (101, 200, 401, 800),
        (201, 300, 801, 1200),
        (301, 400, 1201, 1800),
        (401, 500, 1801, 2400),
    ],
}

AQI_CATEGORIES = {
    (0, 50): "Good",
    (51, 100): "Satisfactory",
    (101, 200): "Moderate",
    (201, 300): "Poor",
    (301, 400): "Very Poor",
    (401, 500): "Severe",
}

AQI_COLORS = {
    "Good": "#009966",
    "Satisfactory": "#58B453",
    "Moderate": "#FFDE33",
    "Poor": "#FF9933",
    "Very Poor": "#CC0033",
    "Severe": "#660099",
}


def compute_sub_index(pollutant: str, concentration: float) -> Optional[int]:
    """Compute AQI sub-index for a single pollutant using CPCB breakpoints."""
    if concentration is None or np.isnan(concentration) or concentration < 0:
        return None

    breakpoints = BREAKPOINTS.get(pollutant)
    if not breakpoints:
        return None

    for aqi_lo, aqi_hi, conc_lo, conc_hi in breakpoints:
        if conc_lo <= concentration <= conc_hi:
            # Linear interpolation
            aqi = ((aqi_hi - aqi_lo) / (conc_hi - conc_lo)) * (concentration - conc_lo) + aqi_lo
            return round(aqi)

    # Beyond maximum breakpoint → cap at 500
    if concentration > breakpoints[-1][3]:
        return 500

    return None


def compute_aqi(concentrations: Dict[str, Optional[float]]) -> Dict:
    """
    Compute overall AQI from pollutant concentrations using CPCB methodology.
    AQI = max of all sub-indices. Minimum 3 pollutants needed (including PM2.5 or PM10).
    """
    sub_indices = {}
    for pollutant, conc in concentrations.items():
        if conc is not None:
            si = compute_sub_index(pollutant, conc)
            if si is not None:
                sub_indices[pollutant] = si

    # Minimum data requirement
    has_pm = "PM2.5" in sub_indices or "PM10" in sub_indices
    if len(sub_indices) < 3 or not has_pm:
        return {
            "aqi": None,
            "category": None,
            "prominent_pollutant": None,
            "sub_indices": sub_indices,
            "sufficient_data": False,
        }

    # AQI = maximum sub-index
    aqi_value = max(sub_indices.values())
    prominent = max(sub_indices, key=sub_indices.get)

    # Determine category
    category = None
    for (lo, hi), cat in AQI_CATEGORIES.items():
        if lo <= aqi_value <= hi:
            category = cat
            break
    if aqi_value > 500:
        category = "Severe"

    return {
        "aqi": aqi_value,
        "category": category,
        "color": AQI_COLORS.get(category, "#999999"),
        "prominent_pollutant": prominent,
        "sub_indices": sub_indices,
        "sufficient_data": True,
    }


def compute_daily_aqi(hourly_observations: list) -> Dict:
    """Compute daily AQI from hourly observations."""
    import pandas as pd

    if not hourly_observations:
        return {"aqi": None, "category": None}

    df = pd.DataFrame(hourly_observations)
    daily_means = {}

    # 24-hour averages for PM2.5, PM10, NO2, SO2, NH3
    for pol in ["pm25", "pm10", "no2", "so2", "nh3"]:
        if pol in df.columns:
            vals = df[pol].dropna()
            if len(vals) >= 16:  # Minimum 16 hours of data
                daily_means[pol.upper().replace("PM25", "PM2.5")] = vals.mean()

    # 8-hour maximum for CO and O3
    for pol in ["co", "o3"]:
        if pol in df.columns:
            vals = df[pol].dropna()
            if len(vals) >= 8:
                # Rolling 8-hour average, take maximum
                rolling_8h = vals.rolling(window=8, min_periods=6).mean()
                daily_means[pol.upper()] = rolling_8h.max()

    return compute_aqi(daily_means)


async def generate_aqi_maps(prediction_date: str, model_predictions: list) -> Dict:
    """Generate AQI map from model predictions and store in Supabase."""
    from app.database import supabase

    aqi_results = []
    for pred in model_predictions:
        concentrations = {
            "PM2.5": pred.get("pm25_predicted"),
            "NO2": pred.get("no2_predicted"),
            "SO2": pred.get("so2_predicted"),
            "CO": pred.get("co_predicted"),
            "O3": pred.get("o3_predicted"),
        }
        result = compute_aqi(concentrations)
        if result["aqi"] is not None:
            pred["aqi_predicted"] = result["aqi"]
            pred["aqi_category"] = result["category"]
            aqi_results.append(pred)

    # Store predictions with AQI
    batch = []
    for r in aqi_results:
        batch.append({
            "model_name": r.get("model_name", "best_model"),
            "prediction_date": prediction_date,
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "pm25_predicted": r.get("pm25_predicted"),
            "no2_predicted": r.get("no2_predicted"),
            "so2_predicted": r.get("so2_predicted"),
            "co_predicted": r.get("co_predicted"),
            "o3_predicted": r.get("o3_predicted"),
            "aqi_predicted": r.get("aqi_predicted"),
            "aqi_category": r.get("aqi_category"),
        })
        if len(batch) >= 500:
            supabase.table("model_predictions").insert(batch).execute()
            batch = []

    if batch:
        supabase.table("model_predictions").insert(batch).execute()

    # Compute India-level summary
    aqi_values = [r["aqi_predicted"] for r in aqi_results if r.get("aqi_predicted")]
    if aqi_values:
        map_record = {
            "map_type": "daily",
            "map_date": prediction_date,
            "period_start": prediction_date,
            "period_end": prediction_date,
            "region_type": "india",
            "region_name": "India",
            "avg_aqi": round(np.mean(aqi_values), 1),
            "max_aqi": int(max(aqi_values)),
            "min_aqi": int(min(aqi_values)),
            "aqi_category": compute_aqi({"PM2.5": np.mean([r.get("pm25_predicted", 0) or 0 for r in aqi_results])})["category"],
        }
        supabase.table("aqi_maps").insert(map_record).execute()

    logger.info(f"Generated AQI map for {prediction_date}: {len(aqi_results)} points")
    return {"date": prediction_date, "total_points": len(aqi_results)}
