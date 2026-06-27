"""FourCastNet Service — Atmospheric dynamics forecast using NVIDIA FourCastNet NIM API."""

import os
import aiohttp
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from app.database import supabase
from app.config import get_settings
from loguru import logger

settings = get_settings()

class FourCastNetService:
    """Service to request, simulate, and retrieve FourCastNet weather forecasts."""

    BASE_URL = "https://ai.api.nvidia.com/v1/physics/nvidia/fourcastnet"

    async def trigger_forecast(self, start_date_str: str) -> Dict[str, Any]:
        """Trigger a 7-day weather forecast run using FourCastNet."""
        start_date = date.fromisoformat(start_date_str)
        logger.info(f"Triggering FourCastNet weather forecast from {start_date_str}")

        api_key = settings.NVIDIA_API_KEY
        is_placeholder = not api_key or "placeholder" in api_key.lower()

        if is_placeholder:
            return {"status": "error", "message": "NVIDIA_API_KEY is not configured for real data fetching."}

        # Attempt to call the real NVIDIA hosted FourCastNet API
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.BASE_URL}/infer",
                    headers=headers,
                    json={
                        "input_time": f"{start_date_str}T00:00:00Z",
                        "simulation_length": 7
                    },
                    timeout=5
                ) as resp:
                    if resp.status == 200:
                        logger.info("Successfully fetched forecast from NVIDIA FourCastNet cloud NIM.")
                        data = await resp.json()
                        # Real data ingestion logic would go here
                        return {"status": "success", "source": "FourCastNet Cloud", "records_inserted": 0}
                    else:
                        logger.error(f"NVIDIA API returned status {resp.status}")
                        return {"status": "error", "message": f"NVIDIA API failed with status {resp.status}"}
        except Exception as e:
            logger.error(f"NVIDIA FourCastNet NIM API call failed: {e}")
            return {"status": "error", "message": f"NVIDIA API call failed: {e}"}

    async def get_forecast(self, target_date_str: str, variable: str = "temperature_2m") -> List[Dict[str, Any]]:
        """Retrieve the gridded weather forecast from FourCastNet for a specific date and format for 3D Map."""
        logger.info(f"Retrieving FourCastNet forecast for {target_date_str}, variable: {variable}")
        
        # Check if forecast records exist. If not, try to trigger a forecast run dynamically
        res = supabase.table("meteorological_data").select("id").eq("source", "FourCastNet").eq("observed_date", target_date_str).limit(1).execute()
        if not res.data:
            logger.info(f"No forecast found for {target_date_str}. Generating dynamic 7-day forecast...")
            await self.trigger_forecast(target_date_str)

        # Query all gridded forecast records for the target date
        met_res = supabase.table("meteorological_data").select(
            "latitude, longitude, temperature_2m, relative_humidity, wind_speed_10m, wind_direction, pbl_height, surface_pressure"
        ).eq("source", "FourCastNet").eq("observed_date", target_date_str).limit(1000).execute()
        
        data = met_res.data or []
        formatted_points = []

        for r in data:
            lat = r["latitude"]
            lon = r["longitude"]
            val = r.get(variable)
            
            if val is None:
                continue

            if variable == "temperature_2m" and val > 150:
                val = val - 273.15

            color = "#10b981"
            if variable == "temperature_2m":
                if val < 15: color = "#3b82f6"
                elif val < 25: color = "#60a5fa"
                elif val < 30: color = "#fbbf24"
                elif val < 35: color = "#f97316"
                else: color = "#ef4444"
            elif variable == "wind_speed_10m":
                if val < 3: color = "#22d3ee"
                elif val < 6: color = "#06b6d4"
                elif val < 9: color = "#0d9488"
                else: color = "#2563eb"
            elif variable == "pbl_height":
                if val < 800: color = "#c084fc"
                elif val < 1500: color = "#8b5cf6"
                else: color = "#4f46e5"
            elif variable == "relative_humidity":
                if val < 40: color = "#a3e635"
                elif val < 70: color = "#14b8a6"
                else: color = "#0284c7"

            val = round(val, 2)
            
            units = {
                "temperature_2m": "°C",
                "wind_speed_10m": "m/s",
                "relative_humidity": "%",
                "pbl_height": "m",
                "surface_pressure": "Pa"
            }
            unit = units.get(variable, "")
            label = f"Forecast at ({lat}, {lon}): {val} {unit}"
            if variable == "wind_speed_10m":
                deg = r.get("wind_direction", 0)
                directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
                dir_label = directions[round(((deg % 360) / 45)) % 8]
                label += f" ({dir_label} @ {round(deg, 1)}°)"

            formatted_points.append({
                "latitude": lat,
                "longitude": lon,
                "value": val,
                "label": label,
                "state": "FourCastNet AI Grid",
                "color": color,
                "wind_direction": r.get("wind_direction"),
                "wind_speed": r.get("wind_speed_10m")
            })
            
        return formatted_points

    async def get_forecast_commentary(self, target_date_str: str, variable: str = "temperature_2m") -> Dict[str, Any]:
        """Generate a scientific meteorological commentary using NVIDIA NIM LLM and/or Google Gemini AI."""
        logger.info(f"Generating meteorological commentary for {target_date_str}, variable: {variable}")
        
        res = supabase.table("meteorological_data").select(variable).eq("source", "FourCastNet").eq("observed_date", target_date_str).limit(1000).execute()
        data = res.data or []
        
        vals = [r[variable] for r in data if r.get(variable) is not None]
        if variable == "temperature_2m":
            vals = [v - 273.15 if v > 150 else v for v in vals]
            
        if not vals:
            return {"commentary": f"No meteorological data available for {target_date_str} to perform AI analysis."}
            
        mean_val = sum(vals) / len(vals)
        min_val = min(vals)
        max_val = max(vals)
        
        var_name = variable.replace("_", " ").title()
        
        api_key = settings.NVIDIA_API_KEY
        is_nvidia_active = api_key and "placeholder" not in api_key.lower()
        is_gemini_active = settings.GEMINI_API_KEY and "placeholder" not in settings.GEMINI_API_KEY.lower()
        
        if is_nvidia_active and is_gemini_active:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                nvidia_prompt = (
                    f"Write a concise, highly technical 1-sentence physical/meteorological analysis of {var_name} over India "
                    f"for {target_date_str} based on the following actual statistics: "
                    f"Mean: {mean_val:.2f}, Min: {min_val:.2f}, Max: {max_val:.2f}. "
                    f"Focus strictly on physical atmospheric dynamics, gradients, and circulation patterns."
                )
                
                nvidia_commentary = ""
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "https://integrate.api.nvidia.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": "meta/llama-3.1-70b-instruct",
                            "messages": [
                                {"role": "system", "content": "You are a Senior Meteorological AI Assistant. Keep response strictly under 35 words and do not output introductory text."},
                                {"role": "user", "content": nvidia_prompt}
                            ],
                            "temperature": 0.2,
                            "max_tokens": 80
                        },
                        timeout=25.0
                    ) as resp:
                        if resp.status == 200:
                            res_json = await resp.json()
                            nvidia_commentary = res_json.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                
                if nvidia_commentary:
                    from google import genai
                    client = genai.Client(api_key=settings.GEMINI_API_KEY)
                    gemini_prompt = (
                        f"NVIDIA's physical meteorological analysis for {var_name} on {target_date_str} is:\n"
                        f"\"{nvidia_commentary}\"\n\n"
                        f"Based on this and these statistics (Mean: {mean_val:.2f}, Min: {min_val:.2f}, Max: {max_val:.2f}), "
                        f"write a concise, 1-sentence scientific commentary explaining the environmental, pollutant dispersion, or public health implications. "
                        f"Focus on how these conditions affect air quality/transport."
                    )
                    
                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=gemini_prompt,
                    )
                    gemini_commentary = response.text.strip()
                    
                    combined_commentary = f"{nvidia_commentary} {gemini_commentary}"
                    return {"commentary": combined_commentary, "source": "NVIDIA & Gemini Dual-AI"}
            except Exception as e:
                logger.error(f"Dual-AI weather commentary generation failed: {repr(e)}")

        if is_nvidia_active:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                prompt = (
                    f"Write a concise, highly technical 2-sentence meteorological analysis of {var_name} over India "
                    f"for {target_date_str} based on the following actual statistics: "
                    f"Mean: {mean_val:.2f}, Min: {min_val:.2f}, Max: {max_val:.2f}. "
                    f"Discuss atmospheric dispersion, convective mixing, or transport impacts based on these values."
                )
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "https://integrate.api.nvidia.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": "meta/llama-3.1-70b-instruct",
                            "messages": [
                                {"role": "system", "content": "You are a Senior Meteorological AI Assistant. Keep response strictly under 60 words and do not output introductory text."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.2,
                            "max_tokens": 120
                        },
                        timeout=25.0
                    ) as resp:
                        if resp.status == 200:
                            res_json = await resp.json()
                            commentary = res_json.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                            return {"commentary": commentary, "source": "NVIDIA LLaMA 3.1 NIM"}
            except Exception as e:
                logger.warning(f"Failed to generate NVIDIA NIM commentary: {repr(e)}")

        if is_gemini_active:
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = (
                    f"Write a concise, highly technical 2-sentence meteorological analysis of {var_name} over India "
                    f"for {target_date_str} based on the following actual statistics: "
                    f"Mean: {mean_val:.2f}, Min: {min_val:.2f}, Max: {max_val:.2f}. "
                    f"Discuss atmospheric dispersion, convective mixing, or transport impacts based on these values."
                )
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                commentary = response.text.strip()
                return {"commentary": commentary, "source": "Google Gemini AI"}
            except Exception as e:
                logger.warning(f"Failed to generate Gemini commentary: {repr(e)}")

        return {"commentary": "Real AI APIs are currently unavailable to analyze the data.", "source": "System"}

