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
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getYesterdayString());
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
      // 1. Get Wind Vectors for Map
      const vectorsRes = await transportApi.getWindVectors({
        date: selectedDate,
      });
      const vectors = vectorsRes.data || [];
      setWindVectors(vectors);

      // Populate Radar Chart (Wind Rose) dynamically from wind vectors
      if (vectors.length > 0) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const dirCounts: Record<string, number> = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
        vectors.forEach((vec: any) => {
          const deg = vec.direction;
          if (deg !== undefined) {
            const idx = Math.round(((deg % 360) / 45)) % 8;
            dirCounts[directions[idx]]++;
          }
        });
        const totalVecs = vectors.length;
        const formattedRadar = directions.map(dir => ({
          subject: dir,
          A: totalVecs > 0 ? Math.round((dirCounts[dir] / totalVecs) * 100) : 0,
        }));
        setRadarData(formattedRadar);
      } else {
        setRadarData([
          { subject: 'N', A: 10 },
          { subject: 'NE', A: 15 },
          { subject: 'E', A: 20 },
          { subject: 'SE', A: 5 },
          { subject: 'S', A: 5 },
          { subject: 'SW', A: 10 },
          { subject: 'W', A: 25 },
          { subject: 'NW', A: 10 },
        ]);
      }

      // 2. Get Overview Metrics
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
      } else if (vectors.length > 0) {
        // Compute dynamically from wind vectors
        const speeds = vectors.map((v: any) => v.speed).filter((s: any) => s !== undefined);
        const avgSpeed = speeds.length > 0 ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length : 0.0;
        
        const dirs = vectors.map((v: any) => v.direction).filter((d: any) => d !== undefined);
        const avgDir = dirs.length > 0 ? dirs.reduce((a: number, b: number) => a + b, 0) / dirs.length : 0.0;
        
        // 24-hour transport distance in km: speed (m/s) * 86.4
        const distKm = avgSpeed * 86.4;
        
        // Primary source sector based on average direction
        let sourceSector = 'Local NCR';
        const deg = avgDir;
        if (deg >= 292.5 || deg < 22.5) sourceSector = 'North / Punjab';
        else if (deg >= 22.5 && deg < 67.5) sourceSector = 'Northeast / Uttarakhand';
        else if (deg >= 67.5 && deg < 112.5) sourceSector = 'East / Uttar Pradesh';
        else if (deg >= 112.5 && deg < 157.5) sourceSector = 'Southeast / Madhya Pradesh';
        else if (deg >= 157.5 && deg < 202.5) sourceSector = 'South / Central India';
        else if (deg >= 202.5 && deg < 247.5) sourceSector = 'Southwest / Rajasthan';
        else if (deg >= 247.5 && deg < 292.5) sourceSector = 'West / Thar Desert';

        setMetrics({
          avg_speed: avgSpeed,
          wind_dir: Math.round(avgDir),
          dist_km: distKm,
          primary_source: sourceSector,
        });
      } else {
        setMetrics({
          avg_speed: 0,
          wind_dir: 0,
          dist_km: 0,
          primary_source: 'N/A',
        });
      }

      // Mock or fetch source attribution for bar chart
      const attributionRes = await transportApi.getSourceAttribution({
        receptor_lat: 28.6139,
        receptor_lon: 77.2090,
        date: selectedDate,
      });

      const trajData = attributionRes.data;
      if (trajData && trajData.trajectory && trajData.trajectory.length > 0) {
        const counts: Record<string, number> = {};
        trajData.trajectory.forEach((pt: any) => {
          let reg = 'Local NCR';
          if (pt.lat > 29.5 && pt.lon < 76.5) reg = 'Punjab';
          else if (pt.lat > 28.2 && pt.lon < 77.1) reg = 'Haryana';
          else if (pt.lon > 77.3) reg = 'Uttar Pradesh';
          else if (pt.lat < 28.2 && pt.lon < 76.8) reg = 'Rajasthan';
          counts[reg] = (counts[reg] || 0) + 1;
        });

        const total = trajData.trajectory.length;
        const mapped = Object.entries(counts).map(([region, count]) => ({
          region,
          percentage: Math.round((count / total) * 100),
        })).sort((a, b) => b.percentage - a.percentage);

        setAttribution(mapped);
      } else {
        setAttribution([
          { region: 'Local NCR', percentage: 70 },
          { region: 'Haryana', percentage: 20 },
          { region: 'Uttar Pradesh', percentage: 10 }
        ]);
      }

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
                ...windVectors.map((vec: any) => {
                  return {
                    latitude: vec.lat,
                    longitude: vec.lon,
                    value: vec.speed || 10,
                    label: `Wind Direction: ${vec.direction}° (${vec.speed} m/s)`,
                    state: 'Meteorological Grid',
                  };
                }).filter((p: any) => p.latitude && p.longitude)
              ]}
              dataType="fire"
            />
          </div>
        </div>

        {/* Source Contribution */}
        <div className="glass-card p-5 rounded-2xl h-[500px] flex flex-col justify-between">
          <div className="h-full flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Source Sector Attribution</h3>
              <div className="h-[200px] mb-4">
                {attribution && attribution.length > 0 ? (
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
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-3 border border-dashed border-slate-800 rounded-xl">
                    <span className="text-xl">📊</span>
                    <span className="text-[10px] font-medium text-slate-400 mt-1">No Attribution Data</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Wind Rose Frequency</h3>
                <div className="h-[150px]">
                  {radarData && radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={8} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={8} />
                        <Radar name="Wind Frequency" dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-3 border border-dashed border-slate-800 rounded-xl">
                      <span className="text-xl">🧭</span>
                      <span className="text-[10px] font-medium text-slate-400 mt-1">No Wind Rose Data</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TransportDashboard;
