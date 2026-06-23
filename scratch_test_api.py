import requests
try:
    res = requests.get("http://127.0.0.1:8000/api/transport/wind-vectors?date=2026-06-23")
    print(res.json()[:5])
except Exception as e:
    print(f"Error: {e}")
