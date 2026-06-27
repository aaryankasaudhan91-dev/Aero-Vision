"""Insights Service — AI-generated scientific summaries."""

import asyncio
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
            query = supabase.table("cpcb_observations").select("aqi, city").order("observed_at", desc=True).limit(50)
            aqi_res = (await asyncio.to_thread(query.execute)).data or []
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
            query = supabase.table("fire_records").select("frp, state").order("detected_at", desc=True).limit(50)
            fire_res = (await asyncio.to_thread(query.execute)).data or []
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
            query = supabase.table("tropomi_products").select("column_value").eq("product_type", "HCHO").order("observed_date", desc=True).limit(50)
            hcho_res = (await asyncio.to_thread(query.execute)).data or []
            if hcho_res:
                hcho_vals = [r["column_value"] for r in hcho_res if r.get("column_value") is not None]
                if hcho_vals:
                    hcho_stats["avg_hcho"] = sum(hcho_vals) / len(hcho_vals)
                    hcho_stats["max_hcho"] = max(hcho_vals)
        except Exception as e:
            print(f"Error fetching HCHO context for insights: {e}")

        weather_stats = {"avg_wind": 4.1}
        try:
            query = supabase.table("meteorological_data").select("wind_speed").eq("source", "FourCastNet").limit(50)
            weather_res = (await asyncio.to_thread(query.execute)).data or []
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

        api_key = settings.NVIDIA_API_KEY
        is_nvidia_active = api_key and "placeholder" not in api_key.lower()
        is_gemini_active = settings.GEMINI_API_KEY and "placeholder" not in settings.GEMINI_API_KEY.lower()
        insights_list = []

        # 1. Dual-AI Generation: If both APIs are active, orchestrate them to write different sections
        if is_nvidia_active and is_gemini_active:
            try:
                import httpx
                from google import genai
                from loguru import logger
                
                # Part A: NVIDIA LLaMA 3.1 NIM (aqi_trend, hotspot)
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                nvidia_prompt = (
                    f"Based on the environmental data below, write exactly 2 distinct scientific environmental insights "
                    f"(one for 'aqi_trend' and one for 'hotspot').\n\n"
                    f"Environmental Data:\n{data_block}\n\n"
                    f"You must return the result as a raw JSON list with no markdown formatting tags (no ```json code blocks). "
                    f"The JSON schema must be a list of objects, each containing these exact keys:\n"
                    f"- 'insight_type': one of ['aqi_trend', 'hotspot']\n"
                    f"- 'title': A short title (4-6 words)\n"
                    f"- 'summary': A 1-2 sentence highly technical scientific explanation referencing numbers from the data.\n"
                    f"- 'detailed_text': A 1-2 sentence mitigation or policy action recommendation.\n"
                    f"- 'severity': one of ['info', 'warning', 'critical']\n"
                    f"- 'region': The affected region (e.g., 'Indo-Gangetic Plain', 'Central India', 'North India')\n"
                )
                
                nvidia_insights = []
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://integrate.api.nvidia.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": "meta/llama-3.1-70b-instruct",
                            "messages": [
                                {"role": "system", "content": "You are a professional environmental data analyst. Return ONLY raw JSON, without backticks or markdown code block formatting."},
                                {"role": "user", "content": nvidia_prompt}
                            ],
                            "temperature": 0.1,
                            "max_tokens": 600
                        },
                        timeout=12.0
                    )
                    if resp.status_code == 200:
                        text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                        if text.startswith("```"):
                            text = re.sub(r"^```(?:json)?\n", "", text)
                            text = re.sub(r"\n```$", "", text)
                        nvidia_insights = json.loads(text.strip())
                        logger.info("Successfully generated dual insights (Part 1/2: aqi_trend, hotspot) using NVIDIA LLaMA 3.1 NIM.")
                    else:
                        raise RuntimeError("NVIDIA NIM call failed in dual mode")

                # Part B: Google Gemini AI (fire_impact, transport)
                gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                gemini_prompt = (
                    f"Based on the environmental data below, write exactly 2 distinct scientific environmental insights "
                    f"(one for 'fire_impact' and one for 'transport').\n\n"
                    f"Environmental Data:\n{data_block}\n\n"
                    f"You must return the result as a raw JSON list with no markdown formatting tags (no ```json code blocks). "
                    f"The JSON schema must be a list of objects, each containing these exact keys:\n"
                    f"- 'insight_type': one of ['fire_impact', 'transport']\n"
                    f"- 'title': A short title (4-6 words)\n"
                    f"- 'summary': A 1-2 sentence highly technical scientific explanation referencing numbers from the data.\n"
                    f"- 'detailed_text': A 1-2 sentence mitigation or policy action recommendation.\n"
                    f"- 'severity': one of ['info', 'warning', 'critical']\n"
                    f"- 'region': The affected region (e.g., 'Indo-Gangetic Plain', 'Central India', 'North India')\n"
                )
                
                gemini_insights = []
                response = await asyncio.to_thread(
                    gemini_client.models.generate_content,
                    model='gemini-2.5-flash',
                    contents=gemini_prompt,
                )
                text = response.text.strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n", "", text)
                    text = re.sub(r"\n```$", "", text)
                gemini_insights = json.loads(text.strip())
                logger.info("Successfully generated dual insights (Part 2/2: fire_impact, transport) using Google Gemini AI.")
                
                insights_list = nvidia_insights + gemini_insights
            except Exception as e:
                from loguru import logger
                logger.error(f"Dual AI insights generation failed: {e}. Falling back to single-provider workflow.")
                insights_list = []

        # 2. Single-provider workflow (Fallback or when only one key is configured)
        if not insights_list:
            if is_nvidia_active:
                try:
                    import httpx
                    from loguru import logger
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
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
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(
                            "https://integrate.api.nvidia.com/v1/chat/completions",
                            headers=headers,
                            json={
                                "model": "meta/llama-3.1-70b-instruct",
                                "messages": [
                                    {"role": "system", "content": "You are a professional environmental data analyst. Return ONLY raw JSON, without backticks or markdown code block formatting."},
                                    {"role": "user", "content": prompt}
                                ],
                                "temperature": 0.1,
                                "max_tokens": 1000
                            },
                            timeout=12.0
                        )
                        if resp.status_code == 200:
                            text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                            if text.startswith("```"):
                                text = re.sub(r"^```(?:json)?\n", "", text)
                                text = re.sub(r"\n```$", "", text)
                            insights_list = json.loads(text.strip())
                            logger.info("Successfully generated all insights using NVIDIA LLaMA 3.1 NIM.")
                        else:
                            raise RuntimeError("NVIDIA NIM call failed in single-provider mode")
                except Exception as e:
                    from loguru import logger
                    logger.error(f"NVIDIA NIM single-provider insights failed: {e}. Trying Gemini...")
                    is_nvidia_active = False

            if not is_nvidia_active:
                if is_gemini_active:
                    try:
                        from google import genai
                        from loguru import logger
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
                        
                        response = await asyncio.to_thread(
                            client.models.generate_content,
                            model='gemini-2.5-flash',
                            contents=prompt,
                        )
                        
                        text = response.text.strip()
                        if text.startswith("```"):
                            text = re.sub(r"^```(?:json)?\n", "", text)
                            text = re.sub(r"\n```$", "", text)
                        insights_list = json.loads(text.strip())
                        logger.info("Successfully generated all insights using Google Gemini AI.")
                    except Exception as e:
                        from loguru import logger
                        logger.error(f"Gemini insights generation error: {e}.")
                        insights_list = []
                else:
                    insights_list = []

        # Clear old database insights and insert fresh ones
        try:
            delete_query = supabase.table("ai_insights").delete().neq("id", 0)
            await asyncio.to_thread(delete_query.execute)
            if insights_list:
                # Remove id field if present to let database autoincrement
                for item in insights_list:
                    if "id" in item:
                        del item["id"]
                insert_query = supabase.table("ai_insights").insert(insights_list)
                await asyncio.to_thread(insert_query.execute)
        except Exception as e:
            print(f"Error persisting insights to database: {e}")

        return insights_list


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
            
        result = await asyncio.to_thread(query.order("created_at", desc=True).limit(limit).execute)
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
        query = supabase.table("ai_insights").select("*").order("created_at", desc=True).limit(50)
        all_insights = await asyncio.to_thread(query.execute)
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
                    response = await asyncio.to_thread(
                        client.models.generate_content,
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
