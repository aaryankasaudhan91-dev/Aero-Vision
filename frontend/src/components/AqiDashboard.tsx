import React, { useEffect, useState, useMemo } from 'react';
import IndiaMap from './IndiaMap';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { aqiApi } from '../services/api';
import FilterBar from './FilterBar';

export const AqiDashboard: React.FC = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getYesterdayString());
  const [loading, setLoading] = useState(false);

  // Real backend metrics state (no mock data)
  const [metrics, setMetrics] = useState({
    avg_aqi: 0,
    max_aqi: 0,
    min_aqi: 0,
    category: 'N/A',
  });
  const [stations, setStations] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);

  const mapPoints = useMemo(() => {
    return stations.map((stn) => ({
      latitude: stn.latitude,
      longitude: stn.longitude,
      value: stn.aqi || 0,
      label: stn.station_name,
      state: stn.state || '',
    }));
  }, [stations]);

  const getAqiClass = (aqi: number) => {
    if (aqi <= 50) return 'aqi-good';
    if (aqi <= 100) return 'aqi-satisfactory';
    if (aqi <= 200) return 'aqi-moderate';
    if (aqi <= 300) return 'aqi-poor';
    if (aqi <= 400) return 'aqi-verypoor';
    if (aqi <= 500) return 'aqi-severe';
    return 'aqi-severe';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - 7);

      // Execute all dashboard queries in parallel rather than sequential waterfall
      const [overviewResult, stationsResult, trendsResult] = await Promise.allSettled([
        aqiApi.getOverview({
          date: selectedDate,
          state: selectedState,
          city: selectedCity,
        }),
        aqiApi.getStations({
          state: selectedState,
          is_active: true,
        }),
        aqiApi.getTrends({
          start_date: start.toISOString().split('T')[0],
          end_date: selectedDate,
          state: selectedState,
          city: selectedCity,
        }),
        // Trigger background prediction run asynchronously
        aqiApi.getPredictions({
          date: selectedDate,
          state: selectedState,
        }).catch(() => { }),
      ]);

      // 1. Process Overview & Stations
      if (overviewResult.status === 'fulfilled' && overviewResult.value?.data) {
        const data = overviewResult.value.data;
        setMetrics({
          avg_aqi: data.avg_aqi || 0,
          max_aqi: data.max_aqi || 0,
          min_aqi: data.min_aqi || 0,
          category: data.aqi_category || 'N/A',
        });

        const obsList = Array.isArray(data.observations) ? data.observations : [];
        const mappedStations = obsList.map((o: any) => ({
          station_id: o.station_id,
          station_name: o.cpcb_stations?.station_name || 'Unknown',
          city: o.cpcb_stations?.city || '',
          state: o.cpcb_stations?.state || '',
          latitude: o.cpcb_stations?.latitude || 0,
          longitude: o.cpcb_stations?.longitude || 0,
          aqi: o.aqi,
        }));
        setStations(mappedStations);
      } else if (overviewResult.status === 'rejected') {
        console.warn('AQI overview fetch error:', overviewResult.reason);
      }

      // 2. Process Cities list from Stations
      if (stationsResult.status === 'fulfilled' && stationsResult.value?.data) {
        const rawStations = Array.isArray(stationsResult.value.data) ? stationsResult.value.data : [];
        const uniqueCities = Array.from(
          new Set(rawStations.map((s: any) => s.city).filter(Boolean))
        ) as string[];
        setCitiesList(uniqueCities);
      }

      // 3. Process Historical Trends
      if (trendsResult.status === 'fulfilled' && trendsResult.value?.data) {
        setTrends(Array.isArray(trendsResult.value.data) ? trendsResult.value.data : []);
      }

    } catch (err: any) {
      console.error("Error fetching live AQI dashboard data:", err);
      setStations([]);
      setTrends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedCity, selectedDate]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, [selectedState, selectedCity, selectedDate]);

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
            <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900">
              National AQI Overview
            </h2>
            {loading && (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent ml-2"></span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time CPCB ground telemetry, Sentinel-5P multispectral estimation, and 3D spatial cartography.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="glass-panel px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 border border-slate-200 shadow-2xs">
            Ground Truth: CPCB Realtime
          </span>
        </div>
      </div>

      {/* Global Filter Bar */}
      <FilterBar
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        cities={citiesList}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onRefresh={fetchData}
      />

      {/* 4 Minimalist 3D-Tilt Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-1000">
        {/* Card 1: Average AQI */}
        <div className="glass-card card-3d p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading">
              National Mean AQI
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-3">
            <span className="text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
              {metrics.avg_aqi}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getAqiClass(metrics.avg_aqi)}`}>
              {metrics.category}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span>📡</span> Area-weighted nationwide aggregate
          </p>
        </div>

        {/* Card 2: Maximum AQI */}
        <div className="glass-card card-3d p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 font-heading">
              Apex Spike Hotspot
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-extrabold text-rose-600 font-heading tracking-tight">
              {metrics.max_aqi}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Hazardous
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span>⚠️</span> Critical respiratory threshold spike
          </p>
        </div>

        {/* Card 3: Minimum AQI */}
        <div className="glass-card card-3d p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 font-heading">
              Clean Baseline Pocket
            </span>
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-extrabold text-teal-700 font-heading tracking-tight">
              {metrics.min_aqi}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              Optimal
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span>🌿</span> Lowest recorded ambient index
          </p>
        </div>

        {/* Card 4: Active Stations */}
        <div className="glass-card card-3d p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading">
              Monitored Stations
            </span>
            <span className="text-xs">🛰️</span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-extrabold text-sky-700 font-heading tracking-tight">
              {stations.length}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Live
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span>🟢</span> Active CPCB continuous ambient nodes
          </p>
        </div>
      </div>

      {/* Main 3D Cartography Map & Trend Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 3D Map Viewport (Takes 2 Columns) */}
        <div className="lg:col-span-2 glass-card p-3 sm:p-4 rounded-2xl h-[420px] sm:h-[480px] lg:h-[560px] flex flex-col border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <h3 className="text-sm font-heading font-bold text-slate-800">
                Spatial Subcontinent Distribution
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Model: Sentinel-5P + CPCB Hybrid
            </span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
            <IndiaMap
              points={mapPoints}
              dataType="aqi"
            />
          </div>
        </div>

        {/* Side Panel: Trends & Category Distribution */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-auto lg:h-[560px] border border-slate-200/90 shadow-xs">
          {/* Top: 7-Day Trend Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                7-Day Historical Trend
              </h3>
              <span className="text-[10px] font-mono text-slate-500">µg/m³ & AQI</span>
            </div>
            <div className="h-[200px] min-w-0">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} minWidth={100} minHeight={150}>
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aqiLightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                        fontSize: '11px',
                        fontFamily: 'Inter',
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="aqi"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#aqiLightGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-2xl mb-1">📈</span>
                  <span className="text-xs font-medium text-slate-500">No Trend Telemetry Available</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Distribution Histogram */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                Category Distribution
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Station Breakdown</span>
            </div>
            <div className="h-[200px] min-w-0">
              {stations && stations.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} minWidth={100} minHeight={150}>
                  <BarChart
                    data={[
                      { name: 'Good', count: stations.filter((s) => (s.aqi || 0) <= 50).length },
                      { name: 'Satis.', count: stations.filter((s) => (s.aqi || 0) > 50 && (s.aqi || 0) <= 100).length },
                      { name: 'Mod.', count: stations.filter((s) => (s.aqi || 0) > 100 && (s.aqi || 0) <= 200).length },
                      { name: 'Poor', count: stations.filter((s) => (s.aqi || 0) > 200 && (s.aqi || 0) <= 300).length },
                      { name: 'Severe', count: stations.filter((s) => (s.aqi || 0) > 300).length },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      <Cell fill="#0d9488" />
                      <Cell fill="#10b981" />
                      <Cell fill="#d97706" />
                      <Cell fill="#ea580c" />
                      <Cell fill="#7c3aed" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-2xl mb-1">📊</span>
                  <span className="text-xs font-medium text-slate-500">No Station Distribution</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real Live CPCB Station Telemetry Table */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-sm font-heading font-bold text-slate-900">
              Live Ground Monitoring Stations ({stations.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              CPCB Continuous Ambient Air Quality Monitoring Systems (CAAQMS)
            </p>
          </div>
          <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-mono">
            {selectedDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-heading uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Station Name</th>
                <th className="py-2.5 px-4">City</th>
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4 text-right">Latitude / Longitude</th>
                <th className="py-2.5 px-4 text-right">AQI</th>
                <th className="py-2.5 px-4 text-center">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stations.slice(0, 10).map((stn, idx) => (
                <tr key={stn.station_id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-900">{stn.station_name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{stn.city || '—'}</td>
                  <td className="py-2.5 px-4 text-slate-600">{stn.state || '—'}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                    {stn.latitude?.toFixed(2)}°, {stn.longitude?.toFixed(2)}°
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {stn.aqi ?? 'N/A'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getAqiClass(stn.aqi || 0)}`}>
                      {stn.aqi <= 50 ? 'Good' : stn.aqi <= 100 ? 'Satisfactory' : stn.aqi <= 200 ? 'Moderate' : stn.aqi <= 300 ? 'Poor' : stn.aqi <= 400 ? 'Very Poor' : 'Severe'}
                    </span>
                  </td>
                </tr>
              ))}
              {stations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No stations reporting for the chosen date or region.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AqiDashboard;
