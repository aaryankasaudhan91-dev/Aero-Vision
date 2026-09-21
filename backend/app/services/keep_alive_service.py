"""
Automated Free Keep-Alive Service for Project AeroVision.
Prevents Render / free-tier cloud containers from spinning down after 10-15 minutes of inactivity.

How it works:
Render's free tier spins down web services after 15 minutes of receiving no inbound traffic.
This background service periodically (default: every 10 minutes) sends an HTTP GET request
to the backend's public URL through Render's external router. Because the request originates
over the public network and enters through Render's edge proxy, it registers as external inbound
HTTP traffic, successfully resetting Render's 15-minute inactivity countdown.
"""

import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import httpx
from loguru import logger

from app.config import get_settings


class KeepAliveService:
    """Manages the background keep-alive ping loop for free-tier hosting."""

    def __init__(self):
        self._settings = get_settings()
        self._task: Optional[asyncio.Task] = None
        self._is_running: bool = False
        self._start_time: Optional[datetime] = None

        # Diagnostic metrics
        self.total_pings: int = 0
        self.successful_pings: int = 0
        self.failed_pings: int = 0
        self.last_ping_time: Optional[datetime] = None
        self.last_status_code: Optional[int] = None
        self.last_latency_ms: Optional[float] = None
        self.last_error: Optional[str] = None
        self.next_ping_time: Optional[datetime] = None

    def get_target_url(self) -> str:
        """
        Determines the public endpoint URL to ping.
        Priority:
        1. KEEP_ALIVE_URL (explicit manual override in env)
        2. RENDER_EXTERNAL_URL (automatically provided by Render)
        3. Production fallback (https://aero-vision.onrender.com)
        4. Local development fallback (http://127.0.0.1:{APP_PORT})
        """
        # 1. Manual override from environment
        if self._settings.KEEP_ALIVE_URL:
            return self._settings.KEEP_ALIVE_URL.rstrip("/")

        # 2. Render auto-injected environment variable (populated automatically in cloud)
        if self._settings.RENDER_EXTERNAL_URL:
            return self._settings.RENDER_EXTERNAL_URL.rstrip("/")

        # 3. Default fallback (local host port)
        return f"http://127.0.0.1:{self._settings.APP_PORT}"

    def get_status(self) -> Dict[str, Any]:
        """Returns diagnostic status of the keep-alive service."""
        target_base = self.get_target_url()
        interval_min = self._settings.KEEP_ALIVE_INTERVAL_MINUTES
        now = datetime.now(timezone.utc)

        seconds_until_next = None
        if self.next_ping_time and self._is_running:
            diff = (self.next_ping_time - now).total_seconds()
            seconds_until_next = max(0, int(diff))

        uptime_seconds = None
        if self._start_time:
            uptime_seconds = int((now - self._start_time).total_seconds())

        return {
            "enabled": self._settings.KEEP_ALIVE_ENABLED,
            "is_running": self._is_running,
            "target_url": f"{target_base}/api/health",
            "interval_minutes": interval_min,
            "seconds_until_next_ping": seconds_until_next,
            "uptime_seconds": uptime_seconds,
            "total_pings": self.total_pings,
            "successful_pings": self.successful_pings,
            "failed_pings": self.failed_pings,
            "last_ping_time": self.last_ping_time.isoformat() if self.last_ping_time else None,
            "last_status_code": self.last_status_code,
            "last_latency_ms": round(self.last_latency_ms, 2) if self.last_latency_ms is not None else None,
            "last_error": self.last_error,
            "next_ping_time": self.next_ping_time.isoformat() if self.next_ping_time else None,
            "workaround_summary": (
                "Automated Free Tier Keep-Alive: Sends an HTTP GET every "
                f"{interval_min} minutes to reset Render's 15-minute idle sleep timer."
            ),
        }

    async def ping_now(self) -> Dict[str, Any]:
        """Executes a single keep-alive ping immediately and records telemetry."""
        target_base = self.get_target_url()
        target_endpoint = f"{target_base}/api/health"

        self.total_pings += 1
        start = time.perf_counter()
        now = datetime.now(timezone.utc)
        self.last_ping_time = now

        try:
            async with httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
                headers={"User-Agent": "AeroVision-KeepAlive/1.0"}
            ) as client:
                response = await client.get(target_endpoint)
                latency = (time.perf_counter() - start) * 1000.0

                self.last_latency_ms = latency
                self.last_status_code = response.status_code
                self.last_error = None

                if response.is_success:
                    self.successful_pings += 1
                    logger.info(
                        f"🔄 [KeepAlive Workaround] Successfully pinged {target_endpoint} "
                        f"-> Status {response.status_code} ({latency:.1f}ms). Free tier sleep prevented."
                    )
                    return {
                        "success": True,
                        "target_url": target_endpoint,
                        "status_code": response.status_code,
                        "latency_ms": round(latency, 2),
                        "message": "Keep-alive ping successful. Inactivity timer reset.",
                    }
                else:
                    self.failed_pings += 1
                    logger.warning(
                        f"⚠️ [KeepAlive Workaround] Ping to {target_endpoint} returned status {response.status_code} "
                        f"({latency:.1f}ms)."
                    )
                    return {
                        "success": False,
                        "target_url": target_endpoint,
                        "status_code": response.status_code,
                        "latency_ms": round(latency, 2),
                        "message": f"Server responded with non-200 code: {response.status_code}",
                    }

        except Exception as exc:
            latency = (time.perf_counter() - start) * 1000.0
            self.failed_pings += 1
            self.last_latency_ms = latency
            self.last_status_code = None
            self.last_error = str(exc)
            logger.warning(f"⚠️ [KeepAlive Workaround] Ping to {target_endpoint} failed: {exc}")
            return {
                "success": False,
                "target_url": target_endpoint,
                "status_code": None,
                "latency_ms": round(latency, 2),
                "error": str(exc),
                "message": "Network error during keep-alive ping. Will retry automatically.",
            }

    async def _run_loop(self):
        """Main background loop."""
        interval_seconds = max(60, self._settings.KEEP_ALIVE_INTERVAL_MINUTES * 60)
        target_url = self.get_target_url()
        logger.info(
            f"🚀 [KeepAlive Workaround] Background loop started. "
            f"Target: {target_url}/api/health | Interval: {self._settings.KEEP_ALIVE_INTERVAL_MINUTES} min."
        )

        # Initial wait of 25 seconds after server boot to allow FastAPI to start cleanly
        try:
            await asyncio.sleep(25)
        except asyncio.CancelledError:
            return

        while self._is_running:
            try:
                # Update next ping time for UI / status endpoints
                now = datetime.now(timezone.utc)
                from datetime import timedelta
                self.next_ping_time = now + timedelta(seconds=interval_seconds)

                # Execute ping
                await self.ping_now()

                # Sleep until next scheduled interval
                await asyncio.sleep(interval_seconds)

            except asyncio.CancelledError:
                logger.info("🛑 [KeepAlive Workaround] Background task cancelled.")
                break
            except Exception as e:
                logger.error(f"❌ [KeepAlive Workaround] Unexpected error in loop: {e}")
                # Wait 60s before retrying if an unexpected error occurs
                try:
                    await asyncio.sleep(60)
                except asyncio.CancelledError:
                    break

    def start(self):
        """Starts the keep-alive background worker task."""
        if not self._settings.KEEP_ALIVE_ENABLED:
            logger.info("ℹ️ [KeepAlive Workaround] Disabled via KEEP_ALIVE_ENABLED=False.")
            return

        if self._is_running:
            logger.debug("ℹ️ [KeepAlive Workaround] Already running.")
            return

        self._is_running = True
        self._start_time = datetime.now(timezone.utc)
        self._task = asyncio.create_task(self._run_loop())
        logger.info("✅ [KeepAlive Workaround] Background keep-alive worker launched successfully.")

    async def stop(self):
        """Stops the keep-alive background worker task gracefully."""
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        logger.info("🛑 [KeepAlive Workaround] Background keep-alive worker stopped.")


# Global singleton
keep_alive_service = KeepAliveService()
