# 🗺️ Mapping Engine

Technical guide to AeroVision's 2D and 3D spatial visualization system.

---

## Overview

AeroVision uses a dual-mode mapping engine:

| Mode | Technology | Component | Size |
|---|---|---|---|
| **2D Map** | Leaflet + react-leaflet | `IndiaMap2D.tsx` | 21.5KB |
| **3D Globe** | Three.js | `IndiaMap3D.tsx` | 12.5KB |
| **Switcher** | — | `IndiaMap.tsx` | 2.5KB |

Toggle between modes via the 2D/3D button in `IndiaMap.tsx`.

---

## 2D Map — Leaflet (`IndiaMap2D.tsx`)

### Configuration

| Setting | Value |
|---|---|
| Tile Layer | CARTO Voyager Light |
| Max Bounds | `[[5.0, 65.0], [38.5, 99.0]]` (Indian subcontinent) |
| Default Zoom | 5 |
| Min Zoom | 4 |
| Max Zoom | 12 |

### Rendering Modes

#### 🎨 Smooth Mode
Pure IDW (Inverse Distance Weighting) interpolated continuous raster overlay.
- 50×50 canvas pixel grid
- Interpolates AQI values between station locations
- Creates smooth color gradient across the map

#### 🔀 Hybrid Mode (Default)
Smooth overlay combined with station markers.
- IDW background + clickable station dots
- Best of both — context + detail

#### 📍 Grid Mode
Raw observation points only.
- Individual station markers with AQI-colored circles
- No interpolation

### Wind Arrows
- Rotated SVG direction arrows
- Arrow size scaled by wind speed
- Direction indicates wind flow bearing

### Tooltips
Hover over any station to see:
- Station name
- State
- Measured AQI value
- Wind speed & direction

### Color Scale (AQI-based)

| AQI Range | Color |
|---|---|
| 0–50 (Good) | Green |
| 51–100 (Satisfactory) | Yellow-Green |
| 101–200 (Moderate) | Yellow-Orange |
| 201–300 (Poor) | Orange-Red |
| 301–400 (Very Poor) | Red-Purple |
| 401–500 (Severe) | Dark Maroon |

---

## 3D Globe — Three.js (`IndiaMap3D.tsx`)

### Configuration

| Setting | Value |
|---|---|
| Projection | Orthographic |
| Camera | Orthographic camera |
| Controls | Animated orbit controls |
| Renderer | WebGLRenderer |

### Features
- India boundary wireframe (country outline)
- Station point markers as sphere geometries
- AQI-colored spheres (same color scale as 2D)
- Smooth rotation animation
- Zoom in/out via scroll

### Requirements
- WebGL must be enabled in the browser
- Falls back gracefully if WebGL is not available

---

## IDW Interpolation Algorithm

The 2D map uses **Inverse Distance Weighting** to create continuous surfaces:

```
value(x) = Σ(w_i × v_i) / Σ(w_i)
where w_i = 1 / distance(x, station_i)^p
```

- **p** (power parameter) = 2 (default)
- Grid resolution: 50×50 pixels overlaid on the map viewport
- Recomputed on map pan/zoom

---

**← [[Dashboard Modules Guide]]** | **Next: [[Health Impact Early Warning System]] →**
