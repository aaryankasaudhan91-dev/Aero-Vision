import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { aqiApi } from '../services/api';
import FilterBar from './FilterBar';

const IndiaMap = lazy(() => import('./IndiaMap'));
const AqiCharts = lazy(() => import('./AqiCharts'));

interface AqiDashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export const AqiDashboard: React.FC<AqiDashboardProps> = ({ onNavigateTab }) => {
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
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900">
              National AQI Overview
            </h1>
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

      {/* 3D Atmospheric Pipeline Twin Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-4 md:p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-sky-800/40 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-2xl shrink-0">
            🛰️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-300 border border-sky-400/30">
                Interactive 3D Digital Twin
              </span>
              <span className="text-xs text-sky-400 font-mono">5 Real-time Stages</span>
            </div>
            <h2 className="text-base font-heading font-bold text-white mt-0.5">
              Explore the AeroVision Atmospheric Processing Machine
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              Inspect how raw CPCB ground sensors & Sentinel-5P TROPOMI satellite feeds pass through AI transport physics, 3D cartography, and public health advisory algorithms.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (onNavigateTab) {
              onNavigateTab('pipeline');
            } else {
              window.location.hash = 'pipeline';
            }
          }}
          className="min-h-[40px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer hover:scale-[1.02]"
        >
          <span>Launch 3D Pipeline</span>
          <span>→</span>
        </button>
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
            <Suspense fallback={
              <div className="w-full h-full min-h-[380px] bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2">
                <span className="text-2xl animate-spin">🛰️</span>
                <span className="text-xs font-mono font-medium">Initializing Geospatial Cartography...</span>
              </div>
            }>
              <IndiaMap
                points={mapPoints}
                dataType="aqi"
              />
            </Suspense>
          </div>
        </div>

        {/* Side Panel: Trends & Category Distribution (Code-Split) */}
        <Suspense fallback={
          <div className="glass-card p-4 sm:p-5 rounded-2xl h-[400px] lg:h-[560px] flex flex-col justify-center items-center text-slate-400 gap-2 border border-slate-200/90 shadow-xs">
            <span className="text-2xl animate-pulse">📊</span>
            <span className="text-xs font-mono">Loading Analytical Charts...</span>
          </div>
        }>
          <AqiCharts trends={trends} stations={stations} />
        </Suspense>
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
