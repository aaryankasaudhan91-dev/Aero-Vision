import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { isPointInIndia } from '../utils/indiaMask';
import { transportApi } from '../services/api';

export interface WindPoint {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  wind_direction?: number;
  wind_speed?: number;
  direction?: number;
  speed?: number;
  u?: number;
  v?: number;
}

interface WindStreamlinesOverlayProps {
  points?: WindPoint[];
  visible?: boolean;
}

interface Particle {
  lat: number;
  lon: number;
  age: number;
  maxAge: number;
  speed: number;
  trail: Array<{ x: number; y: number }>;
}

interface VectorPoint {
  lat: number;
  lon: number;
  u: number;
  v: number;
  speed: number;
  direction: number;
}

// Module-level cache to share wind vector telemetry across components, mounts, and page transitions
let cachedWindVectors: VectorPoint[] | null = null;
let inflightWindPromise: Promise<VectorPoint[]> | null = null;
let lastWindFetchTime = 0;
const WIND_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const WindStreamlinesOverlay: React.FC<WindStreamlinesOverlayProps> = ({
  points = [],
  visible = true,
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [liveVectors, setLiveVectors] = useState<VectorPoint[]>(cachedWindVectors || []);
  const hasFetchedRef = useRef(false);

  // Check if caller already provided valid wind vectors embedded in props
  const propVectors = React.useMemo(() => {
    if (!points || points.length === 0) return [];
    const hasWind = points.some(p => p.wind_speed !== undefined || p.speed !== undefined || p.u !== undefined);
    if (!hasWind) return [];
    return points
      .filter(p => (p.latitude ?? p.lat) && (p.longitude ?? p.lon))
      .map((item: any) => {
        const lat = item.lat ?? item.latitude;
        const lon = item.lon ?? item.longitude;
        const dir = item.wind_direction ?? item.direction ?? 0;
        const spd = item.wind_speed ?? item.speed ?? 3.5;
        const u = item.u ?? -Math.sin((dir * Math.PI) / 180) * spd;
        const v = item.v ?? -Math.cos((dir * Math.PI) / 180) * spd;
        return {
          lat,
          lon,
          u,
          v,
          speed: spd,
          direction: dir,
        };
      });
  }, [points]);

  // 1. Fetch real-time meteorological wind vectors once from backend only when visible and not provided in props
  useEffect(() => {
    let isMounted = true;

    // Do not initiate network requests if overlay is toggled off
    if (!visible) return;

    // If caller provided points with wind fields, use them directly without network calls
    if (propVectors.length > 0) {
      return;
    }

    // If cache is fresh, hydrate immediately without network request
    if (cachedWindVectors && (Date.now() - lastWindFetchTime < WIND_CACHE_TTL_MS)) {
      setLiveVectors(cachedWindVectors);
      return;
    }

    // Guard against duplicate concurrent or repeated network requests in this component instance
    if (hasFetchedRef.current) {
      return;
    }

    const fetchRealTimeWind = async () => {
      hasFetchedRef.current = true;
      try {
        if (!inflightWindPromise) {
          inflightWindPromise = transportApi.getWindVectors()
            .then(res => {
              if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                const mapped: VectorPoint[] = res.data.map((item: any) => ({
                  lat: item.lat ?? item.latitude,
                  lon: item.lon ?? item.longitude,
                  u: item.u ?? -Math.sin(((item.direction ?? 0) * Math.PI) / 180) * (item.speed ?? 3.5),
                  v: item.v ?? -Math.cos(((item.direction ?? 0) * Math.PI) / 180) * (item.speed ?? 3.5),
                  speed: item.speed ?? Math.sqrt((item.u ?? 0) ** 2 + (item.v ?? 0) ** 2),
                  direction: item.direction ?? ((Math.atan2(-(item.u ?? 0), -(item.v ?? 0)) * 180) / Math.PI + 360) % 360,
                }));
                cachedWindVectors = mapped;
                lastWindFetchTime = Date.now();
                return mapped;
              }
              return [];
            })
            .catch(err => {
              console.warn('Real-time wind vector telemetry fallback to synoptic mode:', err);
              // Back off for 5 minutes before retrying on failure
              lastWindFetchTime = Date.now() - (WIND_CACHE_TTL_MS - 5 * 60 * 1000);
              return [];
            })
            .finally(() => {
              inflightWindPromise = null;
            });
        }

        const data = await inflightWindPromise;
        if (isMounted && data.length > 0) {
          setLiveVectors(data);
        }
      } catch (err) {
        console.warn('Wind vector handler exception:', err);
      }
    };

    fetchRealTimeWind();

    // Re-fetch only on explicit manual user refresh trigger
    const onRefresh = () => {
      hasFetchedRef.current = false;
      cachedWindVectors = null;
      lastWindFetchTime = 0;
      if (visible && propVectors.length === 0) {
        fetchRealTimeWind();
      }
    };
    window.addEventListener('refresh-active-dashboard', onRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('refresh-active-dashboard', onRefresh);
    };
  }, [visible, propVectors.length]);

  useEffect(() => {
    if (!visible) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const container = map.getContainer();
    if (!container) return;

    // 2. Create or retrieve absolute canvas element over map
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'leaflet-wind-canvas-layer pointer-events-none absolute inset-0';
      canvas.style.position = 'absolute';
      canvas.style.left = '0px';
      canvas.style.top = '0px';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '400';
      canvas.style.pointerEvents = 'none';
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      if (!canvas || !container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    resizeCanvas();

    // 3. Build unified vector pool from props or live fetched vectors
    const vectorPool: VectorPoint[] = [];

    // Prioritize valid wind vectors passed in props
    if (points && points.length > 0) {
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const lat = pt.latitude ?? pt.lat;
        const lon = pt.longitude ?? pt.lon;
        const dir = pt.wind_direction ?? pt.direction;
        const spd = pt.wind_speed ?? pt.speed;

        if (lat !== undefined && lon !== undefined && dir !== undefined && spd !== undefined) {
          const rad = (dir * Math.PI) / 180;
          vectorPool.push({
            lat,
            lon,
            u: pt.u ?? -Math.sin(rad) * spd,
            v: pt.v ?? -Math.cos(rad) * spd,
            speed: spd,
            direction: dir,
          });
        }
      }
    }

    // If points had no wind vectors, use the real-time live vectors from Supabase ERA5
    if (vectorPool.length === 0 && liveVectors.length > 0) {
      vectorPool.push(...liveVectors);
    }

    // 4. Build high-performance 1-degree spatial hash grid for instant O(1) interpolation
    const spatialGrid = new Map<string, VectorPoint[]>();
    for (let i = 0; i < vectorPool.length; i++) {
      const v = vectorPool[i];
      const key = `${Math.floor(v.lat)}_${Math.floor(v.lon)}`;
      let list = spatialGrid.get(key);
      if (!list) {
        list = [];
        spatialGrid.set(key, list);
      }
      list.push(v);
    }

    // Helper: sample wind vector (speed in m/s, direction in degrees) using spatial grid
    const getLocalWind = (lat: number, lon: number): { speed: number; direction: number } => {
      if (vectorPool.length > 0) {
        const baseLat = Math.floor(lat);
        const baseLon = Math.floor(lon);
        let uSum = 0;
        let vSum = 0;
        let totalW = 0;

        // Search 3x3 neighboring 1-degree cells
        for (let dLat = -1; dLat <= 1; dLat++) {
          for (let dLon = -1; dLon <= 1; dLon++) {
            const key = `${baseLat + dLat}_${baseLon + dLon}`;
            const cellPoints = spatialGrid.get(key);
            if (cellPoints) {
              for (let i = 0; i < cellPoints.length; i++) {
                const pt = cellPoints[i];
                const d2 = (pt.lat - lat) ** 2 + (pt.lon - lon) ** 2;
                if (d2 < 6.0) {
                  const w = 1 / (d2 + 0.15);
                  uSum += pt.u * w;
                  vSum += pt.v * w;
                  totalW += w;
                }
              }
            }
          }
        }

        if (totalW > 0) {
          const u = uSum / totalW;
          const v = vSum / totalW;
          const spd = Math.sqrt(u * u + v * v);
          const dir = (Math.atan2(-u, -v) * 180) / Math.PI;
          return { speed: Math.max(1.5, spd), direction: (dir + 360) % 360 };
        }
      }

      // Meteorological synoptic Indian Subcontinent baseline fallback
      let baseDir = 305;
      let baseSpd = 4.5;
      if (lat < 18) {
        baseDir = 265 + (lon - 76) * 1.2;
        baseSpd = 5.2;
      } else if (lat >= 18 && lat <= 28) {
        baseDir = 310 - (lat - 18) * 1.5 + (lon - 78) * 0.9;
        baseSpd = 4.2 + Math.sin(lat * 0.5) * 1.1;
      } else {
        baseDir = 295;
        baseSpd = 3.6;
      }
      return { speed: baseSpd, direction: (baseDir + 360) % 360 };
    };

    // 5. Initialize Responsive Particle Pool (150 on mobile for 60fps, 300 on desktop)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 150 : 300;
    const particles: Particle[] = [];

    const spawnParticle = (p?: Particle): Particle => {
      const bounds = map.getBounds();
      const minLat = Math.max(6.5, bounds.getSouth());
      const maxLat = Math.min(37.5, bounds.getNorth());
      const minLon = Math.max(68.0, bounds.getWest());
      const maxLon = Math.min(97.5, bounds.getEast());

      // Guarantee particle is spawned inside India territory
      let lat = 22.0;
      let lon = 78.0;
      let attempts = 0;
      while (attempts < 35) {
        const testLat = minLat + Math.random() * (maxLat - minLat);
        const testLon = minLon + Math.random() * (maxLon - minLon);
        if (isPointInIndia(testLon, testLat)) {
          lat = testLat;
          lon = testLon;
          break;
        }
        attempts++;
      }

      const wind = getLocalWind(lat, lon);

      const target = p || {
        lat,
        lon,
        age: Math.floor(Math.random() * 60),
        maxAge: 85 + Math.floor(Math.random() * 70),
        speed: wind.speed,
        trail: []
      };

      target.lat = lat;
      target.lon = lon;
      target.age = 0;
      target.maxAge = 80 + Math.floor(Math.random() * 65);
      target.speed = wind.speed;
      target.trail = [];
      return target;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = spawnParticle();
      p.age = Math.floor(Math.random() * p.maxAge);
      particles.push(p);
    }

    // 6. Animation loop with continuous flowing trails & velocity-graded colors
    const MAX_TRAIL_LENGTH = isMobile ? 12 : 16;
    const SPEED_SCALE = 0.0034; // Lat/lon step multiplier per m/s

    const render = () => {
      if (!canvas || !ctx) return;
      resizeCanvas();

      const width = canvas.width;
      const height = canvas.height;

      // Clear the canvas cleanly each frame to preserve underlying map clarity
      ctx.clearRect(0, 0, width, height);

      const bounds = map.getBounds();
      const minLat = bounds.getSouth() - 0.5;
      const maxLat = bounds.getNorth() + 0.5;
      const minLon = bounds.getWest() - 0.5;
      const maxLon = bounds.getEast() + 0.5;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++;

        // If particle expired, drifted outside view, or exited India territory, respawn
        if (
          p.age > p.maxAge ||
          p.lat < minLat ||
          p.lat > maxLat ||
          p.lon < minLon ||
          p.lon > maxLon ||
          !isPointInIndia(p.lon, p.lat)
        ) {
          spawnParticle(p);
          continue;
        }

        // Get current screen coordinate
        const screenPt = map.latLngToContainerPoint([p.lat, p.lon]);

        if (
          screenPt.x < -30 ||
          screenPt.x > width + 30 ||
          screenPt.y < -30 ||
          screenPt.y > height + 30
        ) {
          spawnParticle(p);
          continue;
        }

        p.trail.push({ x: screenPt.x, y: screenPt.y });
        if (p.trail.length > MAX_TRAIL_LENGTH) {
          p.trail.shift();
        }

        // Advance particle along real-time wind vector
        const wind = getLocalWind(p.lat, p.lon);
        p.speed = wind.speed;
        const rad = (wind.direction * Math.PI) / 180;
        const u = -Math.sin(rad) * wind.speed;
        const v = -Math.cos(rad) * wind.speed;

        p.lon += u * SPEED_SCALE;
        p.lat += v * SPEED_SCALE;

        // Draw smooth streamline trail
        const trailLen = p.trail.length;
        if (trailLen >= 2) {
          const lifeProgress = p.age / p.maxAge;
          let overallAlpha = 0.85;
          if (lifeProgress < 0.15) {
            overallAlpha = (lifeProgress / 0.15) * 0.85;
          } else if (lifeProgress > 0.8) {
            overallAlpha = ((1 - lifeProgress) / 0.2) * 0.85;
          }

          // Real-time velocity color grading:
          // Gentle (< 3.0 m/s): sky blue / cyan
          // Moderate (3.0 - 6.0 m/s): vibrant cyan / teal
          // High (> 6.0 m/s): warm amber / gold
          const isHighWind = p.speed > 5.5;
          const isModerate = p.speed >= 3.0 && p.speed <= 5.5;

          for (let t = 0; t < trailLen - 1; t++) {
            const p0 = p.trail[t];
            const p1 = p.trail[t + 1];
            const segAlpha = (t / (trailLen - 1)) * overallAlpha;

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);

            if (isHighWind) {
              ctx.strokeStyle = `rgba(245, 158, 11, ${segAlpha})`; // amber-500
            } else if (isModerate) {
              ctx.strokeStyle = `rgba(14, 165, 233, ${segAlpha})`; // sky-500
            } else {
              ctx.strokeStyle = `rgba(56, 189, 248, ${segAlpha * 0.9})`; // sky-400
            }

            ctx.lineWidth = 1.2 + (t / trailLen) * 0.8;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          // Glowing head dot
          const head = p.trail[trailLen - 1];
          ctx.beginPath();
          ctx.arc(head.x, head.y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = isHighWind
            ? `rgba(251, 191, 36, ${overallAlpha})`
            : `rgba(224, 242, 254, ${overallAlpha})`;
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    const onMapTransform = () => {
      particles.forEach(p => {
        p.trail = [];
      });
    };

    map.on('movestart', onMapTransform);
    map.on('zoomstart', onMapTransform);
    map.on('resize', resizeCanvas);

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      map.off('movestart', onMapTransform);
      map.off('zoomstart', onMapTransform);
      map.off('resize', resizeCanvas);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, [map, visible, points, liveVectors]);

  return null;
};

export default WindStreamlinesOverlay;
