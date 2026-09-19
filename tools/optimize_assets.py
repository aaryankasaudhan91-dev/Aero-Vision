import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

base_dir = r"d:\Devanshi\Project 13(Aero Vision)\models\T1(made by Claude 4.6)"
src_logo_path = os.path.join(base_dir, "tools", "Gemini_Generated_Image_6epqza6epqza6epq-removebg-preview.png")
frontend_public = os.path.join(base_dir, "frontend", "public")
frontend_assets = os.path.join(base_dir, "frontend", "src", "assets")

os.makedirs(frontend_public, exist_ok=True)
os.makedirs(frontend_assets, exist_ok=True)

logo_img = Image.open(src_logo_path).convert("RGBA")

# 1. Favicon 32x32 and 16x16
# Find bounding box of non-transparent content
bbox = logo_img.getbbox()
if bbox:
    cropped_logo = logo_img.crop(bbox)
else:
    cropped_logo = logo_img

# Square padding for favicons
def make_square(img, target_size, bg_circle=False):
    w, h = img.size
    max_dim = max(w, h)
    sq = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
    offset = ((max_dim - w) // 2, (max_dim - h) // 2)
    sq.paste(img, offset, img)
    resized = sq.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    if bg_circle:
        bg = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(bg)
        draw.ellipse([0, 0, target_size - 1, target_size - 1], fill=(15, 23, 42, 255), outline=(124, 58, 237, 255), width=int(target_size * 0.04))
        pad = int(target_size * 0.15)
        inner_logo = sq.resize((target_size - pad * 2, target_size - pad * 2), Image.Resampling.LANCZOS)
        bg.paste(inner_logo, (pad, pad), inner_logo)
        return bg
    return resized

fav32 = make_square(cropped_logo, 32)
fav32.save(os.path.join(frontend_public, "favicon-32x32.png"), optimize=True)

fav16 = make_square(cropped_logo, 16)
fav16.save(os.path.join(frontend_public, "favicon-16x16.png"), optimize=True)

touch180 = make_square(cropped_logo, 180, bg_circle=True)
touch180.save(os.path.join(frontend_public, "apple-touch-icon.png"), optimize=True)

# Also save an optimized webp of the logo
cropped_logo.save(os.path.join(frontend_assets, "app-logo.webp"), "WEBP", quality=90)
cropped_logo.save(os.path.join(frontend_public, "app-logo.webp"), "WEBP", quality=90)

# 2. Generate 1200x630 Social Preview Image (og-preview.png)
og_width, og_height = 1200, 630
og = Image.new("RGBA", (og_width, og_height), (11, 15, 25, 255))
draw = ImageDraw.Draw(og)

# Atmospheric glow gradients
for r in range(400, 0, -10):
    alpha = int((1 - r / 400) * 45)
    draw.ellipse([800 - r, 315 - r, 800 + r, 315 + r], fill=(124, 58, 237, alpha))
    draw.ellipse([400 - r, 200 - r, 400 + r, 200 + r], fill=(59, 130, 246, int(alpha * 0.7)))

# Grid lines background decoration
for x in range(0, og_width, 60):
    draw.line([(x, 0), (x, og_height)], fill=(255, 255, 255, 8), width=1)
for y in range(0, og_height, 60):
    draw.line([(0, y), (og_width, y)], fill=(255, 255, 255, 8), width=1)

# Badge: India National Geospatial Platform
badge_box = [80, 80, 390, 115]
draw.rounded_rectangle(badge_box, radius=18, fill=(30, 41, 59, 220), outline=(124, 58, 237, 200), width=2)
draw.text((95, 88), "🇮🇳  ISRO SAC & CPCB GEOSPATIAL INTEL", fill=(192, 132, 252, 255))

# Draw Logo on right side
logo_display_w = 420
logo_aspect = cropped_logo.width / cropped_logo.height
logo_display_h = int(logo_display_w / logo_aspect)
logo_resized = cropped_logo.resize((logo_display_w, logo_display_h), Image.Resampling.LANCZOS)
og.paste(logo_resized, (700, (og_height - logo_display_h) // 2), logo_resized)

# Title & Description on left side
draw.text((80, 150), "Project AeroVision", fill=(255, 255, 255, 255))
draw.text((80, 230), "Surface AQI & HCHO Hotspots", fill=(147, 197, 253, 255))

desc_lines = [
    "National-Scale Atmospheric Satellite Analytics Platform",
    "• Sentinel-5P TROPOMI Column Density Mapping",
    "• CPCB Ground Telemetry & Active Air Dispersion",
    "• NASA FIRMS Active Biomass Fire Correlation",
    "• FourCastNet & ERA5 Deep Learning Predictions"
]

y_text = 300
for line in desc_lines:
    draw.text((80, y_text), line, fill=(203, 213, 225, 240))
    y_text += 34

# Footer tag
draw.line([(80, 540), ( og_width - 80, 540 )], fill=(51, 65, 85, 200), width=1)
draw.text((80, 560), "https://aerovision.in", fill=(167, 139, 250, 255))
draw.text((450, 560), "Real-Time Telemetry • AI Diagnostic Forecasts • Open Research", fill=(148, 163, 184, 255))

# Save OG Preview
og_rgb = og.convert("RGB")
og_rgb.save(os.path.join(frontend_public, "og-preview.png"), "PNG", optimize=True)

print("Assets successfully generated and optimized!")
