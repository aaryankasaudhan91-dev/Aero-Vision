"""Reports API Router — Research paper and report generation."""

from fastapi import APIRouter, Query
from typing import Optional
from app.schemas import ReportRequest
from app.services.report_service import ReportService

router = APIRouter()
report_service = ReportService()


@router.get("/")
async def list_reports(
    report_type: Optional[str] = Query(None, enum=["research_paper", "technical_report", "presentation"]),
    limit: int = Query(20, le=100),
):
    """List all generated reports."""
    return await report_service.list_reports(report_type=report_type, limit=limit)


@router.post("/generate")
async def generate_report(request: ReportRequest):
    """Generate a new research report or presentation."""
    return await report_service.generate_report(request)


@router.get("/{report_id}")
async def get_report(report_id: int):
    """Get a specific report by ID."""
    return await report_service.get_report(report_id)


@router.get("/{report_id}/download")
async def download_report(report_id: int):
    """Download report as PDF."""
    return await report_service.download_report(report_id)
