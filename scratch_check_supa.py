import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table("meteorological_data").select(
    "latitude, longitude, u_wind_850hpa, v_wind_850hpa, u_wind_10m, v_wind_10m"
).eq("observed_date", "2026-06-18").limit(5000).execute()

data = res.data or []
valid_10m = sum(1 for r in data if r.get("u_wind_10m") is not None)
print(f"Out of {len(data)} rows fetched, {valid_10m} have valid 10m wind data.")
