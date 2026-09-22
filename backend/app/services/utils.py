"""Utility functions for backend services."""

from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List
from loguru import logger
import math
from app.database import supabase
from app.config import get_settings

settings = get_settings()

# Circuit breaker and deduplication tracker for background data seeding
_background_tasks_running = set()
_recent_failures: Dict[str, datetime] = {}
_COOLDOWN_SECONDS = 3600  # Do not re-attempt failed external endpoints for 1 hour

def fetch_cpcb_observations(target_date: date):
    """Fetch real CPCB ground observations from Data.gov.in for a target date."""
    api_key = settings.DATA_GOV_IN_API_KEY
    if not api_key or "resource" in api_key.lower():
        logger.warning("No valid DATA_GOV_IN_API_KEY provided (must be an API key, not resource path). Skipping live fetch.")
        return
        
    try:
        url = f"https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key={api_key}&format=json&limit=500"
            
        logger.info(f"Fetching real CPCB observations for {target_date}...")
        import requests
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            records = data.get("records", [])
            if records:
                logger.info(f"Successfully fetched {len(records)} CPCB records from Data.gov.in.")
                # Format and store into Supabase
                formatted = []
                for r in records:
                    station_id = r.get("station_id") or r.get("station") or r.get("id")
                    observed = r.get("last_update") or r.get("timestamp") or f"{target_date}T12:00:00Z"
                    if station_id:
                        formatted.append({
                            "station_id": str(station_id),
                            "observed_at": observed,
                            "aqi": int(float(r["aqi"])) if r.get("aqi") and str(r.get("aqi")).replace(".", "").isdigit() else None,
                            "aqi_category": r.get("aqi_category") or r.get("air_quality_status") or "Moderate",
                            "pm25": float(r["pm25"]) if r.get("pm25") else None,
                            "pm10": float(r["pm10"]) if r.get("pm10") else None,
                            "no2": float(r["no2"]) if r.get("no2") else None,
                            "so2": float(r["so2"]) if r.get("so2") else None,
                            "co": float(r["co"]) if r.get("co") else None,
                            "o3": float(r["o3"]) if r.get("o3") else None,
                        })
                if formatted:
                    chunk_size = 200
                    for i in range(0, len(formatted), chunk_size):
                        supabase.table("cpcb_observations").upsert(formatted[i:i+chunk_size]).execute()
                    logger.info(f"Ingested {len(formatted)} real CPCB observations into database.")
    except Exception as e:
        logger.error(f"Error fetching real cpcb_observations: {e}")
        _recent_failures["cpcb_observations"] = datetime.now()

def fetch_tropomi_products(target_date: date):
    """Fetch real Sentinel-5P TROPOMI data via GEE in background."""
    try:
        from app.pipelines.data_ingestion import TROPOMIIngestion
        import asyncio
        ing = TROPOMIIngestion()
        start_str = str(target_date)
        end_str = str(target_date + timedelta(days=1))
        logger.info(f"Ingesting real Sentinel-5P TROPOMI HCHO data from GEE for {start_str} to {end_str}...")
        asyncio.run(ing.ingest_from_gee("HCHO", start_str, end_str))
    except Exception as e:
        logger.error(f"Error fetching real TROPOMI data for {target_date}: {e}")
        _recent_failures["tropomi_products"] = datetime.now()

def fetch_hcho_hotspots(target_date: date):
    """Compute real HCHO hotspots using ML detection in background."""
    try:
        from app.ml.hcho_hotspot import HCHOHotspotDetector
        import asyncio
        detector = HCHOHotspotDetector()
        date_str = str(target_date)
        logger.info(f"Detecting real HCHO hotspots via ML models for {date_str}...")
        asyncio.run(detector.detect_hotspots(date_str, date_str))
    except Exception as e:
        logger.error(f"Error running real HCHO hotspot detection for {target_date}: {e}")
        _recent_failures["hcho_hotspots"] = datetime.now()

def fetch_fire_records(target_date: date):
    """Fetch real active fire detection records from NASA FIRMS."""
    api_key = settings.FIRMS_MAP_KEY
    if not api_key or "placeholder" in api_key.lower():
        logger.warning("No FIRMS_MAP_KEY provided. Skipping real data fetch.")
        return
        
    try:
        import requests
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/VIIRS_SNPP_NRT/68,6,98,38/1/{target_date}"
        logger.info(f"Fetching real FIRMS data for {target_date}...")
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            lines = resp.text.strip().split('\n')
            if len(lines) > 1:
                batch = []
                for line in lines[1:]:
                    cols = line.split(',')
                    if len(cols) >= 13:
                        batch.append({
                            "source": "VIIRS",
                            "detected_at": f"{cols[5]} {cols[6][:2]}:{cols[6][2:]}:00",
                            "detected_date": cols[5],
                            "latitude": float(cols[0]),
                            "longitude": float(cols[1]),
                            "frp": float(cols[12]),
                            "brightness": float(cols[2]),
                            "confidence": int(cols[9]) if cols[9].isdigit() else 50,
                            "satellite": cols[7],
                            "daynight": cols[13] if len(cols) > 13 else "D",
                            "state": "Unknown" 
                        })
                if batch:
                    chunk_size = 500
                    for i in range(0, len(batch), chunk_size):
                        supabase.table("fire_records").upsert(batch[i:i+chunk_size]).execute()
                    logger.info(f"Ingested {len(batch)} real fire records.")
    except Exception as e:
        logger.error(f"Error fetching real fire_records: {e}")
        _recent_failures["fire_records"] = datetime.now()

