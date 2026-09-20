import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import IndiaMap3D from './IndiaMap3D';
import IndiaMap2D from './IndiaMap2D';

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

interface IndiaMapProps {
  points: MapPoint[];
  dataType: 'aqi' | 'hcho' | 'fire' | 'pollutant';
  pollutantName?: string;
  variableName?: string;
  unit?: string;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({
  points,
  dataType,
  pollutantName,
  variableName,
  unit,
}) => {
  const [mapMode, setMapMode] = useState<'2D' | '3D'>('2D');
  const [isEnlarged, setIsEnlarged] = useState<boolean>(false);

  // Map variableName and unit based on dataType if not explicitly provided
  const resolvedVariableName = variableName || (
    dataType === 'aqi' ? 'AQI' :
    dataType === 'hcho' ? 'HCHO Column' :
    dataType === 'fire' ? 'Fire Intensity (FRP)' :
    pollutantName || 'Pollutant Value'
  );
  
  const resolvedUnit = unit || (
    dataType === 'aqi' ? '' :
    dataType === 'hcho' ? '× 10⁻⁵ mol/m²' :
    dataType === 'fire' ? 'MW' :
    ''
  );

  // Toggle true edge-to-edge full screen covering everything
  const toggleEnlarge = useCallback(() => {
    if (!isEnlarged) {
      setIsEnlarged(true);
      document.body.style.overflow = 'hidden';
      // Attempt browser native fullscreen for complete edge-to-edge display
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          // Handled via CSS fullscreen portal
        });
      }
    } else {
      setIsEnlarged(false);
      document.body.style.overflow = '';
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isEnlarged]);

  // Sync state if user exits via browser ESC or F11
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isEnlarged) {
        setIsEnlarged(false);
        document.body.style.overflow = '';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEnlarged) {
        setIsEnlarged(false);
        document.body.style.overflow = '';
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isEnlarged]);

  // Trigger continuous resize event so WebGL & Leaflet adapt instantaneously to full screen
  useEffect(() => {
    const trigger = () => {
      window.dispatchEvent(new Event('resize'));
    };
    trigger();
    const t1 = setTimeout(trigger, 60);
    const t2 = setTimeout(trigger, 220);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mapMode, isEnlarged]);

  // When enlarged: render via React Portal directly into document.body to cover the entire screen
  if (isEnlarged) {
    return (
      <>
        {/* Placeholder in the dashboard card */}
        <div className="w-full h-full relative rounded-xl overflow-hidden bg-slate-900/60 flex items-center justify-center border border-slate-800">
          <div className="text-center p-4">
            <span className="text-3xl animate-bounce inline-block mb-1">🛰️</span>
            <p className="text-xs font-semibold text-white">Full Screen Active</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Map is occupying full display edge-to-edge</p>
            <button
              onClick={toggleEnlarge}
              className="mt-3 text-xs px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-md"
            >
              Exit Full Screen
            </button>
          </div>
        </div>

        {/* Fullscreen Portal into document.body: covers 100vw x 100vh with NO other things visible */}
        {createPortal(
          <div className="fixed inset-0 z-[9999999] w-screen h-screen bg-slate-950 overflow-hidden flex flex-col p-0 m-0 animate-fadeIn">
            {/* Floating Fullscreen Header Controls */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
              {/* 2D / 3D Switcher */}
              <div className="glass-panel p-1 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md flex gap-1 shadow-md">
                <button
                  onClick={() => setMapMode('2D')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 ${
                    mapMode === '2D'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  aria-label="Switch to 2D Planar GIS Map"
                >
                  <span>🗺️</span>
                  <span>2D GIS</span>
                </button>
                <button
                  onClick={() => setMapMode('3D')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 ${
                    mapMode === '3D'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  aria-label="Switch to 3D WebGL Orbit Map"
                >
                  <span>🌐</span>
                  <span>3D WebGL</span>
                </button>
              </div>

              {/* Exit Full Screen Button */}
              <button
                onClick={toggleEnlarge}
                className="glass-panel px-3.5 py-2 rounded-xl border border-rose-500/80 bg-rose-600 hover:bg-rose-500 text-white text-xs font-heading font-semibold transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-rose-950/40"
                title="Exit Full Screen (Esc)"
              >
                <span>⤡</span>
                <span>Exit Full Screen</span>
              </button>
            </div>

            {/* Floating Top-Left Status HUD */}
            <div className="absolute top-4 left-4 z-40 glass-card p-3 rounded-xl pointer-events-auto border border-slate-700/60 bg-slate-900/90 backdrop-blur-md shadow-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-lg">
                🛰️
              </div>
              <div>
                <h1 className="text-sm font-heading font-bold text-white tracking-tight flex items-center gap-2">
                  {resolvedVariableName} Subcontinental Telemetry
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Full Screen Coverage (No other elements) • Press Esc to exit
                </p>
              </div>
            </div>

            {/* Edge-to-Edge Map Body (100% width and height, 0 padding, covering whole screen) */}
            <div className="w-full h-full relative">
              {mapMode === '3D' ? (
                <IndiaMap3D
                  points={points}
                  dataType={dataType}
                  variableName={resolvedVariableName}
                  unit={resolvedUnit}
                />
              ) : (
                <IndiaMap2D
                  points={points}
                  dataType={dataType}
                  variableName={resolvedVariableName}
                  unit={resolvedUnit}
                />
              )}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Normal inline render inside dashboard card
  return (
    <div className="w-full h-full relative group isolate z-0 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
      {/* Floating Header Controls */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2 pointer-events-auto">
        {/* 2D / 3D Switcher */}
        <div className="glass-panel p-1 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex gap-1 shadow-sm">
          <button
            onClick={() => setMapMode('2D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 ${
              mapMode === '2D'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800'
            }`}
            aria-label="Switch to 2D Planar GIS Map"
          >
            <span>🗺️</span>
            <span>2D GIS</span>
          </button>
          <button
            onClick={() => setMapMode('3D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 ${
              mapMode === '3D'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800'
            }`}
            aria-label="Switch to 3D WebGL Orbit Map"
          >
            <span>🌐</span>
            <span>3D WebGL</span>
          </button>
        </div>

        {/* Full Screen Button */}
        <button
          onClick={toggleEnlarge}
          className="glass-panel px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-heading font-semibold transition-all duration-200 flex items-center gap-1.5 shadow-sm text-slate-700 dark:text-slate-200 hover:text-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-800"
          title="Cover Full Screen"
          aria-label="Cover Full Screen"
        >
          <span>⤢</span>
          <span>Full Screen</span>
        </button>
      </div>

      {/* Inline Map Body */}
      <div className="w-full h-full relative transition-all duration-300">
        {mapMode === '3D' ? (
          <IndiaMap3D
            points={points}
            dataType={dataType}
            variableName={resolvedVariableName}
            unit={resolvedUnit}
          />
        ) : (
          <IndiaMap2D
            points={points}
            dataType={dataType}
            variableName={resolvedVariableName}
            unit={resolvedUnit}
          />
        )}
      </div>
    </div>
  );
};

export default IndiaMap;
