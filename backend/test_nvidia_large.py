import asyncio
import aiohttp
import time
from app.config import get_settings

async def test_nv():
    settings = get_settings()
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    prompt = "Write a 500-word essay about the impacts of temperature inversion on urban air quality."
    print("Sending request to NVIDIA NIM...")
    start_time = time.time()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers=headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are a professional atmospheric scientist."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 800
                },
                timeout=90
            ) as resp:
                elapsed = time.time() - start_time
                print("Status Code:", resp.status)
                print(f"Time Taken: {elapsed:.2f} seconds")
                text = await resp.text()
                print("Response Length:", len(text))
    except Exception as e:
        print("Exception:", repr(e))

if __name__ == "__main__":
    asyncio.run(test_nv())
