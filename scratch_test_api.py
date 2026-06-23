import requests

date_str = "2026-06-22"
base_url = "http://127.0.0.1:8000/api/transport"

endpoints = [
    f"{base_url}/?date={date_str}",
    f"{base_url}/wind-vectors?date={date_str}",
    f"{base_url}/pathways?start_date={date_str}&end_date={date_str}",
    f"{base_url}/source-attribution?receptor_lat=28.6139&receptor_lon=77.2090&date={date_str}"
]

for url in endpoints:
    try:
        res = requests.get(url)
        print(f"URL: {url}")
        print(f"Status Code: {res.status_code}")
        try:
            data = res.json()
            if isinstance(data, list):
                print(f"Response: list of length {len(data)}")
                if len(data) > 0:
                    print(f"Sample: {data[0]}")
            else:
                print(f"Response: dictionary with keys {list(data.keys())}")
                if "trajectory" in data:
                    print(f"Trajectory length: {len(data['trajectory'])}")
        except Exception as e:
            print(f"JSON Decode Error: {e}. Text: {res.text[:200]}")
    except Exception as e:
        print(f"Request Error for {url}: {e}")
    print("-" * 50)

