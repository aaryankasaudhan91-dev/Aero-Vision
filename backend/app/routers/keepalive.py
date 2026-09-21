"""
Keep-Alive API Router — Project AeroVision.
Endpoints to inspect, monitor, and manually trigger the Automated Free Workaround for 15-minute sleep prevention.
"""

from fastapi import APIRouter
from typing import Dict, Any
from app.services.keep_alive_service import keep_alive_service

router = APIRouter()


@router.get("", summary="Get Keep-Alive Status")
@router.get("/", summary="Get Keep-Alive Status")
@router.get("/status", summary="Get Keep-Alive Diagnostic Status")
async def get_keep_alive_status() -> Dict[str, Any]:
    """
    Get real-time telemetry and status of the Automated Free Keep-Alive Workaround.
    Displays target URL, ping count, uptime, next ping time, and sleep prevention status.
    """
    return keep_alive_service.get_status()


@router.post("/ping", summary="Trigger Immediate Keep-Alive Ping")
async def trigger_keep_alive_ping() -> Dict[str, Any]:
    """
    Manually trigger an immediate keep-alive ping to the public health endpoint.
    Useful for testing, external webhooks, or manual wake-up verification.
    """
    result = await keep_alive_service.ping_now()
    return {
        "action": "manual_keep_alive_ping",
        "result": result,
        "current_status": keep_alive_service.get_status(),
    }
