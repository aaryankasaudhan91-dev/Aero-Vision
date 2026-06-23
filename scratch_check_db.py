import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Load backend .env
dotenv_path = r"d:\Devanshi 💖\Project 13(Aero Vision)\models\T1(made by Claude 4.6)\backend\.env"
load_dotenv(dotenv_path)

db_url = os.getenv("DATABASE_URL")
async_db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(async_db_url)
    async with engine.connect() as conn:
        # Get tables
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in res.fetchall()]
        print("Tables in public schema:")
        for t in tables:
            print(f"- {t}")
            # Get row count
            count_res = await conn.execute(text(f'SELECT count(*) FROM "{t}"'))
            count = count_res.scalar()
            print(f"  Count: {count}")
            # Get columns
            cols_res = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{t}'"))
            cols = cols_res.fetchall()
            print(f"  Columns: {[(c[0], c[1]) for c in cols]}")
            
            # Print sample row or max date
            date_cols = [c[0] for c in cols if "date" in c[0].lower() or "time" in c[0].lower()]
            if date_cols:
                for dc in date_cols:
                    try:
                        max_d_res = await conn.execute(text(f'SELECT max("{dc}") FROM "{t}"'))
                        min_d_res = await conn.execute(text(f'SELECT min("{dc}") FROM "{t}"'))
                        print(f"    Date column '{dc}': min={min_d_res.scalar()}, max={max_d_res.scalar()}")
                    except Exception as ex:
                        print(f"    Error getting min/max for {dc}: {ex}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
