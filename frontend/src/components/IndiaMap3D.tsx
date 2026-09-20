import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { INDIA_GEOJSON, clipCanvasToIndia, isPointInIndia } from '../utils/indiaMask';

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

interface IndiaMap3DProps {
  points: MapPoint[];
  dataType: 'aqi' | 'hcho' | 'fire' | 'pollutant';
  pollutantName?: string;
  variableName?: string;
  unit?: string;
}

// Center reference and scaling factor for 3D geospatial projection
const CENTER_LON = 80.0;
const CENTER_LAT = 22.0;
const MAP_SCALE = 0.46;

// Surrounding countries and geographical features to provide complete subcontinental context
const SURROUNDING_COUNTRIES: { name: string; labelPos: [number, number]; coordinates: [number, number][] }[] = [
  {
    name: 'PAKISTAN',
    labelPos: [68.0, 29.5],
    coordinates: [
      [68.5, 23.5], [66.5, 25.2], [62.0, 25.2], [61.5, 28.0], [62.5, 29.5],
      [64.0, 29.5], [66.5, 31.5], [69.5, 32.0], [71.0, 34.0], [71.5, 36.0],
      [74.5, 37.0], [74.5, 32.5], [74.0, 31.0], [71.0, 27.5], [70.5, 25.0], [68.5, 23.5]
    ]
  },
  {
    name: 'NEPAL',
    labelPos: [84.0, 28.4],
    coordinates: [
      [80.0, 28.8], [81.0, 30.2], [82.0, 30.0], [84.0, 28.5], [88.0, 28.0],
      [88.2, 26.8], [85.0, 26.8], [83.5, 27.5], [81.5, 28.5], [80.0, 28.8]
    ]
  },
  {
    name: 'BHUTAN',
    labelPos: [90.5, 27.5],
    coordinates: [
      [88.8, 27.2], [89.5, 28.2], [91.5, 28.3], [92.1, 27.4], [92.0, 26.8],
      [89.8, 26.8], [88.8, 27.2]
    ]
  },
  {
    name: 'BANGLADESH',
    labelPos: [90.2, 23.8],
    coordinates: [
      [88.0, 26.5], [89.0, 26.2], [89.5, 25.2], [92.0, 25.1], [92.3, 23.7],
      [92.2, 21.3], [91.8, 21.5], [90.5, 22.0], [89.0, 21.8], [89.0, 23.0],
      [88.2, 24.5], [88.0, 26.5]
    ]
  },
  {
    name: 'SRI LANKA',
    labelPos: [80.7, 7.8],
    coordinates: [
      [79.8, 9.8], [80.3, 9.8], [81.3, 8.6], [81.8, 7.3], [81.2, 6.0],
      [80.5, 5.9], [79.8, 6.9], [79.8, 8.5], [79.8, 9.8]
    ]
  },
  {
    name: 'MYANMAR',
    labelPos: [95.2, 21.5],
    coordinates: [
      [92.5, 21.0], [92.3, 23.7], [93.5, 24.0], [95.0, 26.0], [97.0, 28.0],
      [98.5, 27.5], [98.5, 25.0], [97.5, 23.0], [96.0, 21.0], [94.5, 19.5], [92.5, 21.0]
    ]
  }
];

const WATER_BODIES = [
  { name: 'ARABIAN SEA', pos: [68.5, 15.0] as [number, number] },
  { name: 'BAY OF BENGAL', pos: [89.5, 14.5] as [number, number] },
  { name: 'INDIAN OCEAN', pos: [78.5, 2.5] as [number, number] }
];

// Helper to determine color corresponding to an interpolated value
function getPointColor(val: number, dataType: string, customColor?: string): string {
  if (customColor) return customColor;
  if (dataType === 'aqi') {
    if (val > 300) return '#a855f7'; // Purple (Severe)
    if (val > 200) return '#ef4444'; // Red (Very Poor)
    if (val > 100) return '#f97316'; // Orange (Moderate/Poor)
    if (val > 50) return '#eab308';  // Yellow (Satisfactory)
    return '#10b981';                // Emerald (Good)
  }
  if (dataType === 'hcho') {
    return val > 1.5 ? '#ec4899' : '#6366f1';
  }
  if (dataType === 'fire') {
    return val > 150 ? '#f43f5e' : '#f97316';
  }
  if (val > 75) return '#ef4444';
  return '#06b6d4';
}

