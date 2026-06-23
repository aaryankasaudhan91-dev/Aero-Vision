import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("meteorological_data").select(
        "latitude, longitude, u_wind_850hpa, v_wind_850hpa, u_wind_10m, v_wind_10m"
    ).eq("observed_date", "2026-06-18").neq("u_wind_10m", None).limit(5).execute()
    print("Using neq:", len(res.data) if res.data else "None")
except Exception as e:
    print("neq error:", e)

try:
    res2 = supabase.table("meteorological_data").select(
        "latitude, longitude, u_wind_850hpa, v_wind_850hpa, u_wind_10m, v_wind_10m"
    ).eq("observed_date", "2026-06-18").not_is_null("u_wind_10m").limit(5).execute()
    print("Using not_is_null:", len(res2.data) if res2.data else "None")
except AttributeError:
    pass
except Exception as e:
    print("not_is_null error:", e)
