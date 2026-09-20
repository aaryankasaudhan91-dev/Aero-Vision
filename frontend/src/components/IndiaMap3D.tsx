import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface MapPoint {
  latitude: number;
  longitude: number;
  value: number;
  label: string;
  state?: string;
  color?: string;
}

interface IndiaMap3DProps {
  points: MapPoint[];
  dataType: 'aqi' | 'hcho' | 'fire' | 'pollutant';
  pollutantName?: string;
}

const INDIA_OUTLINE: [number, number][] = [
  [74.0, 34.5], [77.0, 35.5], [78.5, 35.0], [79.0, 33.0], [78.0, 32.0],
  [80.0, 31.0], [81.0, 30.0], [81.5, 29.5], [84.0, 27.5], [88.0, 27.5],
  [88.5, 28.0], [92.0, 28.0], [96.0, 29.0], [97.2, 28.0], [96.0, 26.0],
  [94.0, 25.0], [92.0, 24.0], [92.2, 22.0], [90.0, 22.0], [89.0, 22.5],
  [88.0, 21.6], [87.0, 21.5], [86.0, 20.0], [84.0, 19.0], [80.2, 16.0],
  [80.0, 13.0], [79.8, 10.0], [77.5, 8.0], [76.5, 9.8], [75.0, 12.0],
  [74.0, 15.0], [73.0, 18.0], [72.8, 20.0], [72.0, 21.5], [68.5, 23.5],
  [70.0, 24.5], [71.5, 24.5], [71.0, 26.0], [74.0, 28.5], [74.5, 31.0],
  [74.0, 34.5]
];

const CENTER_LON = 80.0;
const CENTER_LAT = 22.0;
const MAP_SCALE = 0.5;

