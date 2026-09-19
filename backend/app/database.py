"""
Database connections: Supabase client + resilient SQLite engine fallback.
Ensures zero-downtime real geospatial queries even during network/Supabase outages.
"""

import socket
from urllib.parse import urlparse
from supabase import create_client, Client
from app.config import get_settings
from app.local_db import LocalDBEngine, init_db
from loguru import logger

settings = get_settings()

# Initialize local real database engine on module import
init_db()
local_db = LocalDBEngine()

# Initialize raw supabase client with network circuit breaker
_supabase_available = False
_raw_supabase: Client = None

try:
    parsed = urlparse(settings.SUPABASE_URL)
    host = parsed.hostname
    if host and "placeholder" not in host:
        # Check if remote host resolves without blocking
        socket.getaddrinfo(host, 443)
        _raw_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        _supabase_available = True
        logger.info(f"Supabase cloud connected ({host}).")
    else:
        logger.info("Database Engine: Local resilient geospatial data engine active.")
except Exception:
    _supabase_available = False
    logger.info("Database Engine: Local resilient geospatial data engine active (cloud standby).")


class ResilientTableProxy:
    """Wrapper that routes queries efficiently to Supabase if connected or SQLite local engine."""

    def __init__(self, table_name: str):
        self.table_name = table_name
        self.local_query = local_db.table(table_name)
        self.supabase_query = _raw_supabase.table(table_name) if (_supabase_available and _raw_supabase) else None

    def select(self, *args, **kwargs):
        self.local_query.select(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.select(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def eq(self, *args, **kwargs):
        self.local_query.eq(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.eq(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def gte(self, *args, **kwargs):
        self.local_query.gte(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.gte(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def lte(self, *args, **kwargs):
        self.local_query.lte(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.lte(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def neq(self, *args, **kwargs):
        self.local_query.neq(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.neq(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def in_(self, *args, **kwargs):
        self.local_query.in_(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.in_(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def delete(self, *args, **kwargs):
        self.local_query.delete(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.delete(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def update(self, *args, **kwargs):
        self.local_query.update(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.update(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    @property
    def not_(self):
        parent_proxy = self
        class ResilientNotProxy:
            def is_(self, *args, **kwargs):
                parent_proxy.local_query.not_.is_(*args, **kwargs)
                if parent_proxy.supabase_query:
                    try:
                        parent_proxy.supabase_query = parent_proxy.supabase_query.not_.is_(*args, **kwargs)
                    except Exception:
                        parent_proxy.supabase_query = None
                return parent_proxy
            def eq(self, *args, **kwargs):
                return parent_proxy.neq(*args, **kwargs)
        return ResilientNotProxy()

    def order(self, *args, **kwargs):
        self.local_query.order(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.order(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def limit(self, *args, **kwargs):
        self.local_query.limit(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.limit(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def insert(self, *args, **kwargs):
        self.local_query.insert(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.insert(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def upsert(self, *args, **kwargs):
        self.local_query.upsert(*args, **kwargs)
        if self.supabase_query:
            try:
                self.supabase_query = self.supabase_query.upsert(*args, **kwargs)
            except Exception:
                self.supabase_query = None
        return self

    def execute(self):
        global _supabase_available
        if _supabase_available and self.supabase_query:
            try:
                return self.supabase_query.execute()
            except Exception:
                _supabase_available = False
                self.supabase_query = None

        return self.local_query.execute()


class ResilientSupabaseClient:
    """Drop-in replacement for Supabase Client with zero-downtime SQLite fallback."""

    def table(self, table_name: str) -> ResilientTableProxy:
        return ResilientTableProxy(table_name)


# Exported singleton matching existing usage everywhere in the codebase
supabase = ResilientSupabaseClient()
