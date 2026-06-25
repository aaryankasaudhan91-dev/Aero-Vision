import asyncio
from app.services.fourcastnet_service import FourCastNetService
from app.services.report_service import ReportService
from app.schemas import ReportRequest

async def main():
    print("--- Testing Weather Forecast Commentary (Dual-AI Orchestration) ---")
    fc_service = FourCastNetService()
    # Test date (should match some records or fall back appropriately)
    target_date = "2026-06-25"
    
    try:
        res = await fc_service.get_forecast_commentary(target_date, "temperature_2m")
        print("Weather Commentary Result:")
        print(res)
    except Exception as e:
        print(f"Weather commentary failed: {e}")
        
    print("\n--- Testing Report Service Section Generation (Dual-AI Orchestration) ---")
    report_service = ReportService()
    db_context = "Air Quality Index (AQI) Observations:\n- Average AQI: 185.0\n- Maximum AQI: 320\n- Active Reporting Cities: Delhi, Noida\n"
    
    try:
        section_text = await report_service._generate_real_ai_section(
            section="abstract",
            db_context=db_context,
            title="AeroVision Climate Analysis 2026",
            report_type="research_paper"
        )
        print("Generated Section Content:")
        print(section_text[:500] + "\n...")
    except Exception as e:
        print(f"Report section generation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
