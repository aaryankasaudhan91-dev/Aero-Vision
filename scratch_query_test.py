import os
from dotenv import load_dotenv
from supabase import create_client

# Load backend .env
dotenv_path = r"d:\Devanshi 💖\Project 13(Aero Vision)\models\T1(made by Claude 4.6)\backend\.env"
load_dotenv(dotenv_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

client = create_client(url, key)

tables_datecols = [
    ("cpcb_observations", "observed_at"),
    ("fire_records", "detected_at"),
    ("tropomi_products", "observed_date"),
    ("meteorological_data", "observed_date")
]

for table, col in tables_datecols:
    try:
        res = client.table(table).select(col).limit(1000).execute()
        dates = set()
        for row in res.data:
            val = row.get(col)
            if val:
                dates.add(val[:10])
        print(f"Table {table} distinct dates: {sorted(list(dates))}")
    except Exception as e:
        print(f"Error reading {table}: {e}")
