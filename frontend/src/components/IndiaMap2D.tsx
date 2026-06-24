import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ImageOverlay, Marker } from 'react-leaflet';
import L from 'leaflet';

interface MapPoint {
  latitude: number;
  longitude: number;
  value: number;
  label: string;
  state?: string;
  color?: string;
  wind_direction?: number;
  wind_speed?: number;
}

interface IndiaMap2DProps {
  points: MapPoint[];
  dataType?: 'aqi' | 'hcho' | 'fire' | 'pollutant';
  variableName: string;
  unit: string;
}

export const IndiaMap2D: React.FC<IndiaMap2DProps> = ({ points, dataType, variableName, unit }) => {
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // Center of India
  const defaultZoom = 4.5;
  const [displayMode, setDisplayMode] = useState<'smooth' | 'hybrid' | 'grid'>('hybrid');
  const [showWind, setShowWind] = useState(true);

  // Auto-enable wind display when looking at wind speed variables
  useEffect(() => {
    if (variableName.toLowerCase().includes('wind')) {
      setShowWind(true);
    }
  }, [variableName]);

  // Determine grid bounds based on dataset type:
  // Weather grid: [[5.25, 67.25], [38.25, 98.75]]
  // Sparse points (AQI, Fire, etc.): India bounding box [[5.0, 67.0], [38.5, 99.0]]
  const isDenseGrid = points.length > 200;
  
  const gridBounds: L.LatLngBoundsExpression = useMemo(() => {
    return isDenseGrid
      ? [[5.25, 67.25], [38.25, 98.75]]
      : [[5.0, 67.0], [38.5, 99.0]];
  }, [isDenseGrid]);

  // Helper to determine the color of a point based on the active dataset rules
  const getPointColor = (pt: MapPoint) => {
    if (pt.color) return pt.color;
    const val = pt.value;
    if (dataType === 'aqi') {
      if (val > 300) return '#a855f7'; // Purple (Severe)
      if (val > 200) return '#ef4444'; // Red (Very Poor)
      if (val > 100) return '#f97316'; // Orange (Moderate/Poor)
      if (val > 50) return '#eab308';  // Yellow (Satisfactory)
      return '#10b981';                // Emerald (Good)
    }
    if (dataType === 'hcho') {
      return val > 1.5 ? '#ec4899' : '#6366f1'; // threshold scaled by 1e5
    }
    if (dataType === 'fire') {
      return val > 150 ? '#f43f5e' : '#f97316';
    }
    // Default/Pollutant:
    if (val > 75) return '#ef4444';
    return '#06b6d4';
  };

  // Helper to determine color corresponding to an interpolated value
  const getValueColor = (val: number, type?: string, pts?: MapPoint[]) => {
    if (type === 'aqi') {
      if (val > 300) return '#a855f7';
      if (val > 200) return '#ef4444';
      if (val > 100) return '#f97316';
      if (val > 50) return '#eab308';
      return '#10b981';
    }
    if (type === 'hcho') {
      return val > 1.5 ? '#ec4899' : '#6366f1';
    }
    if (type === 'fire') {
      return val > 150 ? '#f43f5e' : '#f97316';
    }
    if (type === 'pollutant') {
      if (val > 75) return '#ef4444';
      return '#06b6d4';
    }
    
    // Fallback: search nearest value color in the actual points list
    if (pts && pts.length > 0) {
      let nearestPt = pts[0];
      let minDist = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const diff = Math.abs(pts[i].value - val);
        if (diff < minDist) {
          minDist = diff;
          nearestPt = pts[i];
        }
      }
      return getPointColor(nearestPt);
    }
    return '#10b981';
  };

  // Check if wind direction is available in points
  const hasWindData = useMemo(() => {
    return points.some(pt => pt.wind_direction !== undefined);
  }, [points]);

  // Create a custom Leaflet DivIcon for wind vectors (rotated SVG arrow)
  const createWindIcon = (direction: number, speed: number, color?: string) => {
    const rotation = (direction + 180) % 360; 
    const size = Math.max(10, Math.min(22, 10 + speed * 1.2));
    const arrowColor = color || '#0284c7'; 

    return L.divIcon({
      className: 'custom-wind-arrow',
      html: `
        <div style="
          transform: rotate(${rotation}deg);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          opacity: 0.7;
          transition: all 0.2s ease;
        ">
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 10H9V22H15V10H20L12 2Z" fill="${arrowColor}" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.8"/>
          </svg>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Generate a smooth raster overlay from grid/points using HTML5 Canvas (direct mapping or IDW)
  const imageUrl = useMemo(() => {
    if (points.length === 0) return '';

    // 1. DENSE GRID PATTERN (e.g. weather forecast model grid)
    if (points.length > 200) {
      const canvas = document.createElement('canvas');
      const width = 21;  // 21 steps for longitude
      const height = 22; // 22 steps for latitude
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill('rgba(0,0,0,0)'));

      points.forEach(pt => {
        const x = Math.round((pt.longitude - 68.0) / 1.5);
        const y = Math.round((37.5 - pt.latitude) / 1.5);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          grid[y][x] = getPointColor(pt);
        }
      });

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (grid[y][x] === 'rgba(0,0,0,0)') {
            let nearestColor = '#10b981';
            let minD = Infinity;
            points.forEach(pt => {
              const px = Math.round((pt.longitude - 68.0) / 1.5);
              const py = Math.round((37.5 - pt.latitude) / 1.5);
              const d = (px - x) ** 2 + (py - y) ** 2;
              if (d < minD) {
                minD = d;
                nearestColor = getPointColor(pt);
              }
            });
            grid[y][x] = nearestColor;
          }
        }
      }

      const imgData = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const hex = grid[y][x];
          const r = parseInt(hex.slice(1, 3), 16) || 0;
          const g = parseInt(hex.slice(3, 5), 16) || 0;
          const b = parseInt(hex.slice(5, 7), 16) || 0;
          
          const idx = (y * width + x) * 4;
          imgData.data[idx] = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = b;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL();
    }

    // 2. SPARSE POINT PATTERN (e.g. AQI stations, fire hotspots, trajectories)
    // Run Inverse Distance Weighting (IDW) to interpolate a continuous smooth field
    const canvas = document.createElement('canvas');
    const width = 50;  // 50 x 50 is fast and stretches smoothly
    const height = 50;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.createImageData(width, height);
    
    // Bounds matching India bbox
    const minLat = 5.0;
    const maxLat = 38.5;
    const minLon = 67.0;
    const maxLon = 99.0;

    for (let r_idx = 0; r_idx < height; r_idx++) {
      const lat = maxLat - (r_idx / (height - 1)) * (maxLat - minLat);
      for (let c_idx = 0; c_idx < width; c_idx++) {
        const lon = minLon + (c_idx / (width - 1)) * (maxLon - minLon);

        let numerator = 0;
        let denominator = 0;
        let exactColor = null;

        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const d2 = (pt.latitude - lat) ** 2 + (pt.longitude - lon) ** 2;
          
          if (d2 < 0.005) { // Very close to station
            exactColor = getPointColor(pt);
            break;
          }
          const weight = 1 / (d2 ** 1.15); // Power factor 1.15 creates smooth waves
          numerator += pt.value * weight;
          denominator += weight;
        }

        let hex = '#10b981';
        if (exactColor) {
          hex = exactColor;
        } else if (denominator > 0) {
          const interpVal = numerator / denominator;
          hex = getValueColor(interpVal, dataType, points);
        }

        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        
        const idx = (r_idx * width + c_idx) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }, [points, dataType]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50">
      {/* Floating Display Mode & Wind Toggles */}
      <div className="absolute top-4 right-4 z-[999] glass-card p-1.5 rounded-lg border border-slate-200 flex gap-2 shadow-md pointer-events-auto">
        <div className="flex gap-1 border-r border-slate-200 pr-2">
          {(['smooth', 'hybrid', 'grid'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all duration-150 ${
                displayMode === mode
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {hasWindData && (
          <button
            onClick={() => setShowWind(!showWind)}
            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1 ${
              showWind
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🧭</span>
            <span>Wind</span>
          </button>
        )}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        minZoom={4.5}
        maxBounds={[[5.0, 65.0], [38.5, 99.0]]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
      >
        {/* Beautiful Light-Themed Voyager Map Layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Render the smooth continuous color overlay image */}
        {(displayMode === 'smooth' || displayMode === 'hybrid') && imageUrl && (
          <ImageOverlay
            url={imageUrl}
            bounds={gridBounds}
            opacity={0.45}
          />
        )}

        {/* Render Wind Vector arrows */}
        {showWind && hasWindData && points.map((pt, idx) => {
          if (idx % 2 !== 0 || pt.wind_direction === undefined || pt.wind_speed === undefined) {
            return null;
          }
          const color = getPointColor(pt);
          return (
            <Marker
              key={`wind-${pt.latitude}-${pt.longitude}-${idx}`}
              position={[pt.latitude, pt.longitude]}
              icon={createWindIcon(pt.wind_direction, pt.wind_speed, color)}
            />
          );
        })}

        {/* Render grid cell point markers */}
        {points.map((pt, idx) => {
          const color = getPointColor(pt);
          const isSmoothOnly = displayMode === 'smooth';

          // For fire incidents, make markers slightly larger and glowing
          const markerRadius = dataType === 'fire' ? Math.max(4, Math.min(12, pt.value / 30)) : 6;

          return (
            <CircleMarker
              key={`${pt.latitude}-${pt.longitude}-${idx}`}
              center={[pt.latitude, pt.longitude]}
              radius={isSmoothOnly ? 12 : markerRadius}
              pathOptions={{
                fillColor: color,
                color: isSmoothOnly ? 'transparent' : '#ffffff',
                weight: isSmoothOnly ? 0 : 1.2,
                fillOpacity: isSmoothOnly ? 0 : 0.75,
                opacity: isSmoothOnly ? 0 : 0.9
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                <div className="bg-slate-950 text-white p-2 rounded-lg text-[11px] font-sans border border-slate-800 shadow-md">
                  <div className="font-bold text-purple-400 mb-0.5">{pt.state || 'Observation Point'}</div>
                  <div className="text-slate-300">
                    Lat: <span className="text-white font-medium">{pt.latitude.toFixed(2)}</span>, 
                    Lon: <span className="text-white font-medium">{pt.longitude.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-300 mt-1">
                    {variableName}: <span className="text-emerald-400 font-extrabold">{pt.value} {unit}</span>
                  </div>
                  {pt.wind_direction !== undefined && pt.wind_speed !== undefined && (
                    <div className="text-slate-300 mt-0.5">
                      Wind: <span className="text-cyan-400 font-bold">{pt.wind_speed} m/s</span> from <span className="text-cyan-400 font-bold">{pt.wind_direction}°</span>
                    </div>
                  )}
                  {pt.label && !pt.label.includes('(') && (
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800/80 pt-1">
                      {pt.label}
                    </div>
                  )}
                  {pt.label && pt.label.includes('(') && (
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800/80 pt-1">
                      {pt.label.substring(pt.label.indexOf('('))}
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Sleek Floating Custom Legend */}
      <div className="absolute bottom-4 right-4 z-[999] glass-card p-3.5 rounded-xl border border-slate-200 text-[10px] space-y-2 text-slate-700 pointer-events-auto shadow-lg">
        <div className="font-bold text-slate-900 uppercase tracking-wider text-[9px] border-b border-slate-100 pb-1 mb-1">
          {variableName} Legend
        </div>
        <div className="flex flex-col gap-1.5">
          {dataType === 'aqi' && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#a855f7] inline-block"></span>
                <span>Severe (&gt; 300)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block"></span>
                <span>Very Poor (200 - 300)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f97316] inline-block"></span>
                <span>Moderate/Poor (100 - 200)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#eab308] inline-block"></span>
                <span>Satisfactory (50 - 100)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block"></span>
                <span>Good (&lt; 50)</span>
              </div>
            </>
          )}
          {dataType === 'hcho' && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ec4899] inline-block"></span>
                <span>High Risk (&gt; 1.5 × 10⁻⁵)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#6366f1] inline-block"></span>
                <span>Normal (&lt; 1.5 × 10⁻⁵)</span>
              </div>
            </>
          )}
          {dataType === 'fire' && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f43f5e] inline-block"></span>
                <span>Extreme Hotspot (&gt; 150 FRP)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f97316] inline-block"></span>
                <span>Moderate Fire (&lt; 150 FRP)</span>
              </div>
            </>
          )}
          {dataType === 'pollutant' && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block"></span>
                <span>High (&gt; 75)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#06b6d4] inline-block"></span>
                <span>Normal (&lt; 75)</span>
              </div>
            </>
          )}
          {/* Weather Variable Legend */}
          {!dataType && variableName.toLowerCase().includes('temperature') && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block"></span>
                <span>Hot (&gt; 35 °C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f97316] inline-block"></span>
                <span>Warm (30 - 35 °C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#fbbf24] inline-block"></span>
                <span>Mild (25 - 30 °C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#60a5fa] inline-block"></span>
                <span>Cool (15 - 25 °C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block"></span>
                <span>Cold (&lt; 15 °C)</span>
              </div>
            </>
          )}
          {!dataType && variableName.toLowerCase().includes('wind') && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#2563eb] inline-block"></span>
                <span>High (&gt; 9 m/s)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0d9488] inline-block"></span>
                <span>Moderate (6 - 9 m/s)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#06b6d4] inline-block"></span>
                <span>Light (3 - 6 m/s)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#22d3ee] inline-block"></span>
                <span>Gentle (&lt; 3 m/s)</span>
              </div>
            </>
          )}
          {!dataType && variableName.toLowerCase().includes('humidity') && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0284c7] inline-block"></span>
                <span>Humid (&gt; 70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#14b8a6] inline-block"></span>
                <span>Moderate (40 - 70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#a3e635] inline-block"></span>
                <span>Dry (&lt; 40%)</span>
              </div>
            </>
          )}
          {!dataType && variableName.toLowerCase().includes('boundary') && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#4f46e5] inline-block"></span>
                <span>High (&gt; 1500 m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#8b5cf6] inline-block"></span>
                <span>Moderate (800 - 1500 m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#c084fc] inline-block"></span>
                <span>Low (&lt; 800 m)</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndiaMap2D;
