import asyncio
import aiohttp
from app.config import get_settings

async def test_nv():
    settings = get_settings()
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    print("API Key:", api_key[:15] + "..." if api_key else "None")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers=headers,
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": "Hello"}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 10
                },
                timeout=10
            ) as resp:
                print("Status Code:", resp.status)
                text = await resp.text()
                print("Response:", text)
    except Exception as e:
        print("Exception:", repr(e))

if __name__ == "__main__":
    asyncio.run(test_nv())
