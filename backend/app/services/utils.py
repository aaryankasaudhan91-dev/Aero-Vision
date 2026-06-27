"""Utility functions for backend services."""

from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List
from loguru import logger
import math
from app.database import supabase
from app.config import get_settings

settings = get_settings()

def fetch_cpcb_observations(target_date: date):
    """Fetch real CPCB ground observations from Data.gov.in for a target date."""
    api_key = settings.DATA_GOV_IN_API_KEY
    if not api_key:
        logger.warning("No DATA_GOV_IN_API_KEY provided. Skipping real data fetch.")
        return
        
    try:
        if "resource" in api_key:
            url = f"https://api.data.gov.in{api_key}?format=json&limit=500"
        else:
            url = f"https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key={api_key}&format=json&limit=500"
            
        logger.info(f"Fetching real CPCB observations for {target_date}...")
        import requests
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            logger.info("Successfully fetched CPCB data.")
    except Exception as e:
        logger.error(f"Error fetching real cpcb_observations: {e}")

def fetch_tropomi_products(target_date: date):
    """Fetch real Sentinel-5P TROPOMI data (Requires GEE or Copernicus)."""
    logger.info(f"Skipping mock TROPOMI generation for {target_date}. Real data must be ingested via scheduled pipeline.")

def fetch_hcho_hotspots(target_date: date):
    """Fetch real HCHO hotspots."""
    logger.info(f"Skipping mock HCHO hotspots generation for {target_date}.")

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
        resp = requests.get(url, timeout=20)
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

def fetch_meteorological_data(target_date: date):
    """Fetch real meteorological data."""
    logger.info(f"Skipping mock meteorological data generation for {target_date}. Real data must be ingested via scheduled pipeline using CDS_API_KEY.")

def check_and_seed_date_data(table_name: str, target_date: date):
    """Check if table has data for target date range; fetch real data if missing."""
    dates_to_check = [target_date - timedelta(days=d) for d in range(2)]
    
    for cur_date in dates_to_check:
        try:
            if table_name == "cpcb_observations":
                res = supabase.table("cpcb_observations").select("observed_at").gte("observed_at", f"{cur_date}T00:00:00").lte("observed_at", f"{cur_date}T23:59:59").limit(1).execute()
                if not res.data:
                    fetch_cpcb_observations(cur_date)
            elif table_name == "tropomi_products":
                res = supabase.table("tropomi_products").select("observed_date").eq("product_type", "HCHO").eq("observed_date", str(cur_date)).limit(1).execute()
                if not res.data:
                    fetch_tropomi_products(cur_date)
            elif table_name == "fire_records":
                res = supabase.table("fire_records").select("detected_date").eq("detected_date", str(cur_date)).limit(1).execute()
                if not res.data:
                    fetch_fire_records(cur_date)
            elif table_name == "meteorological_data":
                res = supabase.table("meteorological_data").select("observed_date").eq("source", "ERA5").eq("observed_date", str(cur_date)).limit(1).execute()
                if not res.data:
                    fetch_meteorological_data(cur_date)
        except Exception as e:
            logger.error(f"Error checking/fetching {table_name} on {cur_date}: {e}")

def find_nearest_date(table_name: str, date_column: str, target_date: date, filters: Optional[Dict[str, Any]] = None) -> date:
    """Find the nearest date with data in a given table to the target date."""
    try:
        check_and_seed_date_data(table_name, target_date)
        
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

        query_past = supabase.table(table_name).select(select_cols)
        if filters:
            for k, v in filters.items():
                query_past = query_past.eq(k, v)
        
        if table_name == "cpcb_observations":
            query_past = query_past.lte(date_column, f"{target_date}T23:59:59")
        else:
            query_past = query_past.lte(date_column, str(target_date))
            
        res_past = query_past.order(date_column, desc=True).limit(1).execute()
        
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
            
        if past_date and future_date:
            diff_past = abs((target_date - past_date).days)
            diff_future = abs((future_date - target_date).days)
            return past_date if diff_past <= diff_future else future_date
        elif past_date:
            return past_date
        elif future_date:
            return future_date
            
        return target_date
    except Exception as e:
        logger.error(f"Error finding nearest date in {table_name}: {e}")
        return target_date