def fetch_meteorological_data(target_date: date):
    """Fetch real meteorological data."""
    logger.info(f"Skipping mock meteorological data generation for {target_date}. Real data must be ingested via scheduled pipeline using CDS_API_KEY.")

def _background_seed_worker(table_name: str, target_date: date):
    """Worker executing background ingestion without blocking user web requests."""
    task_key = f"{table_name}_{target_date}"
    if task_key in _background_tasks_running:
        return
    _background_tasks_running.add(task_key)

    try:
        if table_name == "cpcb_observations":
            fetch_cpcb_observations(target_date)
        elif table_name == "tropomi_products":
            fetch_tropomi_products(target_date)
        elif table_name == "fire_records":
            fetch_fire_records(target_date)
        elif table_name == "meteorological_data":
            fetch_meteorological_data(target_date)
    except Exception as e:
        logger.error(f"Background seed error for {table_name} on {target_date}: {e}")
    finally:
        _background_tasks_running.discard(task_key)

def check_and_seed_date_data(table_name: str, target_date: date):
    """Check if table has data; trigger asynchronous background fetch if missing and not on cooldown."""
    import threading

    # Check cooldown circuit breaker
    last_failure = _recent_failures.get(table_name)
    if last_failure and (datetime.now() - last_failure).total_seconds() < _COOLDOWN_SECONDS:
        return

    # Trigger background thread so caller returns immediately in milliseconds
    thread = threading.Thread(
        target=_background_seed_worker,
        args=(table_name, target_date),
        daemon=True,
        name=f"bg-seed-{table_name}"
    )
    thread.start()

def find_nearest_date(table_name: str, date_column: str, target_date: date, filters: Optional[Dict[str, Any]] = None) -> date:
    """
    Find the nearest date with real data in a given table to the target date.
    Executes database lookup immediately (sub-20ms) and never blocks on external APIs.
    """
    try:
        select_cols = date_column
        if filters:
            nested_tables = {}
            for key in filters.keys():
                if "." in key:
                    tbl, col = key.split(".", 1)
                    if tbl not in nested_tables:
                        nested_tables[tbl] = []
                    nested_tables[tbl].append(col)
            if nested_tables:
                join_clauses = [f"{tbl}!inner({','.join(cols)})" for tbl, cols in nested_tables.items()]
                select_cols = f"{date_column}, {', '.join(join_clauses)}"

        # 1. Query past records (<= target_date)
        query_past = supabase.table(table_name).select(select_cols)
        if filters:
            for k, v in filters.items():
                query_past = query_past.eq(k, v)
        
        if table_name == "cpcb_observations":
            query_past = query_past.lte(date_column, f"{target_date}T23:59:59")
        else:
            query_past = query_past.lte(date_column, str(target_date))
            
        res_past = query_past.order(date_column, desc=True).limit(1).execute()
        
        # 2. Query future records (>= target_date)
        query_future = supabase.table(table_name).select(select_cols)
        if filters:
            for k, v in filters.items():
                query_future = query_future.eq(k, v)
                
        if table_name == "cpcb_observations":
            query_future = query_future.gte(date_column, f"{target_date}T00:00:00")
        else:
            query_future = query_future.gte(date_column, str(target_date))
            
        res_future = query_future.order(date_column, desc=False).limit(1).execute()
        
        past_date = None
        if res_past.data:
            val = res_past.data[0][date_column]
            if "T" in val:
                val = val.split("T")[0]
            past_date = datetime.strptime(val, "%Y-%m-%d").date()
            
        future_date = None
        if res_future.data:
            val = res_future.data[0][date_column]
            if "T" in val:
                val = val.split("T")[0]
            future_date = datetime.strptime(val, "%Y-%m-%d").date()
            
        # If nearest date was found, return immediately
        nearest = None
        if past_date and future_date:
            diff_past = abs((target_date - past_date).days)
            diff_future = abs((future_date - target_date).days)
            nearest = past_date if diff_past <= diff_future else future_date
        elif past_date:
            nearest = past_date
        elif future_date:
            nearest = future_date

        if nearest:
            # If the closest data is more than 1 day old, trigger background seed without blocking
            if abs((target_date - nearest).days) > 1:
                check_and_seed_date_data(table_name, target_date)
            return nearest
            
        # Fallback: if no records at all in DB, schedule background seed and return target_date
        check_and_seed_date_data(table_name, target_date)
        return target_date

    except Exception as e:
        logger.error(f"Error finding nearest date in {table_name}: {e}")
        return target_date
