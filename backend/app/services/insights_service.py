"""Insights Service — AI-generated scientific summaries."""

from typing import Optional, List, Dict, Any
from app.database import supabase


class InsightsService:
    """Service for generating and retrieving scientific insights."""

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
        return result.data or []

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
        result = supabase.table("ai_insights").select("*").eq(
            "insight_type", "aqi_trend"
        ).order("created_at", desc=True).limit(10).execute()
        return result.data or []

    async def get_hcho_insights(self) -> List[Dict]:
        result = supabase.table("ai_insights").select("*").eq(
            "insight_type", "hotspot"
        ).order("created_at", desc=True).limit(10).execute()
        return result.data or []

    async def get_fire_insights(self) -> List[Dict]:
        result = supabase.table("ai_insights").select("*").eq(
            "insight_type", "fire_impact"
        ).order("created_at", desc=True).limit(10).execute()
        return result.data or []

    async def get_transport_insights(self) -> List[Dict]:
        result = supabase.table("ai_insights").select("*").eq(
            "insight_type", "transport"
        ).order("created_at", desc=True).limit(10).execute()
        return result.data or []
