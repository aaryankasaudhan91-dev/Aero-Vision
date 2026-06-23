"""Insights Service — AI-generated scientific summaries."""

from typing import Optional, List, Dict, Any
from app.database import supabase
from app.config import get_settings

settings = get_settings()

class InsightsService:
    """Service for generating and retrieving scientific insights."""

    async def _generate_real_ai_insight(self, context: str, prompt: str) -> str:
        if not settings.GEMINI_API_KEY:
            return "Please configure GEMINI_API_KEY in .env to enable real AI generation."
        
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            full_prompt = f"Context data:\n{context}\n\nTask: {prompt}"
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_prompt,
            )
            return response.text
        except Exception as e:
            return f"Error generating AI insight: {str(e)}"

    async def get_insights(
        self, insight_type: Optional[str] = None, region: Optional[str] = None,
        severity: Optional[str] = None, limit: int = 20
    ) -> List[Dict]:
        query = supabase.table("ai_insights").select("*")
        if insight_type:
            query = query.eq("insight_type", insight_type)
        if region:
            query = query.eq("region", region)
        if severity:
            query = query.eq("severity", severity)
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        data = result.data or []
        if not data and settings.GEMINI_API_KEY:
            # Generate a live insight
            fire_data = supabase.table("fire_records").select("*").limit(50).execute().data
            tropomi_data = supabase.table("tropomi_products").select("*").limit(50).execute().data
            
            context = f"Fires: {fire_data[:10]}...\nTROPOMI: {tropomi_data[:10]}..."
            insight_text = await self._generate_real_ai_insight(
                context, 
                "Generate a highly professional, brief scientific insight (1-2 sentences) about the current air quality and fire correlation based on the provided data. Return only the insight text."
            )
            
            return [{
                "id": 1,
                "insight_type": insight_type or "general",
                "region": region or "India",
                "severity": severity or "warning",
                "title": "Real-Time AI Insight",
                "content": insight_text,
                "created_at": "2026-06-23T00:00:00Z"
            }]
            
        return data

    async def get_executive_summary(self) -> Dict[str, Any]:
        """Generate executive summary from all insights."""
        all_insights = supabase.table("ai_insights").select("*").order("created_at", desc=True).limit(50).execute()
        insights = all_insights.data or []

        by_type = {}
        for i in insights:
            t = i.get("insight_type", "general")
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(i)

        return {
            "total_insights": len(insights),
            "by_category": {k: len(v) for k, v in by_type.items()},
            "critical_alerts": [i for i in insights if i.get("severity") == "critical"],
            "latest_insights": insights[:10],
        }

    async def get_aqi_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="aqi_trend")

    async def get_hcho_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="hotspot")

    async def get_fire_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="fire_impact")

    async def get_transport_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="transport")
