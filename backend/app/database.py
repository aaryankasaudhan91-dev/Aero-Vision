"""
Database connections: Supabase client + SQLAlchemy async engine for PostGIS queries.
"""

from supabase import create_client, Client
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

# ── Supabase Client ──
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# ── SQLAlchemy Async Engine (for complex PostGIS spatial queries) ──
async_db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(async_db_url, echo=settings.APP_ENV == "development", pool_size=10)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency for FastAPI route injection."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
