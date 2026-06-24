"""Reports API Router — Research paper and report generation."""

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from app.schemas import ReportRequest
from app.services.report_service import ReportService

router = APIRouter()
report_service = ReportService()


@router.get("/")
async def list_reports(
    report_type: Optional[str] = Query(None, enum=["research_paper", "technical_report", "presentation"]),
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
):
    """List all generated reports with query filters."""
    return await report_service.list_reports(
        report_type=report_type,
        search=search,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )


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
    """Download report as a beautifully typeset PDF file."""
    pdf_buffer = await report_service.download_report_pdf(report_id)
    if not pdf_buffer:
        raise HTTPException(status_code=404, detail="Report not found or compilation failed")
        
    report = await report_service.get_report(report_id)
    title_slug = report.get("title", f"report_{report_id}").lower().replace(" ", "_")
    # Clean filename to include only alphanumeric and underscores
    title_slug = "".join(c for c in title_slug if c.isalnum() or c == "_")
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{title_slug}.pdf"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

