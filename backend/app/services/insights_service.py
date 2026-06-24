"""Insights Service — AI-generated scientific summaries."""

import json
import re
from typing import Optional, List, Dict, Any
from app.database import supabase
from app.config import get_settings

settings = get_settings()


class InsightsService:
    """Service for generating, persisting, and retrieving scientific insights."""

    async def generate_live_insights(self) -> List[Dict]:
        """Aggregates active telemetry data and triggers Gemini to compile 4 detailed scientific insights."""
        # 1. Fetch real-time environmental context
        aqi_stats = {"avg_aqi": 145.0, "max_aqi": 250, "cities": ["Delhi", "Noida", "Gurugram"]}
        try:
            aqi_res = supabase.table("cpcb_observations").select("aqi, city").order("observed_at", desc=True).limit(50).execute().data or []
            if aqi_res:
                aqis = [r["aqi"] for r in aqi_res if r.get("aqi") is not None]
                cities = list(set([r["city"] for r in aqi_res if r.get("city")]))
                if aqis:
                    aqi_stats["avg_aqi"] = sum(aqis) / len(aqis)
                    aqi_stats["max_aqi"] = max(aqis)
                if cities:
                    aqi_stats["cities"] = cities
        except Exception as e:
            print(f"Error fetching AQI context for insights: {e}")

        fire_stats = {"fire_count": 12, "avg_frp": 32.5, "states": ["Punjab", "Haryana"]}
        try:
            fire_res = supabase.table("fire_records").select("frp, state").order("detected_at", desc=True).limit(50).execute().data or []
            if fire_res:
                frps = [r["frp"] for r in fire_res if r.get("frp") is not None]
                states = list(set([r["state"] for r in fire_res if r.get("state")]))
                fire_stats["fire_count"] = len(fire_res)
                if frps:
                    fire_stats["avg_frp"] = sum(frps) / len(frps)
                if states:
                    fire_stats["states"] = states
        except Exception as e:
            print(f"Error fetching fire context for insights: {e}")

        hcho_stats = {"avg_hcho": 1.45e-4, "max_hcho": 2.9e-4}
        try:
            hcho_res = supabase.table("tropomi_products").select("column_value").eq("product_type", "HCHO").order("observed_date", desc=True).limit(50).execute().data or []
            if hcho_res:
                hcho_vals = [r["column_value"] for r in hcho_res if r.get("column_value") is not None]
                if hcho_vals:
                    hcho_stats["avg_hcho"] = sum(hcho_vals) / len(hcho_vals)
                    hcho_stats["max_hcho"] = max(hcho_vals)
        except Exception as e:
            print(f"Error fetching HCHO context for insights: {e}")

        weather_stats = {"avg_wind": 4.1}
        try:
            weather_res = supabase.table("meteorological_data").select("wind_speed").eq("source", "FourCastNet").limit(50).execute().data or []
            if weather_res:
                winds = [r["wind_speed"] for r in weather_res if r.get("wind_speed") is not None]
                if winds:
                    weather_stats["avg_wind"] = sum(winds) / len(winds)
        except Exception as e:
            print(f"Error fetching weather context for insights: {e}")

        # Compile data text block
        data_block = (
            f"Ground AQI observations: Average AQI={aqi_stats['avg_aqi']:.1f}, Max AQI={aqi_stats['max_aqi']} across cities: {', '.join(aqi_stats['cities'][:4])}.\n"
            f"Active Biomass Burning: {fire_stats['fire_count']} fires detected with avg FRP of {fire_stats['avg_frp']:.1f} MW, located in: {', '.join(fire_stats['states'][:3])}.\n"
            f"TROPOMI HCHO column levels: average={hcho_stats['avg_hcho']:.2e} mol/m², max={hcho_stats['max_hcho']:.2e} mol/m².\n"
            f"FourCastNet Winds: average wind speed={weather_stats['avg_wind']:.1f} m/s.\n"
        )

        insights_list = []

        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = (
                    f"Based on the environmental data below, write exactly 4 distinct scientific environmental insights "
                    f"(one for each type: 'aqi_trend', 'hotspot', 'fire_impact', 'transport').\n\n"
                    f"Environmental Data:\n{data_block}\n\n"
                    f"You must return the result as a raw JSON list with no markdown formatting tags (no ```json code blocks). "
                    f"The JSON schema must be a list of objects, each containing these exact keys:\n"
                    f"- 'insight_type': one of ['aqi_trend', 'hotspot', 'fire_impact', 'transport']\n"
                    f"- 'title': A short title (4-6 words)\n"
                    f"- 'summary': A 1-2 sentence highly technical scientific explanation referencing numbers from the data.\n"
                    f"- 'detailed_text': A 1-2 sentence mitigation or policy action recommendation.\n"
                    f"- 'severity': one of ['info', 'warning', 'critical']\n"
                    f"- 'region': The affected region (e.g., 'Indo-Gangetic Plain', 'Central India', 'North India')\n"
                )
                
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                
                text = response.text.strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n", "", text)
                    text = re.sub(r"\n```$", "", text)
                insights_list = json.loads(text.strip())
            except Exception as e:
                print(f"Gemini insights generation error: {e}. Falling back to local templates.")
                insights_list = self._generate_fallback_insights(aqi_stats, fire_stats, hcho_stats, weather_stats)
        else:
            insights_list = self._generate_fallback_insights(aqi_stats, fire_stats, hcho_stats, weather_stats)

        # Clear old database insights and insert fresh ones
        try:
            supabase.table("ai_insights").delete().neq("id", 0).execute()
            if insights_list:
                # Remove id field if present to let database autoincrement
                for item in insights_list:
                    if "id" in item:
                        del item["id"]
                supabase.table("ai_insights").insert(insights_list).execute()
        except Exception as e:
            print(f"Error persisting insights to database: {e}")

        return insights_list

    def _generate_fallback_insights(self, aqi_stats: dict, fire_stats: dict, hcho_stats: dict, weather_stats: dict) -> List[Dict]:
        """Context-aware local fallback generator for scientific insights."""
        insights = []
        
        # 1. AQI Trend
        avg_aqi = aqi_stats.get("avg_aqi", 145.0)
        max_aqi = aqi_stats.get("max_aqi", 250)
        cities = aqi_stats.get("cities", ["Delhi", "Mumbai"])
        severity = "critical" if avg_aqi > 200 else ("warning" if avg_aqi > 100 else "info")
        insights.append({
            "insight_type": "aqi_trend",
            "title": "Subcontinental Ambient AQI Elevations",
            "summary": f"CPCB ground stations report a regional average AQI of {avg_aqi:.1f}, with peak values reaching {max_aqi} in metropolitan clusters (e.g., {', '.join(cities[:3])}). Diurnal surface heating patterns indicate particulate trapping beneath a lowering planetary boundary layer.",
            "detailed_text": "Establish regional airshed restrictions and curtail heavy transport movement during peak evening inversion boundaries.",
            "severity": severity,
            "region": "Indo-Gangetic Plain"
        })
        
        # 2. HCHO Hotspots
        avg_hcho = hcho_stats.get("avg_hcho", 1.45e-4)
        max_hcho = hcho_stats.get("max_hcho", 2.9e-4)
        severity = "warning" if avg_hcho > 1.2e-4 else "info"
        insights.append({
            "insight_type": "hotspot",
            "title": "Sentinel-5P HCHO Column Anomalies",
            "summary": f"Satellite retrievals show elevated formaldehyde (HCHO) columns averaging {avg_hcho:.2e} mol/m², indicating concentrated volatile organic compound (VOC) plumes and secondary photo-oxidation processes.",
            "detailed_text": "Deploy high-resolution volatile organic monitoring in industrial corridors and forest margins to track biogenic vs anthropogenic VOC fractions.",
            "severity": severity,
            "region": "Central & Eastern India"
        })
        
        # 3. Fire Impact
        fire_count = fire_stats.get("fire_count", 12)
        avg_frp = fire_stats.get("avg_frp", 32.5)
        states = fire_stats.get("states", ["Punjab", "Haryana"])
        severity = "critical" if fire_count > 30 else ("warning" if fire_count > 10 else "info")
        insights.append({
            "insight_type": "fire_impact",
            "title": "Agricultural Biomass Combustion Impact",
            "summary": f"Satellite sensors detected {fire_count} active thermal anomalies with an average Fire Radiative Power (FRP) of {avg_frp:.1f} MW. High-intensity burn centers are clustered in agricultural zones across {', '.join(states[:2]) if states else 'North India'}.",
            "detailed_text": "Implement satellite-guided agricultural monitoring and provide sub-surface seeders to reduce open crop residue burning.",
            "severity": severity,
            "region": "Northwest India"
        })
        
        # 4. Transport Advection
        avg_wind = weather_stats.get("avg_wind", 4.1)
        severity = "warning" if avg_wind > 5.0 else "info"
        insights.append({
            "insight_type": "transport",
            "title": "Advective Plume Transport Vectors",
            "summary": f"Atmospheric transport coordinates simulate wind vectors carrying plumes down-wind at an average speed of {avg_wind:.1f} m/s, promoting cross-state advection of combustion by-products.",
            "detailed_text": "Initiate inter-state coordination for pollution monitoring and issue down-wind warnings to receptor cities.",
            "severity": severity,
            "region": "Indo-Gangetic Plain"
        })
        
        return insights

    async def get_insights(
        self, insight_type: Optional[str] = None, region: Optional[str] = None,
        severity: Optional[str] = None, limit: int = 20
    ) -> List[Dict]:
        """List scientific insights from database, generating them if empty."""
        query = supabase.table("ai_insights").select("*")
        if insight_type:
            query = query.eq("insight_type", insight_type)
        if region:
            query = query.eq("region", region)
        if severity:
            query = query.eq("severity", severity)
            
        result = query.order("created_at", desc=True).limit(limit).execute()
        data = result.data or []
        
        # Seeding database if empty
        if not data:
            data = await self.generate_live_insights()
            # Re-apply filters if seeding occurred
            if insight_type or region or severity:
                data = [
                    i for i in data 
                    if (not insight_type or i.get("insight_type") == insight_type) and
                       (not region or i.get("region") == region) and
                       (not severity or i.get("severity") == severity)
                ]
        
        # Map backend fields to backward-compatible keys
        mapped_data = []
        for i in data:
            item = dict(i)
            item["insight_text"] = item.get("summary", "")
            item["recommended_action"] = item.get("detailed_text", "")
            mapped_data.append(item)
            
        return mapped_data

    async def get_executive_summary(self) -> Dict[str, Any]:
        """Generate executive summary from all insights."""
        all_insights = supabase.table("ai_insights").select("*").order("created_at", desc=True).limit(50).execute()
        insights = all_insights.data or []
        
        if not insights:
            insights = await self.get_insights()
            
        by_type = {}
        for i in insights:
            t = i.get("insight_type", "general")
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(i)
            
        summary_text = "No overall executive summary available."
        if insights:
            summaries = [f"- {i.get('title')}: {i.get('summary')}" for i in insights[:4]]
            context_str = "\n".join(summaries)
            
            if settings.GEMINI_API_KEY:
                try:
                    from google import genai
                    client = genai.Client(api_key=settings.GEMINI_API_KEY)
                    prompt = (
                        f"Summarize these environmental alerts into a brief, highly professional, "
                        f"and executive-level summary paragraph (2-3 sentences max) for policy makers:\n\n"
                        f"{context_str}"
                    )
                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=prompt,
                    )
                    summary_text = response.text.strip()
                except Exception as e:
                    summary_text = (
                        f"AeroVision sensors have generated {len(insights)} active environmental alerts. "
                        f"Ambient particulate indices and thermal agriculture anomalies are elevated in North India, "
                        f"with wind currents promoting advective down-wind transport. Joint state monitoring is recommended."
                    )
            else:
                summary_text = (
                    f"AeroVision sensors have generated {len(insights)} active environmental alerts. "
                    f"Ambient particulate indices and thermal agriculture anomalies are elevated in North India, "
                    f"with wind currents promoting advective down-wind transport. Joint state monitoring is recommended."
                )
                
        mapped_insights = []
        for i in insights[:10]:
            item = dict(i)
            item["insight_text"] = item.get("summary", "")
            item["recommended_action"] = item.get("detailed_text", "")
            mapped_insights.append(item)
            
        return {
            "summary": summary_text,
            "total_insights": len(insights),
            "by_category": {k: len(v) for k, v in by_type.items()},
            "critical_alerts": [i for i in mapped_insights if i.get("severity") == "critical"],
            "latest_insights": mapped_insights,
        }

    async def get_aqi_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="aqi_trend")

    async def get_hcho_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="hotspot")

    async def get_fire_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="fire_impact")

    async def get_transport_insights(self) -> List[Dict]:
        return await self.get_insights(insight_type="transport")