function getAQILabel(val: number, dataType: string): string {
  if (dataType === 'aqi') {
    if (val > 300) return 'Severe';
    if (val > 200) return 'Very Poor';
    if (val > 100) return 'Moderate';
    if (val > 50) return 'Satisfactory';
    return 'Good';
  }
  if (dataType === 'fire') {
    return val > 150 ? 'High FRP' : 'Normal FRP';
  }
  return 'Telemetry Node';
}

// Create a high-res text billboard sprite for regional names & waters
function createTextSprite(text: string, color = '#64748b', fontSize = 22, opacity = 0.75): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  ctx.font = `600 ${fontSize}px "Inter", -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '3px';
  ctx.fillText(text, 192, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

// Generate soft radial glow texture for continuous luminous atmospheric wind particles
function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(56, 189, 248, 0.95)');
    gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.45)');
    gradient.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export const IndiaMap3D: React.FC<IndiaMap3DProps> = ({
  points,
  dataType,
  variableName = 'AQI',
  unit = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Smooth Camera transition targets
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(0, -11.5, 14.5));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isTransitioningCamera = useRef<boolean>(false);

  // Scene references for smooth persistent updates without canvas teardown
  const pillarsGroupRef = useRef<THREE.Group | null>(null);
  const topMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const windGroupRef = useRef<THREE.Group | null>(null);
  const surroundingsGroupRef = useRef<THREE.Group | null>(null);

  // UI Interactive states: Auto-rotation is FALSE by default as requested
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showPillars, setShowPillars] = useState<boolean>(true);
  const [showSurroundings, setShowSurroundings] = useState<boolean>(true);
  const [showWindFlow, setShowWindFlow] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<'perspective' | 'top' | 'horizon'>('perspective');

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    state?: string;
    valStr: string;
    category: string;
    color: string;
    windStr?: string;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    title: '',
    valStr: '',
    category: '',
    color: '#10b981',
    visible: false,
  });

  // Project longitude & latitude into 3D Cartesian coordinates
  const project = useCallback((lon: number, lat: number) => {
    return new THREE.Vector2(
      (lon - CENTER_LON) * MAP_SCALE,
      (lat - CENTER_LAT) * MAP_SCALE
    );
  }, []);

  // Generate continuous WebGL heatmap texture clipped STRICTLY to India
  const heatmapTexture = useMemo(() => {
    if (points.length === 0) return null;

    const width = 80;
    const height = 80;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const minLat = 5.0;
    const maxLat = 38.5;
    const minLon = 67.0;
    const maxLon = 99.0;

    const imgData = ctx.createImageData(width, height);

    for (let r = 0; r < height; r++) {
      const lat = maxLat - (r / (height - 1)) * (maxLat - minLat);
      for (let c = 0; c < width; c++) {
        const lon = minLon + (c / (width - 1)) * (maxLon - minLon);

        let numerator = 0;
        let denominator = 0;
        let exactColor = null;

        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const d2 = (pt.latitude - lat) ** 2 + (pt.longitude - lon) ** 2;

          if (d2 < 0.006) {
            exactColor = getPointColor(pt.value, dataType, pt.color);
            break;
          }
          const weight = 1 / (d2 ** 1.15);
          numerator += pt.value * weight;
          denominator += weight;
        }

        let hex = '#10b981';
        if (exactColor) {
          hex = exactColor;
        } else if (denominator > 0) {
          const val = numerator / denominator;
          hex = getPointColor(val, dataType);
        }

        const red = parseInt(hex.slice(1, 3), 16) || 0;
        const green = parseInt(hex.slice(3, 5), 16) || 0;
        const blue = parseInt(hex.slice(5, 7), 16) || 0;

        const idx = (r * width + c) * 4;
        imgData.data[idx] = red;
        imgData.data[idx + 1] = green;
        imgData.data[idx + 2] = blue;
        imgData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Vector-clip strictly to India's MultiPolygon boundary (leaving outside 100% transparent)
    const clippedCanvas = clipCanvasToIndia(canvas, minLat, maxLat, minLon, maxLon);
    const texture = new THREE.CanvasTexture(clippedCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, [points, dataType]);

  // Main Persistent WebGL Scene Initialization (Mounts ONCE to prevent canvas teardowns & glitches)
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. Scene setup with modern crisp studio background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1329'); // Deep midnight space canvas
    scene.fog = new THREE.FogExp2('#0b1329', 0.02);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, -11.5, 14.5);
    cameraRef.current = camera;
    targetCameraPos.current.set(0, -11.5, 14.5);
    targetLookAt.current.set(0, 0, 0);

    // 3. WebGL Renderer with High-DPI and soft shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 4. OrbitControls with smooth inertia
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5.5;
    controls.maxDistance = 28;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent dipping below plate
    controls.autoRotate = false; // Auto-rotation off by default
    controls.autoRotateSpeed = 0.75;
    controlsRef.current = controls;

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 5. Oceanic Basin Base Plate (Arabian Sea, Bay of Bengal, Indian Ocean)
    const oceanGroup = new THREE.Group();
    rootGroup.add(oceanGroup);

    const oceanGeo = new THREE.CylinderGeometry(14.5, 14.5, 0.25, 64);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#060e1e'),
      roughness: 0.35,
      metalness: 0.3,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = Math.PI / 2;
    oceanMesh.position.z = -0.15;
    oceanMesh.receiveShadow = true;
    oceanGroup.add(oceanMesh);

    // Coordinate grid rings and bathymetric range lines
    for (let r = 4; r <= 13; r += 3) {
      const ringGeo = new THREE.RingGeometry(r - 0.015, r + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#0284c7'),
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.z = 0.02;
      oceanGroup.add(ringMesh);
    }

    // Water body floating text markers
    WATER_BODIES.forEach(wb => {
      const p = project(wb.pos[0], wb.pos[1]);
      const sprite = createTextSprite(wb.name, '#38bdf8', 18, 0.5);
      sprite.position.set(p.x, p.y, 0.08);
      oceanGroup.add(sprite);
    });

    // 6. Surrounding Neighboring Countries (Pakistan, Nepal, Bangladesh, Sri Lanka, Myanmar, Bhutan)
    const surroundingsGroup = new THREE.Group();
    surroundingsGroupRef.current = surroundingsGroup;
    rootGroup.add(surroundingsGroup);

    const surroundMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      roughness: 0.75,
      metalness: 0.15,
      transparent: true,
      opacity: 0.9,
    });
    const surroundLineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#475569'),
      transparent: true,
      opacity: 0.5,
    });

    SURROUNDING_COUNTRIES.forEach(country => {
      const shape = new THREE.Shape();
      country.coordinates.forEach(([lon, lat], i) => {
        const p = project(lon, lat);
        if (i === 0) shape.moveTo(p.x, p.y);
        else shape.lineTo(p.x, p.y);
      });
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.12,
        bevelEnabled: false,
      });
      const mesh = new THREE.Mesh(geom, surroundMaterial);
      mesh.receiveShadow = true;
      surroundingsGroup.add(mesh);

      // Boundary outline
      const edges = new THREE.EdgesGeometry(geom);
      const lines = new THREE.LineSegments(edges, surroundLineMaterial);
      surroundingsGroup.add(lines);

      // Floating country label
      const lp = project(country.labelPos[0], country.labelPos[1]);
      const label = createTextSprite(country.name, '#94a3b8', 16, 0.7);
      label.position.set(lp.x, lp.y, 0.25);
      surroundingsGroup.add(label);
    });

    // 7. Elevated 3D India Landmass Geometry (Generated from official INDIA_GEOJSON)
    const indiaGroup = new THREE.Group();
    rootGroup.add(indiaGroup);

    const indiaShapes: THREE.Shape[] = [];
    const coordinates = INDIA_GEOJSON.features[0].geometry.coordinates as [number, number][][][];

    coordinates.forEach(poly => {
      const ring = poly[0];
      if (ring.length < 3) return;
      const s = new THREE.Shape();
      ring.forEach(([lon, lat], idx) => {
        const p = project(lon, lat);
        if (idx === 0) s.moveTo(p.x, p.y);
        else s.lineTo(p.x, p.y);
      });
      s.closePath();
      indiaShapes.push(s);
    });

    const indiaExtrudeDepth = 0.35;
    const indiaGeometry = new THREE.ExtrudeGeometry(indiaShapes, {
      depth: indiaExtrudeDepth,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 2,
    });

    // Map UV coordinates matching India bounding box [67.0..99.0, 5.0..38.5]
    const minLon = 67.0;
    const maxLon = 99.0;
    const minLat = 5.0;
    const maxLat = 38.5;

    const minX = (minLon - CENTER_LON) * MAP_SCALE;
    const maxX = (maxLon - CENTER_LON) * MAP_SCALE;
    const minY = (minLat - CENTER_LAT) * MAP_SCALE;
    const maxY = (maxLat - CENTER_LAT) * MAP_SCALE;

    const posAttr = indiaGeometry.attributes.position;
    const uvAttr = indiaGeometry.attributes.uv;

    for (let i = 0; i < uvAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const u = Math.max(0, Math.min(1, (x - minX) / (maxX - minX)));
      const v = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
      uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;

    // Top surface material with dynamic live heatmap texture
    const topMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      map: heatmapTexture,
      emissive: heatmapTexture ? new THREE.Color('#ffffff') : new THREE.Color('#000000'),
      emissiveMap: heatmapTexture,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.12,
      transparent: true,
      opacity: 0.95,
    });
    topMaterialRef.current = topMaterial;

    const sideMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      roughness: 0.65,
      metalness: 0.25,
    });

    const indiaMesh = new THREE.Mesh(indiaGeometry, [topMaterial, sideMaterial]);
    indiaMesh.receiveShadow = true;
    indiaMesh.castShadow = true;
    indiaGroup.add(indiaMesh);

    // Glowing cyan/sky-blue border outline tracing India's official boundaries
    const indiaEdges = new THREE.EdgesGeometry(indiaGeometry, 35);
    const borderOutlineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      transparent: true,
      opacity: 0.75,
    });
    const borderOutline = new THREE.LineSegments(indiaEdges, borderOutlineMat);
    indiaGroup.add(borderOutline);

    // 8. Refined Architectural 3D Telemetry Data Pillars Group
    const pillarsGroup = new THREE.Group();
    pillarsGroupRef.current = pillarsGroup;
    rootGroup.add(pillarsGroup);

    // 9. CONTINUOUS 3D ATMOSPHERIC WIND FLOW SYSTEM (Luminous Glowing Multi-Node Flow Streamlines)
    const windGroup = new THREE.Group();
    windGroupRef.current = windGroup;
    rootGroup.add(windGroup);

    const STREAMLINE_COUNT = 320;
    const NODES_PER_STREAMLINE = 4; // Head + 3 fading tail nodes = 1280 flowing points
    const TOTAL_POINTS = STREAMLINE_COUNT * NODES_PER_STREAMLINE;

    // Helper to calculate realistic meteorological synoptic wind vector across India
    const getWindVector = (x: number, y: number) => {
      const lon = CENTER_LON + x / MAP_SCALE;
      const lat = CENTER_LAT + y / MAP_SCALE;
      let dirDeg = 305;
      let spd = 0.022;

      if (lat < 18) {
        dirDeg = 265 + (lon - 76) * 1.5;
        spd = 0.028;
      } else if (lat >= 18 && lat <= 28) {
        dirDeg = 310 - (lat - 18) * 1.8 + (lon - 78) * 1.1;
        spd = 0.024 + Math.sin(lat * 0.5) * 0.007;
      } else {
        dirDeg = 295;
        spd = 0.020;
      }
      return { spd, dirRad: (dirDeg * Math.PI) / 180 };
    };

    // Initialize streamline particle states
    const streamlines: {
      x: number;
      y: number;
      z: number;
      speed: number;
      age: number;
      maxAge: number;
      trail: THREE.Vector3[];
    }[] = [];

    const spawnStreamlineState = (initial = false) => {
      // Spawn inside India's land bounding box
      let sx = 0;
      let sy = 0;
      let found = false;
      for (let attempt = 0; attempt < 25; attempt++) {
        const testLon = 68.5 + Math.random() * 28.5;
        const testLat = 8.0 + Math.random() * 28.5;
        if (isPointInIndia(testLon, testLat)) {
          sx = (testLon - CENTER_LON) * MAP_SCALE;
          sy = (testLat - CENTER_LAT) * MAP_SCALE;
          found = true;
          break;
        }
      }
      if (!found) {
        sx = (Math.random() - 0.5) * 7.5;
        sy = (Math.random() - 0.5) * 7.5;
      }

      const sz = indiaExtrudeDepth + 0.08 + Math.random() * 0.22; // Sweep directly over terrain
      const wind = getWindVector(sx, sy);
      const trail: THREE.Vector3[] = [];
      for (let k = 0; k < NODES_PER_STREAMLINE; k++) {
        trail.push(new THREE.Vector3(sx, sy, sz));
      }

      const maxAge = 80 + Math.floor(Math.random() * 80);
      return {
        x: sx,
        y: sy,
        z: sz,
        speed: wind.spd,
        age: initial ? Math.floor(Math.random() * maxAge) : 0,
        maxAge,
        trail,
      };
    };

    for (let i = 0; i < STREAMLINE_COUNT; i++) {
      streamlines.push(spawnStreamlineState(true));
    }

    // Geometry & Material with radial luminous glow texture
    const windPositions = new Float32Array(TOTAL_POINTS * 3);
    const windColors = new Float32Array(TOTAL_POINTS * 3);
    const windGeometry = new THREE.BufferGeometry();
    windGeometry.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
    windGeometry.setAttribute('color', new THREE.BufferAttribute(windColors, 3));

    const glowTexture = createGlowTexture();
    const windMaterial = new THREE.PointsMaterial({
      map: glowTexture,
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const windPointsMesh = new THREE.Points(windGeometry, windMaterial);
    windGroup.add(windPointsMesh);

    // 10. Studio Lighting (Sun, Sky, and Rim Light)
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#ffffff', 1.8);
    sunLight.position.set(8, 14, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#0284c7', 0.7);
    fillLight.position.set(-10, -10, 10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#fbbf24', 0.35);
    rimLight.position.set(12, -8, 6);
    scene.add(rimLight);

    // 11. Interactive Raycasting & Hover Tooltip
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const pillars = pillarsGroupRef.current ? (pillarsGroupRef.current.children.filter((c: any) => c.userData?.label) as THREE.Mesh[]) : [];
      const intersects = raycaster.intersectObjects(pillars);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const data = hit.userData;

        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 20,
          title: data.label || 'Station Node',
          state: data.state,
          valStr: `${typeof data.value === 'number' ? data.value.toFixed(1) : data.value} ${unit}`,
          category: data.aqiCategory || '',
          color: data.computedColor,
          windStr: data.wind_speed !== undefined ? `${data.wind_speed.toFixed(1)} m/s (${data.wind_direction?.toFixed(0)}°)` : undefined,
          visible: true,
        });

        pillars.forEach(p => {
          if ((p.material as THREE.MeshStandardMaterial).emissiveIntensity) {
            (p.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
          }
        });
        (hit.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
      } else {
        setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev);
        pillars.forEach(p => {
          if ((p.material as THREE.MeshStandardMaterial).emissiveIntensity) {
            (p.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
          }
        });
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousemove', handlePointerMove);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w === 0 || h === 0) continue;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    // 12. Continuous 60FPS WebGL Frame Loop (Persistent & Silky Smooth)
    let animId: number;

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      // Smooth camera position and lookAt interpolation (glides smoothly on view changes)
      if (isTransitioningCamera.current) {
        camera.position.lerp(targetCameraPos.current, 0.06);
        controls.target.lerp(targetLookAt.current, 0.06);
        if (camera.position.distanceTo(targetCameraPos.current) < 0.04) {
          isTransitioningCamera.current = false;
        }
      }

      // OrbitControls update (smooth damping)
      controls.update();

      // CONTINUOUS 3D ATMOSPHERIC WIND STREAMLINE ADVANCEMENT
      const pArr = (windGeometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const cArr = (windGeometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
      let ptIdx = 0;

      for (let i = 0; i < STREAMLINE_COUNT; i++) {
        const sl = streamlines[i];
        sl.age++;

        // Reset smoothly when particle age expires or flows off subcontinental boundary
        if (sl.age > sl.maxAge || sl.x < -6.5 || sl.x > 6.5 || sl.y < -6.5 || sl.y > 6.5) {
          const fresh = spawnStreamlineState(false);
          sl.x = fresh.x;
          sl.y = fresh.y;
          sl.z = fresh.z;
          sl.age = 0;
          sl.maxAge = fresh.maxAge;
          for (let k = 0; k < NODES_PER_STREAMLINE; k++) {
            sl.trail[k].set(sl.x, sl.y, sl.z);
          }
        }

        // Advance head along vector field
        const w = getWindVector(sl.x, sl.y);
        const u = -Math.sin(w.dirRad) * w.spd;
        const v = -Math.cos(w.dirRad) * w.spd;
        sl.x += u;
        sl.y += v;

        // Shift trailing positions
        for (let k = NODES_PER_STREAMLINE - 1; k > 0; k--) {
          sl.trail[k].copy(sl.trail[k - 1]);
        }
        sl.trail[0].set(sl.x, sl.y, sl.z);

        // Sinusoidal fade envelope across lifetime
        const life = Math.sin((sl.age / sl.maxAge) * Math.PI);

        // Write head + 3 trailing nodes to point buffer
        for (let k = 0; k < NODES_PER_STREAMLINE; k++) {
          const node = sl.trail[k];
          const off = ptIdx * 3;
          pArr[off] = node.x;
          pArr[off + 1] = node.y;
          pArr[off + 2] = node.z;

          // Head is radiant cyan, tail nodes taper smoothly
          const tailFade = (1 - k / NODES_PER_STREAMLINE) * life;
          cArr[off] = 0.22 * tailFade;
          cArr[off + 1] = 0.85 * tailFade;
          cArr[off + 2] = 1.0 * tailFade;

          ptIdx++;
        }
      }

      windGeometry.attributes.position.needsUpdate = true;
      windGeometry.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousemove', handlePointerMove);

      if (container.contains(dom)) container.removeChild(dom);

      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });

      renderer.dispose();
    };
  }, [project]);

  // Smooth Heatmap Texture Update without scene teardown
  useEffect(() => {
    if (topMaterialRef.current) {
      topMaterialRef.current.map = showHeatmap && heatmapTexture ? heatmapTexture : null;
      topMaterialRef.current.emissiveMap = showHeatmap && heatmapTexture ? heatmapTexture : null;
      topMaterialRef.current.emissive = showHeatmap && heatmapTexture ? new THREE.Color('#ffffff') : new THREE.Color('#000000');
      topMaterialRef.current.emissiveIntensity = showHeatmap ? 0.35 : 0.0;
      topMaterialRef.current.opacity = showHeatmap ? 0.95 : 0.15;
      topMaterialRef.current.needsUpdate = true;
    }
  }, [heatmapTexture, showHeatmap]);

  // Smooth Visibility Layer Toggles
  useEffect(() => {
    if (pillarsGroupRef.current) pillarsGroupRef.current.visible = showPillars;
  }, [showPillars]);

  useEffect(() => {
    if (windGroupRef.current) windGroupRef.current.visible = showWindFlow;
  }, [showWindFlow]);

  useEffect(() => {
    if (surroundingsGroupRef.current) surroundingsGroupRef.current.visible = showSurroundings;
  }, [showSurroundings]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Smooth Persistent Pillars Update (Updates existing pillar meshes without destroying WebGL scene)
  useEffect(() => {
    const pillarsGroup = pillarsGroupRef.current;
    if (!pillarsGroup) return;

    // Clear previous pillars
    while (pillarsGroup.children.length > 0) {
      const obj = pillarsGroup.children[0] as any;
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
      pillarsGroup.remove(obj);
    }

    const indiaExtrudeDepth = 0.35;
    const beaconGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const ringGeo = new THREE.RingGeometry(0.08, 0.15, 24);

    points.forEach((pt) => {
      const p = project(pt.longitude, pt.latitude);
      const color = getPointColor(pt.value, dataType, pt.color);

      // Proportional architectural height (0.18 to 0.95 units)
      let h = 0.3;
      if (dataType === 'aqi') {
        h = Math.min((pt.value / 400) * 0.75 + 0.18, 0.95);
      } else if (dataType === 'fire') {
        h = Math.min((pt.value / 250) * 0.8 + 0.18, 1.0);
      } else {
        h = Math.min((pt.value / 120) * 0.7 + 0.18, 0.9);
      }

      // Sleek Hexagonal Column (Translated so base is at 0, top at h)
      const pillarGeo = new THREE.CylinderGeometry(0.065, 0.05, h, 6);
      pillarGeo.translate(0, h / 2, 0);

      const pillarMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.92,
      });

      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      // Place pillar standing upright in +Z direction
      pillarMesh.position.set(p.x, p.y, indiaExtrudeDepth + 0.02);
      pillarMesh.rotation.x = Math.PI / 2;
      pillarMesh.castShadow = true;

      // Top Beacon Sphere
      const beaconMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 1.2,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(0, h, 0);
      pillarMesh.add(beaconMesh);

      // Ground Base Ring
      const pulseMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const pulseMesh = new THREE.Mesh(ringGeo, pulseMat);
      pulseMesh.position.set(p.x, p.y, indiaExtrudeDepth + 0.025);
      pillarsGroup.add(pulseMesh);

      pillarMesh.userData = {
        ...pt,
        computedColor: color,
        height: h,
        aqiCategory: getAQILabel(pt.value, dataType),
      };

      pillarsGroup.add(pillarMesh);
    });
  }, [points, dataType, project]);

  // Smooth Camera Presets Handler with silky transition
  const setCameraView = (preset: 'perspective' | 'top' | 'horizon') => {
    setCameraPreset(preset);
    isTransitioningCamera.current = true;

    if (preset === 'perspective') {
      targetCameraPos.current.set(0, -11.5, 14.5);
      targetLookAt.current.set(0, 0, 0);
    } else if (preset === 'top') {
      targetCameraPos.current.set(0, 0.1, 19.5);
      targetLookAt.current.set(0, 0, 0);
    } else if (preset === 'horizon') {
      targetCameraPos.current.set(0, -14.5, 5.5);
      targetLookAt.current.set(0, 1.2, 0.4);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[540px] select-none bg-slate-950 font-sans rounded-xl overflow-hidden border border-slate-800 shadow-xl isolate">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Top Left: Sleek WebGL HUD Badge */}
      <div className="absolute top-4 left-4 glass-card p-2.5 rounded-xl pointer-events-auto border border-slate-700/60 bg-slate-900/80 backdrop-blur-md shadow-lg flex flex-col gap-1 z-10 max-w-[260px]">
        <div className="text-xs text-white font-heading font-bold tracking-tight flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          WEBGL 3D ATMOSPHERIC ENGINE
        </div>
        <div className="text-[10px] text-slate-400">
          Continuous Streamlines • Masked Telemetry Plate
        </div>
      </div>

      {/* Top Right: Camera Presets & Layer Toggles (Positioned neatly at top-16 right-4) */}
      <div className="absolute top-16 right-4 flex flex-col items-end gap-1.5 z-20 pointer-events-auto">
        {/* Camera Angle Presets */}
        <div className="glass-card p-1 rounded-xl border border-slate-700/60 bg-slate-900/85 backdrop-blur-md flex items-center gap-1 shadow-md">
          <button
            onClick={() => setCameraView('perspective')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-heading font-semibold transition-all duration-200 ${
              cameraPreset === 'perspective'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="3D Dynamic Perspective"
          >
            🧭 3D Orbit
          </button>
          <button
            onClick={() => setCameraView('top')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-heading font-semibold transition-all duration-200 ${
              cameraPreset === 'top'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Top-Down Bird's Eye GIS View"
          >
            🛰️ Top-Down
          </button>
          <button
            onClick={() => setCameraView('horizon')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-heading font-semibold transition-all duration-200 ${
              cameraPreset === 'horizon'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Cinematic Horizon View"
          >
            📐 Horizon
          </button>
        </div>

        {/* Feature Layer Toggles (Auto-rotate defaults to OFF) */}
        <div className="glass-card p-1 rounded-xl border border-slate-700/60 bg-slate-900/85 backdrop-blur-md flex items-center gap-1 shadow-md">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-heading font-bold uppercase transition-all duration-200 ${
              showHeatmap
                ? 'bg-emerald-600 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle India Heatmap Texture"
          >
            🔥 Heatmap {showHeatmap ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowPillars(!showPillars)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-heading font-bold uppercase transition-all duration-200 ${
              showPillars
                ? 'bg-amber-600 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle 3D Data Pillars"
          >
            🏛️ Pillars {showPillars ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowWindFlow(!showWindFlow)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-heading font-bold uppercase transition-all duration-200 ${
              showWindFlow
                ? 'bg-cyan-600 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Atmospheric 3D Breeze Streamlines"
          >
            🌬️ Flow {showWindFlow ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowSurroundings(!showSurroundings)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-heading font-bold uppercase transition-all duration-200 ${
              showSurroundings
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Neighboring Countries & Oceans"
          >
            🗺️ Regions {showSurroundings ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-heading font-bold uppercase transition-all duration-200 ${
              autoRotate
                ? 'bg-purple-600 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Auto Orbit Rotation"
          >
            🔄 {autoRotate ? 'Orbiting' : 'Orbit Off'}
          </button>
        </div>
      </div>

      {/* Floating Raycast Telemetry Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75 ease-out glass-card px-3.5 py-2.5 rounded-xl shadow-2xl text-xs border border-slate-700 bg-slate-900/95 backdrop-blur-md min-w-[160px]"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-heading font-bold text-white text-sm">
            {tooltip.title}
          </div>
          {tooltip.state && (
            <div className="text-[10px] text-slate-400 font-medium">
              {tooltip.state}
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-slate-800 pt-1.5">
            <span className="text-[10px] uppercase text-slate-400 font-semibold">{variableName}:</span>
            <span className="font-mono font-bold text-sm" style={{ color: tooltip.color }}>
              {tooltip.valStr}
            </span>
          </div>
          {tooltip.category && (
            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: tooltip.color }}>
              {tooltip.category}
            </div>
          )}
          {tooltip.windStr && (
            <div className="mt-1 text-[10px] text-slate-400">
              Wind: <span className="font-mono text-slate-200">{tooltip.windStr}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar: Telemetry Stats & Navigation Help */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-slate-400 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <span className="glass-card px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/70 font-mono">
            {points.length} Live Spatial Telemetry Nodes
          </span>
          <span className="hidden sm:inline-block glass-card px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/70 font-mono">
            Projection: EPSG:4326 Subcontinental Plate
          </span>
        </div>
        <div className="glass-card px-3 py-1 rounded-lg border border-slate-800 bg-slate-900/70 text-[10px] text-slate-300">
          Left Click: Rotate • Right Click: Pan • Scroll: Zoom
        </div>
      </div>
    </div>
  );
};

export default IndiaMap3D;