import asyncio
import edge_tts
import os

scenes = [
    ('scene1.mp3', 'Air pollution is everywhere. But what if we could see what the human eye cannot?'),
    ('scene2.mp3', 'Introducing AeroVision — satellite-powered atmospheric intelligence for understanding air quality across India.'),
    ('scene3.mp3', 'Transform complex atmospheric observations into meaningful surface air-quality intelligence.'),
    ('scene4.mp3', 'Detect formaldehyde hotspots and reveal pollution patterns that conventional monitoring alone can struggle to capture.'),
    ('scene5.mp3', 'Go beyond a single AQI number. Explore where pollution is concentrated, how conditions change, and where attention may be needed.'),
    ('scene6.mp3', 'And turn complex environmental data into clear, actionable reports — built for faster understanding and better decisions.'),
    ('scene7.mp3', 'Because protecting the air we breathe begins with understanding it.'),
    ('scene8.mp3', 'AeroVision. See the air. Understand the risk.')
]

out_dir = os.path.join('brag-output', 'composition', 'assets', 'voice')
os.makedirs(out_dir, exist_ok=True)

async def main():
    for name, text in scenes:
        target = os.path.join(out_dir, name)
        tts = edge_tts.Communicate(text, 'en-US-ChristopherNeural', rate='-2%')
        await tts.save(target)
        print(f"Generated {name} -> {target}")

if __name__ == '__main__':
    asyncio.run(main())
