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
  unit
}) => {
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
    <div className="w-full h-full relative group">
      {/* 2D / 3D Toggle Controller */}
      <div className="absolute top-4 left-4 z-[999] glass-card p-1 rounded-lg border border-slate-200 flex gap-1 shadow-lg pointer-events-auto transition-opacity duration-300 opacity-90 hover:opacity-100">
        <button
          onClick={() => setMapMode('2D')}
          className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 ${
            mapMode === '2D'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          2D Map
        </button>
        <button
          onClick={() => setMapMode('3D')}
          className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 ${
            mapMode === '3D'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          3D Map
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
