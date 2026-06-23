import os
import asyncio
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.ml.correlation_transport import TransportAnalyzer

async def main():
    analyzer = TransportAnalyzer()
    print("Running transport analysis for 2026-06-18...")
    records = await analyzer.analyze_transport("2026-06-18")
    print(f"Successfully calculated and inserted {len(records)} records:")
    for r in records:
        print(f"- {r['source_region']}: speed={r['wind_speed']} m/s, dir={r['wind_direction']}°, dist={r['transport_distance_km']} km")

if __name__ == "__main__":
    asyncio.run(main())
