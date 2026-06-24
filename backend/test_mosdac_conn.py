import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()

username = os.getenv("MOSDAC_USERNAME")
password = os.getenv("MOSDAC_PASSWORD")

print(f"Testing MOSDAC credentials for username: {username}")

token_url = "https://mosdac.gov.in/download_api/gettoken"
search_url = "https://mosdac.gov.in/apios/datasets.json"

data = {
    "username": username,
    "password": password
}

try:
    response = requests.post(token_url, json=data)
    print(f"Token Status Code: {response.status_code}")
    if response.status_code == 200:
        tokens = response.json()
        print("Successfully obtained tokens!")
        access_token = tokens.get("access_token")
        
        # Test Search
        search_params = {
            "datasetId": "3DIMG_L2G_AOD",
            "startTime": "2026-06-18",
            "endTime": "2026-06-18"
        }
        res = requests.get(search_url, params=search_params)
        print(f"Search Status Code: {res.status_code}")
        if res.status_code == 200:
            search_data = res.json()
            print(f"Total Results: {search_data.get('totalResults')}")
            print(f"Total Size MB: {search_data.get('totalSizeMB')}")
            entries = search_data.get('entries', [])
            print(f"Number of entries: {len(entries)}")
            if entries:
                print(f"First entry identifier: {entries[0].get('identifier')}")
        else:
            print(f"Search error response: {res.text}")
    else:
        print(f"Token error response: {response.text}")
except Exception as e:
    print(f"Exception occurred: {e}")
