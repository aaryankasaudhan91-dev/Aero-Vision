import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

dotenv_path = r"backend\.env"
load_dotenv(dotenv_path)

db_url = os.getenv("DATABASE_URL")
async_db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(async_db_url)
    async with engine.connect() as conn:
        # Check meteorological data counts
        res = await conn.execute(text("SELECT count(*) FROM meteorological_data"))
        total = res.scalar()
        print(f"Total rows in meteorological_data: {total}")

        res = await conn.execute(text("SELECT count(*) FROM meteorological_data WHERE u_wind_850hpa IS NOT NULL"))
        non_null_850 = res.scalar()
        print(f"Rows with non-null u_wind_850hpa: {non_null_850}")

        res = await conn.execute(text("SELECT count(*) FROM meteorological_data WHERE u_wind_10m IS NOT NULL"))
        non_null_10m = res.scalar()
        print(f"Rows with non-null u_wind_10m: {non_null_10m}")

        res = await conn.execute(text("SELECT count(*) FROM meteorological_data WHERE wind_speed_10m IS NOT NULL"))
        non_null_speed = res.scalar()
        print(f"Rows with non-null wind_speed_10m: {non_null_speed}")

        # Show a sample of non-null rows
        if non_null_850 > 0:
            sample_res = await conn.execute(text("SELECT latitude, longitude, u_wind_850hpa, v_wind_850hpa FROM meteorological_data WHERE u_wind_850hpa IS NOT NULL LIMIT 5"))
            print("Sample non-null 850hpa rows:")
            for row in sample_res.fetchall():
                print(row)
        else:
            print("No non-null 850hpa rows found!")

        if non_null_10m > 0:
            sample_res = await conn.execute(text("SELECT latitude, longitude, u_wind_10m, v_wind_10m FROM meteorological_data WHERE u_wind_10m IS NOT NULL LIMIT 5"))
            print("Sample non-null 10m rows:")
            for row in sample_res.fetchall():
                print(row)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
