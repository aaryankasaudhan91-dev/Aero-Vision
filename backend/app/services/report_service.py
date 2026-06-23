"""Report Service — Research paper and report generation."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import supabase
from app.schemas import ReportRequest


class ReportService:
    """Service for generating research reports and presentations."""

    async def list_reports(self, report_type: Optional[str] = None, limit: int = 20) -> List[Dict]:
        query = supabase.table("reports").select("*")
        if report_type:
            query = query.eq("report_type", report_type)
        result = query.order("generated_at", desc=True).limit(limit).execute()
        return result.data or []

    async def generate_report(self, request: ReportRequest) -> Dict:
        """Generate a structured research report."""
        # Gather data for report sections
        content = {}

        if "abstract" in request.include_sections:
            content["abstract"] = await self._generate_abstract()

        if "introduction" in request.include_sections:
            content["introduction"] = await self._generate_introduction()

        if "methodology" in request.include_sections:
            content["methodology"] = await self._generate_methodology()

        if "datasets" in request.include_sections:
            content["datasets"] = await self._generate_dataset_description()

        if "results" in request.include_sections:
            content["results"] = await self._generate_results()

        if "discussion" in request.include_sections:
            content["discussion"] = await self._generate_discussion()

        if "conclusion" in request.include_sections:
            content["conclusion"] = await self._generate_conclusion()

        if "references" in request.include_sections:
            content["references"] = await self._generate_references()

        # Store report
        report_data = {
            "report_type": request.report_type,
            "title": request.title,
            "abstract": content.get("abstract", ""),
            "content": content,
            "status": "generated",
        }
        result = supabase.table("reports").insert(report_data).execute()
        return result.data[0] if result.data else report_data

    async def get_report(self, report_id: int) -> Dict:
        result = supabase.table("reports").select("*").eq("id", report_id).single().execute()
        return result.data if result.data else {}

    async def download_report(self, report_id: int) -> Dict:
        report = await self.get_report(report_id)
        return {"report_id": report_id, "pdf_path": report.get("pdf_path"), "status": report.get("status")}

    async def _generate_real_ai_section(self, section: str) -> str:
        from app.config import get_settings
        settings = get_settings()
        
        if not settings.GEMINI_API_KEY:
            return f"Please configure GEMINI_API_KEY in .env to enable real AI generation for {section}."
            
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            # Fetch some context
            fire_data = supabase.table("fire_records").select("*").limit(10).execute().data
            tropomi_data = supabase.table("tropomi_products").select("*").limit(10).execute().data
            
            full_prompt = (
                f"Context data from India AeroVision Satellite network:\n"
                f"Fires: {fire_data}\n"
                f"TROPOMI: {tropomi_data}\n\n"
                f"Write a comprehensive, highly scientific section for a research report on Indian Air Quality & Satellite Analysis.\n"
                f"Section to write: {section.upper()}.\n"
                f"Format in Markdown. Be detailed but concise."
            )
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_prompt,
            )
            return response.text
        except Exception as e:
            return f"Error generating report section: {str(e)}"

    async def _generate_abstract(self) -> str:
        return await self._generate_real_ai_section("abstract")

    async def _generate_introduction(self) -> str:
        return await self._generate_real_ai_section("introduction")

    async def _generate_methodology(self) -> str:
        return await self._generate_real_ai_section("methodology")

    async def _generate_dataset_description(self) -> str:
        return await self._generate_real_ai_section("datasets")

    async def _generate_results(self) -> str:
        return await self._generate_real_ai_section("results")

    async def _generate_discussion(self) -> str:
        return await self._generate_real_ai_section("discussion")

    async def _generate_conclusion(self) -> str:
        return await self._generate_real_ai_section("conclusion")

    async def _generate_references(self) -> str:
        return await self._generate_real_ai_section("references")
