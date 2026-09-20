import React, { useState } from 'react';
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
  variableName?: string; // for weather
  unit?: string;         // for weather
}

export const IndiaMap: React.FC<IndiaMapProps> = ({
  points,
  dataType,
  pollutantName,
  variableName,
  unit,
}) => {
  // Priority set to 2D Planar GIS Map by default, with 3D Orbit accessible via toggle
  const [mapMode, setMapMode] = useState<'2D' | '3D'>('2D');

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

  return (
    <div className="w-full h-full relative group isolate z-0 rounded-xl overflow-hidden">
      {/* 2D / 3D Toggle Controller (2D GIS Priority Default) */}
      <div className="absolute top-4 right-4 z-20 glass-panel p-1 rounded-xl border border-slate-200/90 flex gap-1 shadow-sm pointer-events-auto">
        <button
          onClick={() => setMapMode('2D')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 ${
            mapMode === '2D'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
          aria-label="Switch to 2D Planar GIS Map (Priority Default)"
        >
          <span>🗺️</span>
          <span>2D GIS</span>
        </button>
        <button
          onClick={() => setMapMode('3D')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 ${
            mapMode === '3D'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
          aria-label="Switch to 3D Extruded Orbit Map"
        >
          <span>🌐</span>
          <span>3D Orbit</span>
        </button>
      </div>

      {mapMode === '3D' ? (
        <IndiaMap3D points={points} dataType={dataType} />
      ) : (
        <IndiaMap2D
          points={points}
          dataType={dataType}
          variableName={resolvedVariableName}
          unit={resolvedUnit}
        />
      )}
    </div>
  );
};

export default IndiaMap;