export const IndiaMap3D: React.FC<IndiaMap3DProps> = ({ points, dataType }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; visible: boolean }>({
    x: 0,
    y: 0,
    content: '',
    visible: false,
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene with clean minimalist light background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    scene.fog = new THREE.FogExp2('#f8fafc', 0.025);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, -9.5, 14);
    camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);

    // Front-facing default isometric rotation
    mapGroup.rotation.x = -Math.PI / 2.75;

    // Projection mapping
    const project = (lon: number, lat: number) => new THREE.Vector2(
      (lon - CENTER_LON) * MAP_SCALE,
      (lat - CENTER_LAT) * MAP_SCALE
    );

    // 4. Extruded Subcontinent Geometry
    const shape = new THREE.Shape();
    const firstPt = project(INDIA_OUTLINE[0][0], INDIA_OUTLINE[0][1]);
    shape.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < INDIA_OUTLINE.length; i++) {
      const pt = project(INDIA_OUTLINE[i][0], INDIA_OUTLINE[i][1]);
      shape.lineTo(pt.x, pt.y);
    }

    const extrudeSettings = {
      steps: 1,
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.04,
      bevelSegments: 5,
    };

    const mapGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    mapGeometry.center();

    // Clean porcelain light terrain materials
    const topMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.25,
      metalness: 0.05,
    });

    const sideMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2e8f0'),
      roughness: 0.5,
      metalness: 0.1,
    });

    const baseMesh = new THREE.Mesh(mapGeometry, [topMaterial, sideMaterial]);
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    mapGroup.add(baseMesh);

    // Modern hairline contour lines (aero sky-blue)
    const edgesGeometry = new THREE.EdgesGeometry(mapGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#0284c7'),
      transparent: true,
      opacity: 0.4,
    });
    const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);
    mapGroup.add(lineSegments);

    // 5. Dynamic 3D Telemetry Columns (Real Data Points)
    const barGroup = new THREE.Group();
    mapGroup.add(barGroup);

    const targetBarsArray: THREE.Mesh[] = [];
    const radius = 0.09;
    const beaconGeometry = new THREE.SphereGeometry(radius * 1.5, 16, 16);

    points.forEach((pt) => {
      const p = project(pt.longitude, pt.latitude);
      let normalizedHeight = 0.5;
      let barColor = pt.color || '#0d9488';

      if (!pt.color) {
        if (dataType === 'aqi') {
          normalizedHeight = Math.min((pt.value / 400) * 3.2 + 0.2, 3.8);
          if (pt.value > 300) barColor = '#7c3aed';       // Severe (Purple)
          else if (pt.value > 200) barColor = '#e11d48';  // Very Poor (Rose)
          else if (pt.value > 100) barColor = '#ea580c';  // Poor (Orange)
          else if (pt.value > 50) barColor = '#d97706';   // Moderate (Amber)
          else barColor = '#0d9488';                      // Good (Teal)
        } else if (dataType === 'hcho') {
          normalizedHeight = Math.min((pt.value / 25) * 3 + 0.2, 3.6);
          barColor = pt.value > 15 ? '#db2777' : '#0284c7';
        } else if (dataType === 'fire') {
          normalizedHeight = Math.min((pt.value / 300) * 3.5 + 0.2, 4);
          barColor = pt.value > 150 ? '#dc2626' : '#f97316';
        } else {
          normalizedHeight = Math.min((pt.value / 150) * 3 + 0.2, 3.5);
          barColor = pt.value > 75 ? '#ea580c' : '#0284c7';
        }
      } else {
        normalizedHeight = Math.min((pt.value / 150) * 3 + 0.2, 3.5);
      }

      // 3D Cylinder data pillar
      const barGeometry = new THREE.CylinderGeometry(radius, radius * 0.8, normalizedHeight, 16);
      barGeometry.translate(0, normalizedHeight / 2, 0);

      const barMaterial = new THREE.MeshStandardMaterial({
        color: barColor,
        roughness: 0.15,
        metalness: 0.2,
        emissive: barColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.92,
      });

      const barMesh = new THREE.Mesh(barGeometry, barMaterial);
      barMesh.position.set(p.x, p.y, extrudeSettings.depth / 2 + 0.05);
      barMesh.rotation.x = Math.PI / 2;
      barMesh.castShadow = true;

      // Glowing top beacon
      const beaconMaterial = new THREE.MeshStandardMaterial({
        color: barColor,
        emissive: barColor,
        emissiveIntensity: 0.9,
      });
      const beaconMesh = new THREE.Mesh(beaconGeometry, beaconMaterial);
      beaconMesh.position.set(0, normalizedHeight, 0);
      barMesh.add(beaconMesh);

      barMesh.userData = { ...pt, color: barColor };
      barGroup.add(barMesh);
      targetBarsArray.push(barMesh);
    });

    // 6. Atmospheric Breeze Flow Particle System (3D Animation)
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Scatter within India bounding box roughly
      particlePos[i * 3] = (Math.random() - 0.5) * 11;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 11;
      particlePos[i * 3 + 2] = extrudeSettings.depth / 2 + 0.4 + Math.random() * 1.8;
      particleSpeeds[i] = 0.015 + Math.random() * 0.025;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: new THREE.Color('#0284c7'),
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      blending: THREE.NormalBlending,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    mapGroup.add(particleSystem);

    // 7. Lighting for Pristine Clean Light Atmosphere
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#ffffff', 1.6);
    sunLight.position.set(6, 12, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#e0f2fe', 0.7);
    fillLight.position.set(-8, -8, 8);
    scene.add(fillLight);

    // 8. Interaction State
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const rotationTarget = { x: -Math.PI / 2.75, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const intersects = raycaster.intersectObjects(targetBarsArray);

      if (intersects.length > 0) {
        const hoveredObj = intersects[0].object as THREE.Mesh;
        const data = hoveredObj.userData;
        if (data) {
          const unit =
            dataType === 'aqi'
              ? 'AQI'
              : dataType === 'hcho'
              ? '10¹⁵ molec/cm²'
              : dataType === 'fire'
              ? 'FRP (MW)'
              : 'µg/m³';

          setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 20,
            content: `<div class="font-heading font-semibold text-slate-900">${data.label}</div>${
              data.state ? `<div class="text-[10px] text-slate-500">${data.state}</div>` : ''
            }<div class="mt-1 font-mono font-bold" style="color: ${data.color}">${dataType.toUpperCase()}: ${data.value} ${unit}</div>`,
            visible: true,
          });

          targetBarsArray.forEach((b) => ((b.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3));
          (hoveredObj.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3;
        }
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        targetBarsArray.forEach((b) => ((b.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5));
      }

      if (!isDragging) return;

      const deltaMove = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
      rotationTarget.y += deltaMove.x * 0.006;
      rotationTarget.x = Math.max(-Math.PI / 1.7, Math.min(-0.25, rotationTarget.x + deltaMove.y * 0.006));
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(7, Math.min(camera.position.z + e.deltaY * 0.015, 22));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    dom.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    // 9. Frame Loop with Smooth Damping & Particle Animation
    let animId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      clock.getDelta();

      // Gentle auto-rotation when user is not dragging
      if (autoRotate && !isDragging) {
        rotationTarget.y += 0.0015;
      }

      // Interpolate rotation
      mapGroup.rotation.x += (rotationTarget.x - mapGroup.rotation.x) * 0.12;
      mapGroup.rotation.y += (rotationTarget.y - mapGroup.rotation.y) * 0.12;

      // Animate atmospheric particles drifting across India
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3] += particleSpeeds[i];
        // Reset when particle drifts off eastern border
        if (posArr[i * 3] > 6) {
          posArr[i * 3] = -6;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', handleMouseDown);
      dom.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);

      if (container.contains(dom)) container.removeChild(dom);

      scene.traverse((object: any) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((m: any) => m.dispose());
          else object.material.dispose();
        }
      });

      renderer.dispose();
    };
  }, [points, dataType, autoRotate]);

  return (
    <div className="relative w-full h-full min-h-[520px] select-none bg-slate-50 font-sans rounded-xl overflow-hidden border border-slate-200/80 shadow-xs">
      <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Top Left: Sleek Clean Light HUD Badge */}
      <div className="absolute top-4 left-4 glass-panel p-3 rounded-xl pointer-events-auto border border-slate-200/80 shadow-sm flex flex-col gap-1 z-10">
        <div className="text-xs text-slate-900 font-heading font-bold tracking-tight flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          3D CARTOGRAPHIC TELEMETRY
        </div>
        <p className="text-[11px] text-slate-500">Drag to orbit • Scroll to zoom • Hover pins for details</p>
      </div>

      {/* Top Right: Orbit & Rotation Controls (Positioned under 2D/3D selector) */}
      <div className="absolute top-16 right-4 flex items-center gap-1.5 z-10">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all shadow-xs border ${
            autoRotate
              ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Toggle Auto-Rotation"
        >
          {autoRotate ? '🔄 Auto Orbiting' : '⏸ Orbit Paused'}
        </button>
      </div>

      {/* Empty State */}
      {points.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs z-10 p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 text-xl mb-3 shadow-xs border border-sky-100">
            🛰️
          </div>
          <h4 className="text-sm font-semibold text-slate-800">No Spatial Observations Found</h4>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            No telemetry was registered for this date/region. Try choosing another date or selecting 'All India'.
          </p>
        </div>
      )}

      {/* Hover Station Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75 ease-out glass-panel px-3 py-2 rounded-lg shadow-xl text-xs border border-slate-200"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}

      {/* Bottom Bar: Live Telemetry Indicator */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-500 pointer-events-none z-10">
        <span className="glass-panel px-2.5 py-1 rounded-md border border-slate-200/80 font-mono">
          Extrusion Scale: 0.1° × 0.1° Grid
        </span>
        <span className="glass-panel px-2.5 py-1 rounded-md border border-slate-200/80 font-mono">
          Points Rendered: {points.length} Live Nodes
        </span>
      </div>
    </div>
  );
};

export default IndiaMap3D;