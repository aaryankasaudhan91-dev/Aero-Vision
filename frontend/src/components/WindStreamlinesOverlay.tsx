import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { isPointInIndia } from '../utils/indiaMask';

export interface WindPoint {
  latitude: number;
  longitude: number;
  wind_direction?: number;
  wind_speed?: number;
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

export const WindStreamlinesOverlay: React.FC<WindStreamlinesOverlayProps> = ({
  points = [],
  visible = true,
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

    // 1. Create or retrieve absolute canvas element over map
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

    // 2. Filter known wind points for interpolation
    const knownWindPoints = points.filter(
      pt => pt.wind_direction !== undefined && pt.wind_speed !== undefined
    );

    // Helper: sample wind vector (speed in m/s, direction in degrees)
    const getLocalWind = (lat: number, lon: number): { speed: number; direction: number } => {
      if (knownWindPoints.length > 0) {
        let totalW = 0;
        let uSum = 0;
        let vSum = 0;
        // Sample nearest 5 points
        for (let i = 0; i < knownWindPoints.length; i++) {
          const pt = knownWindPoints[i];
          const d2 = (pt.latitude - lat) ** 2 + (pt.longitude - lon) ** 2;
          const w = 1 / (d2 + 0.2);
          const rad = ((pt.wind_direction || 0) * Math.PI) / 180;
          const spd = pt.wind_speed || 4.0;
          // Meteorological convention: direction wind is blowing from
          const u = -Math.sin(rad) * spd;
          const v = -Math.cos(rad) * spd;
          uSum += u * w;
          vSum += v * w;
          totalW += w;
        }
        if (totalW > 0) {
          const u = uSum / totalW;
          const v = vSum / totalW;
          const spd = Math.sqrt(u * u + v * v);
          const dir = (Math.atan2(-u, -v) * 180) / Math.PI;
          return { speed: Math.max(1.8, spd), direction: (dir + 360) % 360 };
        }
      }

      // Realistic meteorological synoptic wind field across the Indian Subcontinent
      // Indo-Gangetic trough: North-westerly airflow (300-320 deg)
      // Peninsula: Westerly/South-westerly airflow (250-280 deg)
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

    // 3. Initialize Particle Pool
    const PARTICLE_COUNT = 240;
    const particles: Particle[] = [];

    const spawnParticle = (p?: Particle): Particle => {
      const bounds = map.getBounds();
      const minLat = Math.max(6.5, bounds.getSouth());
      const maxLat = Math.min(37.5, bounds.getNorth());
      const minLon = Math.max(68.0, bounds.getWest());
      const maxLon = Math.min(97.5, bounds.getEast());

      // Guarantee particle is spawned inside India
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
        age: Math.floor(Math.random() * 50),
        maxAge: 70 + Math.floor(Math.random() * 60),
        speed: wind.speed,
        trail: []
      };

      target.lat = lat;
      target.lon = lon;
      target.age = 0;
      target.maxAge = 70 + Math.floor(Math.random() * 60);
      target.speed = wind.speed;
      target.trail = [];
      return target;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = spawnParticle();
      // Stagger ages so particles don't all die at once
      p.age = Math.floor(Math.random() * p.maxAge);
      particles.push(p);
    }

    // 4. Animation loop
    const MAX_TRAIL_LENGTH = 10;
    const SPEED_SCALE = 0.0035; // Lat/lon step multiplier per m/s

    const render = () => {
      if (!canvas || !ctx) return;
      resizeCanvas();

      const width = canvas.width;
      const height = canvas.height;

      // Clear the canvas cleanly each frame to preserve underlying map sharpness
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

        // Check if screen point is within visible area
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

        // Compute local wind vector to advance position
        const wind = getLocalWind(p.lat, p.lon);
        p.speed = wind.speed;
        const rad = (wind.direction * Math.PI) / 180;
        // Direction blowing towards
        const u = -Math.sin(rad) * wind.speed; // longitude delta
        const v = -Math.cos(rad) * wind.speed; // latitude delta

        p.lon += u * SPEED_SCALE;
        p.lat += v * SPEED_SCALE;

        // Draw streamline if we have at least 2 points
        if (p.trail.length >= 2) {
          // Calculate lifecycle fade alpha
          const lifeProgress = p.age / p.maxAge;
          let alpha = 0.75;
          if (lifeProgress < 0.2) {
            alpha = (lifeProgress / 0.2) * 0.75;
          } else if (lifeProgress > 0.75) {
            alpha = ((1 - lifeProgress) / 0.25) * 0.75;
          }

          // Pick dynamic color based on wind velocity
          let strokeColor = `rgba(2, 132, 199, ${alpha})`; // Sky blue
          let headColor = `rgba(3, 105, 161, ${alpha * 1.1})`;
          if (p.speed > 7.0) {
            strokeColor = `rgba(13, 148, 136, ${alpha})`; // Teal for fast wind
            headColor = `rgba(15, 118, 110, ${alpha * 1.1})`;
          } else if (p.speed > 10.0) {
            strokeColor = `rgba(79, 70, 229, ${alpha})`; // Indigo for high gusts
            headColor = `rgba(67, 56, 202, ${alpha * 1.1})`;
          }

          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Draw head particle glowing dot
          const head = p.trail[p.trail.length - 1];
          ctx.beginPath();
          ctx.arc(head.x, head.y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = headColor;
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    // Map events handling: reset trails on pan/zoom so trails don't stretch
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
  }, [map, visible, points]);

  return null;
};

export default WindStreamlinesOverlay;
