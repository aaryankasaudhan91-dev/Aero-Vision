import React, { useEffect, useState } from 'react';
import IndiaMap from './IndiaMap';
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
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    avg_speed: 0,
    wind_dir: 0,
    dist_km: 0,
    primary_source: 'N/A',
  });
  const [windVectors, setWindVectors] = useState<any[]>([]);
  const [trajectory, setTrajectory] = useState<any[]>([]);
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
        const formattedRadar = directions.map((dir) => ({
          subject: dir,
          A: totalVecs > 0 ? Math.round((dirCounts[dir] / totalVecs) * 100) : 0,
        }));
        setRadarData(formattedRadar);
      } else {
        setRadarData([]);
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
        const speeds = vectors.map((v: any) => v.speed).filter((s: any) => s !== undefined);
        const avgSpeed = speeds.length > 0 ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length : 0.0;

        const dirs = vectors.map((v: any) => v.direction).filter((d: any) => d !== undefined);
        const avgDir = dirs.length > 0 ? dirs.reduce((a: number, b: number) => a + b, 0) / dirs.length : 0.0;

        const distKm = avgSpeed * 86.4;

        setMetrics({
          avg_speed: avgSpeed,
          wind_dir: Math.round(avgDir),
          dist_km: distKm,
          primary_source: selectedState || 'Indo-Gangetic Air Corridor',
        });
      }

      // 3. Get Source Attribution & Back-Trajectory
      const attributionRes = await transportApi.getSourceAttribution({
        receptor_lat: 28.6139,
        receptor_lon: 77.2090,
        date: selectedDate,
      });

      const trajData = attributionRes.data;
      if (trajData && trajData.trajectory && trajData.trajectory.length > 0) {
        setTrajectory(trajData.trajectory);
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
        const mapped = Object.entries(counts)
          .map(([region, count]) => ({
            region,
            percentage: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.percentage - a.percentage);

        setAttribution(mapped);
      } else {
        setTrajectory([]);
        setAttribution([]);
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
      setTrajectory([]);
      setRadarData([]);
      setAttribution([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedDate]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, [selectedState, selectedDate]);

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          Wind-Based Pollutant Transport & Dispersion
          {loading && (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent"></span>
          )}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Meteorological integration using 850hPa pressure level wind fields to trace inter-state smoke pathways.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-1000">
        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading">
            Mean Wind Speed (850 hPa)
          </span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
              {metrics.avg_speed.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">m/s</span>
          </div>
          <span className="text-xs text-slate-500 block mt-1">Advection kinetic velocity</span>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 font-heading">
            Wind Direction Vector
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-amber-700 font-heading tracking-tight">
              {metrics.wind_dir}°
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              {getWindDirectionLabel(metrics.wind_dir)}
            </span>
          </div>
          <span className="text-xs text-slate-500 block mt-1">Prevailing compass azimuth</span>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-700 font-heading">
            24-hr Transport Reach
          </span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-sky-700 font-heading tracking-tight">
              {metrics.dist_km.toFixed(0)}
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">km / day</span>
          </div>
          <span className="text-xs text-slate-500 block mt-1">Theoretical particle travel radius</span>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 font-heading">
            Primary Upwind Sector
          </span>
          <div className="mt-3">
            <span className="text-xl font-extrabold text-teal-700 font-heading truncate block">
              {metrics.primary_source}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Upwind contribution zone</span>
          </div>
        </div>
      </div>

      {/* Map & Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial Map with Trajectory Polylines */}
        <div className="lg:col-span-2 glass-card p-3 sm:p-4 rounded-2xl h-[420px] sm:h-[480px] lg:h-[560px] flex flex-col border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-heading font-bold text-slate-900">
              Lagrangian Back-Trajectories & Wind Field
            </h3>
            <span className="text-xs font-mono text-slate-500">24-hour Backward Advection</span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
            <IndiaMap
              points={[
                { latitude: 28.6139, longitude: 77.2090, value: 35, label: 'Receptor: Delhi NCR', state: 'Delhi', color: '#0284c7' },
                ...trajectory.map((pt: any) => ({
                  latitude: pt.lat,
                  longitude: pt.lon,
                  value: 15,
                  label: `Trajectory point: hour ${pt.hour} (${pt.lat}, ${pt.lon})`,
                  state: 'Back-Trajectory',
                  color: '#d97706'
                })),
                ...windVectors.filter((_, idx) => idx % 25 === 0).map((vec: any) => ({
                  latitude: vec.lat,
                  longitude: vec.lon,
                  value: vec.speed || 10,
                  label: `Wind Grid: ${vec.direction}° (${vec.speed} m/s)`,
                  state: 'Meteorological Grid',
                  color: '#0d9488',
                  wind_direction: vec.direction,
                  wind_speed: vec.speed
                })).filter((p: any) => p.latitude && p.longitude)
              ]}
              dataType="pollutant"
            />
          </div>
        </div>

        {/* Source Contribution & Wind Rose */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl h-auto lg:h-[560px] flex flex-col justify-between border border-slate-200/90 shadow-xs">
          <div className="h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                  Source Sector Attribution
                </h3>
                <span className="text-[10px] font-mono text-slate-500">% Contribution</span>
              </div>
              <div className="h-[210px] mb-4">
                {attribution && attribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attribution} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} unit="%" tickLine={false} />
                      <YAxis dataKey="region" type="category" stroke="#64748b" fontSize={9} width={90} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.75rem',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="percentage" fill="#0284c7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-3 border border-dashed border-slate-200 rounded-xl">
                    <span className="text-xl mb-1">📊</span>
                    <span className="text-xs font-medium text-slate-600">No Attribution Data</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                    Wind Rose Frequency
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">Compass Octants</span>
                </div>
                <div className="h-[180px]">
                  {radarData && radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={8} />
                        <Radar name="Wind Frequency" dataKey="A" stroke="#0284c7" fill="#0284c7" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-3 border border-dashed border-slate-200 rounded-xl">
                      <span className="text-xl mb-1">🧭</span>
                      <span className="text-xs font-medium text-slate-600">No Wind Rose Data</span>
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
