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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');
    scene.fog = new THREE.FogExp2('#030712', 0.02);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, -9.5, 13.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);

    // Front-facing default isometric rotation matrix
    mapGroup.rotation.x = -Math.PI / 2.8;

    const shape = new THREE.Shape();
    const project = (lon: number, lat: number) => new THREE.Vector2(
      (lon - CENTER_LON) * MAP_SCALE,
      (lat - CENTER_LAT) * MAP_SCALE
    );

    const firstPt = project(INDIA_OUTLINE[0][0], INDIA_OUTLINE[0][1]);
    shape.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < INDIA_OUTLINE.length; i++) {
      const pt = project(INDIA_OUTLINE[i][0], INDIA_OUTLINE[i][1]);
      shape.lineTo(pt.x, pt.y);
    }

    const extrudeSettings = {
      steps: 1,
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.02,
      bevelSegments: 4,
    };

    const mapGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    mapGeometry.center();

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      roughness: 0.2,
      metalness: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    const topMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.35,
      metalness: 0.1,
    });

    const baseMesh = new THREE.Mesh(mapGeometry, [topMaterial, baseMaterial]);
    baseMesh.receiveShadow = true;
    mapGroup.add(baseMesh);

    const edgesGeometry = new THREE.EdgesGeometry(mapGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: '#38bdf8', linewidth: 1.5 });
    const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);
    mapGroup.add(lineSegments);

    const barGroup = new THREE.Group();
    mapGroup.add(barGroup);

    const targetBarsArray: THREE.Mesh[] = [];
    const radius = 0.08;
    const sphereGeometry = new THREE.SphereGeometry(radius * 1.4, 12, 12);

    points.forEach((pt) => {
      const p = project(pt.longitude, pt.latitude);
      let normalizedHeight = 0.5;
      let barColor = '#10b981';

      if (dataType === 'aqi') {
        normalizedHeight = Math.min((pt.value / 400) * 3, 3.5);
        if (pt.value > 300) barColor = '#a855f7';
        else if (pt.value > 200) barColor = '#ef4444';
        else if (pt.value > 100) barColor = '#f97316';
        else if (pt.value > 50) barColor = '#eab308';
      } else if (dataType === 'hcho') {
        normalizedHeight = Math.min((pt.value / 25) * 3, 3.5);
        barColor = pt.value > 15 ? '#ec4899' : '#6366f1';
      } else if (dataType === 'fire') {
        normalizedHeight = Math.min((pt.value / 300) * 3.5, 4);
        barColor = pt.value > 150 ? '#f43f5e' : '#f97316';
      } else {
        normalizedHeight = Math.min((pt.value / 150) * 3, 3.5);
        barColor = pt.value > 75 ? '#ef4444' : '#06b6d4';
      }

      const barGeometry = new THREE.CylinderGeometry(radius, radius, normalizedHeight, 16);
      barGeometry.translate(0, normalizedHeight / 2, 0);

      const barMaterial = new THREE.MeshStandardMaterial({
        color: barColor,
        roughness: 0.1,
        metalness: 0.1,
        emissive: barColor,
        emissiveIntensity: 0.4,
      });

      const barMesh = new THREE.Mesh(barGeometry, barMaterial);
      barMesh.position.set(p.x, p.y, extrudeSettings.depth / 2);
      barMesh.rotation.x = Math.PI / 2;
      barMesh.castShadow = true;

      const glowMaterial = new THREE.MeshBasicMaterial({ color: barColor });
      const glowMesh = new THREE.Mesh(sphereGeometry, glowMaterial);
      glowMesh.position.set(0, normalizedHeight, 0);
      barMesh.add(glowMesh);

      barMesh.userData = { ...pt, color: barColor };
      barGroup.add(barMesh);
      targetBarsArray.push(barMesh);
    });

    // Lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#ffffff', 1.5);
    mainLight.position.set(2, 6, 15);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.5);
    rimLight.position.set(-8, -6, 2);
    scene.add(rimLight);

    // Interaction state variables
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const rotationTarget = { x: -Math.PI / 2.8, y: 0 };

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
          const unit = dataType === 'aqi' ? 'AQI' : dataType === 'hcho' ? '10¹⁵ molec/cm²' : dataType === 'fire' ? 'FRP (MW)' : 'µg/m³';
          setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 25,
            content: `<strong>${data.label}</strong> ${data.state ? `(${data.state})` : ''}<br/><span style="color:${data.color}; font-weight:bold">${dataType.toUpperCase()}: ${data.value} ${unit}</span>`,
            visible: true,
          });
          targetBarsArray.forEach(b => ((b.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25));
          (hoveredObj.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1;
        }
      } else {
        setTooltip(prev => (prev.visible ? { ...prev, visible: false } : prev));
        targetBarsArray.forEach(b => ((b.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4));
      }

      if (!isDragging) return;

      const deltaMove = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
      rotationTarget.y += deltaMove.x * 0.005;
      rotationTarget.x = Math.max(-Math.PI / 1.8, Math.min(-0.2, rotationTarget.x + deltaMove.y * 0.005));
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { isDragging = false; };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(6, Math.min(camera.position.z + e.deltaY * 0.015, 20));
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

    // Completely Stable Frame Loop
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      // Interpolate for soft, fluid responses during user interactions
      mapGroup.rotation.x += (rotationTarget.x - mapGroup.rotation.x) * 0.15;
      mapGroup.rotation.y += (rotationTarget.y - mapGroup.rotation.y) * 0.15;

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

      mapGeometry.dispose();
      baseMaterial.dispose();
      topMaterial.dispose();
      edgesGeometry.dispose();
      lineMaterial.dispose();
      sphereGeometry.dispose();

      targetBarsArray.forEach((bar) => {
        bar.geometry.dispose();
        (bar.material as THREE.Material).dispose();
        bar.children.forEach((c) => {
          (c as THREE.Mesh).geometry.dispose();
          ((c as THREE.Mesh).material as THREE.Material).dispose();
        });
      });
      renderer.dispose();
    };
  }, [points, dataType]);

  return (
    <div className="relative w-full h-full min-h-[500px] select-none bg-gray-950 font-sans">
      <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div className="absolute top-4 left-4 backdrop-blur-md bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl pointer-events-none shadow-2xl">
        <div className="text-xs text-white font-semibold tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          INDIA 3D OVERLAY
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Drag map to pivot view • Scroll to zoom</p>
      </div>

      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75 ease-out backdrop-blur-xl bg-slate-950/90 border border-slate-700/60 px-3 py-2.5 rounded-lg shadow-2xl text-[11px] text-slate-200"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

export default IndiaMap3D;