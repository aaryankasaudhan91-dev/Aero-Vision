import React, { useEffect, useState } from 'react';
import IndiaMap3D from './IndiaMap3D';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { transportApi } from '../services/api';
import FilterBar from './FilterBar';

export const TransportDashboard: React.FC = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-06-22');
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    avg_speed: 0,
    wind_dir: 0,
    dist_km: 0,
    primary_source: 'N/A',
  });
  const [windVectors, setWindVectors] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [attribution, setAttribution] = useState<any[]>([]);

  const getWindDirectionLabel = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((deg % 360) / 45)) % 8;
    return directions[idx];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Overview Metrics
      const overviewRes = await transportApi.getOverview({
        date: selectedDate,
        source_region: selectedState || undefined,
      });
      if (overviewRes.data && overviewRes.data.length > 0) {
        const item = overviewRes.data[0];
        setMetrics({
          avg_speed: item.wind_speed || 0,
          wind_dir: item.wind_direction || 0,
          dist_km: item.transport_distance_km || 0,
          primary_source: item.source_region || 'N/A',
        });
      }

      // 2. Get Wind Vectors for Map
      const vectorsRes = await transportApi.getWindVectors({
        date: selectedDate,
      });
      setWindVectors(vectorsRes.data || []);

      // Mock or fetch source attribution for bar chart
      const attributionRes = await transportApi.getSourceAttribution({
        receptor_lat: 28.6139,
        receptor_lon: 77.2090,
        date: selectedDate,
      });
      setAttribution(attributionRes.data || []);

    } catch (err) {
      console.error("Error fetching transport data:", err);
      setMetrics({
        avg_speed: 0,
        wind_dir: 0,
        dist_km: 0,
        primary_source: 'N/A',
      });
      setWindVectors([]);
      setRadarData([]);
      setAttribution([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedDate]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Wind-Based Pollutant Transport
          {loading && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
        </h2>
        <p className="text-slate-400 text-sm">
          Meteorological integration using 850hPa pressure level wind fields to trace pathways.
        </p>
      </div>

      <FilterBar
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onRefresh={fetchData}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Mean Wind Speed</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-white">{metrics.avg_speed.toFixed(1)}</span>
            <span className="text-xs text-slate-500 ml-1">m/s (at 850 hPa)</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Wind Direction</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-500">{metrics.wind_dir}°</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300">
              {getWindDirectionLabel(metrics.wind_dir)}
            </span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">24-hr Transport Distance</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-purple-400">
              {metrics.dist_km.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 ml-1">km / day</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Primary Source Sector</span>
          <div className="mt-2">
            <span className="text-lg font-bold text-blue-400 truncate block">
              {metrics.primary_source}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Upwind contribution zone</span>
          </div>
        </div>
      </div>

      {/* Map & Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial Map with Trajectory Polylines */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Lagrangian Back-Trajectories</h3>
            <span className="text-xs text-slate-500">24-hour Backward Path</span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative">
            <IndiaMap3D
              points={[
                { latitude: 28.6139, longitude: 77.2090, value: 30, label: 'Receptor: Delhi NCR', state: 'Delhi' },
                ...windVectors.map((vec: any, idx: number) => {
                  const startLat = vec.start?.[0] || 0;
                  const startLon = vec.start?.[1] || 0;
                  return {
                    latitude: startLat,
                    longitude: startLon,
                    value: vec.speed || 10,
                    label: `Wind Vector Source Point ${idx + 1}`,
                    state: 'Trajectory Source',
                  };
                }).filter((p: any) => p.latitude !== 0)
              ]}
              dataType="fire"
            />
          </div>
        </div>

        {/* Source Contribution */}
        <div className="glass-card p-5 rounded-2xl h-[500px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Source Sector Attribution</h3>
            <div className="h-[200px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} unit="%" />
                  <YAxis dataKey="region" type="category" stroke="#64748b" fontSize={9} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="percentage" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Wind Rose Frequency</h3>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={8} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={8} />
                    <Radar name="Wind Frequency" dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TransportDashboard;
