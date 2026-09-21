import React, { useEffect, useState, useRef, useCallback } from 'react';
import IndiaMap from './IndiaMap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { hchoApi } from '../services/api';
import FilterBar from './FilterBar';

interface LiveEvent {
  id: number | string;
  time: string;
  type: string;
  region: string;
  state: string;
  value: number;
  method: string;
  severity: 'CRITICAL' | 'WARNING';
}

export const HchoDashboard: React.FC = () => {
  const [selectedState, setSelectedState] = useState('');
  
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedMethod, setSelectedMethod] = useState('dbscan');
  const [loading, setLoading] = useState(false);

  // Real-Time Live Streaming System States
  const [isRealTime, setIsRealTime] = useState<boolean>(true);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(10);
  const [countdown, setCountdown] = useState<number>(10);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Connecting...');
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [satelliteInfo, setSatelliteInfo] = useState<{
    satellite: string;
    orbit_mode: string;
    observation_date: string;
  }>({
    satellite: 'Sentinel-5P (TROPOMI)',
    orbit_mode: 'NRTI Near Real-Time Level-3',
    observation_date: getTodayString(),
  });

  const [metrics, setMetrics] = useState({
    avg_hcho: 0,
    hotspot_count: 0,
    highest_region: 'N/A',
  });
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);

  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const getMethodLabel = (m: string) => {
    switch (m) {
      case 'dbscan':
        return 'DBSCAN Density Clusters';
      case 'getis_ord':
        return 'Getis-Ord Gi* Statistics';
      case 'morans_i':
        return "Local Moran's Spatial Autocorrelation";
      default:
        return '95th Percentile Extreme Threshold';
    }
  };

  // Main Data Fetcher supporting both Real-Time Live and Historical Archival Modes
  const fetchData = useCallback(async (isBackgroundSync = false) => {
    if (!isBackgroundSync) setLoading(true);

    try {
      if (isRealTime) {
        // ── 1. Real-Time Live Stream Pipeline ──
        const liveRes = await hchoApi.getLiveFeed({
          state: selectedState || undefined,
        });

        if (liveRes.data) {
          const d = liveRes.data;
          setMetrics({
            avg_hcho: d.avg_hcho || 0,
            hotspot_count: d.hotspot_count || (d.hotspots ? d.hotspots.length : 0),
            highest_region: d.highest_region || 'N/A',
          });

          if (d.hotspots && d.hotspots.length > 0) {
            // Filter by selected method if present
            const filteredHotspots = selectedMethod
              ? d.hotspots.filter((h: any) => !h.detection_method || h.detection_method.toLowerCase() === selectedMethod.toLowerCase())
              : d.hotspots;
            setHotspots(filteredHotspots.length > 0 ? filteredHotspots : d.hotspots);
          }

          if (d.live_events && d.live_events.length > 0) {
            setLiveEvents(d.live_events);
          }

          setSatelliteInfo({
            satellite: d.satellite || 'Sentinel-5P (TROPOMI)',
            orbit_mode: d.orbit_mode || 'NRTI Near Real-Time Level-3',
            observation_date: d.observation_date || selectedDate,
          });

          if (d.observation_date && d.observation_date !== selectedDate) {
            setSelectedDate(d.observation_date);
          }
        }

        // Fetch corresponding 7-day live trends
        const liveDate = liveRes.data?.observation_date || selectedDate;
        const trendStart = new Date(liveDate);
        trendStart.setDate(trendStart.getDate() - 7);
        const trendsRes = await hchoApi.getTrends({
          start_date: trendStart.toISOString().split('T')[0],
          end_date: liveDate,
          state: selectedState || undefined,
        });
        setTrends(trendsRes.data || []);

      } else {
        // ── 2. Historical Archival Pipeline ──
        const overviewRes = await hchoApi.getOverview({
          date: selectedDate,
          state: selectedState || undefined,
        });
        if (overviewRes.data) {
          setMetrics({
            avg_hcho: overviewRes.data.avg_hcho || 0,
            hotspot_count: overviewRes.data.hotspot_count || 0,
            highest_region: overviewRes.data.highest_region || 'N/A',
          });
        }

        const hotspotsRes = await hchoApi.getHotspots({
          start_date: selectedDate,
          end_date: selectedDate,
          method: selectedMethod,
          state: selectedState || undefined,
        });
        setHotspots(hotspotsRes.data || []);

        const start = new Date(selectedDate);
        start.setDate(start.getDate() - 7);
        const trendsRes = await hchoApi.getTrends({
          start_date: start.toISOString().split('T')[0],
          end_date: selectedDate,
          state: selectedState || undefined,
        });
        setTrends(trendsRes.data || []);
      }

      setLastSyncTime(new Date().toLocaleTimeString());
      setCountdown(pollIntervalSec);
    } catch (err) {
      console.error('Error fetching HCHO data:', err);
    } finally {
      setLoading(false);
    }
  }, [isRealTime, selectedDate, selectedMethod, selectedState, pollIntervalSec]);

  // Initial and parameter change fetch
  useEffect(() => {
    fetchData();
  }, [selectedState, selectedDate, selectedMethod, isRealTime]);

  // Real-Time Polling Loop & Countdown Timer
  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    if (isRealTime) {
      setCountdown(pollIntervalSec);

      // Decrement countdown counter every second
      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((prev) => (prev > 1 ? prev - 1 : pollIntervalSec));
      }, 1000);

      // Trigger automatic background polling
      pollTimerRef.current = window.setInterval(() => {
        fetchData(true);
      }, pollIntervalSec * 1000);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isRealTime, pollIntervalSec, fetchData]);

  // Global header refresh listener
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData(false);
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, [fetchData]);

  // Jump to Live Real-Time handler
  const handleJumpToLive = () => {
    setIsRealTime(true);
    setSelectedDate(getTodayString());
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* ── Page Header & Live Telemetry Indicator ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            TROPOMI Formaldehyde (HCHO) Hotspots
            {loading && (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent" />
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Copernicus Sentinel-5P Near Real-Time (NRTI) vertical column densities and machine learning spatial clusters.
          </p>
        </div>

        {/* Real-Time Live Control Switcher */}
        <div className="flex items-center gap-3">
          <div className="glass-card p-1.5 px-3 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3 bg-white/80 backdrop-blur-md">
            <button
              onClick={() => setIsRealTime(!isRealTime)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all duration-200 cursor-pointer shadow-xs ${
                isRealTime
                  ? 'bg-rose-600 text-white shadow-rose-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isRealTime ? 'Pause real-time stream' : 'Resume live real-time stream'}
            >
              <span className="relative flex h-2 w-2">
                {isRealTime && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isRealTime ? 'bg-white' : 'bg-slate-400'}`}></span>
              </span>
              <span>{isRealTime ? 'LIVE STREAMING' : 'STREAM PAUSED'}</span>
            </button>

            {isRealTime && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500 border-l border-slate-200 pl-3">
                <span>Sync in: <strong className="text-rose-600 font-bold">{countdown}s</strong></span>
                <select
                  value={pollIntervalSec}
                  onChange={(e) => setPollIntervalSec(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                  title="Select live polling cadence"
                >
                  <option value={5}>5s (Fast)</option>
                  <option value={10}>10s (Standard)</option>
                  <option value={30}>30s (Eco)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Real-Time Operational Banner ── */}
      <div className={`p-3.5 px-5 rounded-2xl border transition-all duration-300 flex flex-wrap items-center justify-between gap-3 text-xs ${
        isRealTime 
          ? 'bg-gradient-to-r from-rose-950/5 via-sky-950/5 to-emerald-950/5 border-rose-200/80 shadow-xs'
          : 'bg-amber-50/70 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-base">🛰️</span>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-heading font-bold text-slate-900">
              {satelliteInfo.satellite}
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="text-slate-600 font-mono text-[11px]">
              {satelliteInfo.orbit_mode}
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="text-slate-500 font-medium">
              Obs Date: <strong className="text-slate-800 font-mono">{satelliteInfo.observation_date}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span>Last Telemetry Sync: <strong className="text-slate-700">{lastSyncTime}</strong></span>
          {!isRealTime && (
            <button
              onClick={handleJumpToLive}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1"
            >
              <span>⚡</span> Jump to Live Feed
            </button>
          )}
        </div>
      </div>

      {/* ── Global Filter Bar ── */}
      <FilterBar
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedDate={selectedDate}
        setSelectedDate={(d) => {
          setSelectedDate(d);
          setIsRealTime(false); // Manually picking a date shifts into Historical Archive mode
        }}
        onRefresh={() => fetchData(false)}
      />

      {/* ── 3 Key Telemetry Metrics Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 perspective-1000">
        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading flex items-center justify-between">
            <span>Mean HCHO Column Density</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
              LIVE TELEMETRY
            </span>
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
              {(metrics.avg_hcho * 1e5).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">× 10⁻⁵ mol/m²</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            Subcontinental tropospheric vertical column density
          </p>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading flex items-center justify-between">
            <span>Identified Hotspot Clusters</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
              {getMethodLabel(selectedMethod).split(' ')[0]}
            </span>
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
              {metrics.hotspot_count}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Active Nodes
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Spatial clusters exceeding statistical anomaly threshold
          </p>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 font-heading">
            Primary Emission Epicenter
          </span>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-700 font-heading truncate block">
              {metrics.highest_region}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Maximum regional VOC precursor density</span>
          </div>
        </div>
      </div>

      {/* ── Map & Temporal Trend Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial 3D / 2D WebGL Map */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[580px] flex flex-col border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <div className="flex flex-wrap gap-2.5 items-center">
              <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                <span>Hotspot Spatial Location Grid</span>
                {isRealTime && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </h3>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-sky-500 cursor-pointer shadow-2xs"
                title="Select machine learning clustering algorithm"
              >
                <option value="dbscan">DBSCAN Density Clusters</option>
                <option value="getis_ord">Getis-Ord Gi* Statistics</option>
                <option value="morans_i">Local Moran's Spatial I</option>
                <option value="percentile">95th Percentile Extreme</option>
              </select>
            </div>
            <span className="text-xs font-mono text-slate-500">{getMethodLabel(selectedMethod)}</span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
            <IndiaMap
              points={hotspots
                .map((hot: any) => {
                  const lat = hot.centroid_lat ?? hot.latitude;
                  const lon = hot.centroid_lon ?? hot.longitude;
                  if (!lat || !lon) return null;
                  const rawVal = hot.mean_hcho ?? hot.peak_hcho ?? hot.column_value ?? 0;
                  return {
                    latitude: Number(lat),
                    longitude: Number(lon),
                    value: Number(rawVal) * 1e5,
                    label: hot.region_name || 'Hotspot Zone',
                    state: hot.state || '',
                  };
                })
                .filter(Boolean) as any[]}
              dataType="hcho"
              variableName="HCHO Density"
              unit="× 10⁻⁵ mol/m²"
            />
          </div>
        </div>

        {/* Temporal 7-Day HCHO Trend Chart */}
        <div className="glass-card p-5 rounded-2xl h-[580px] flex flex-col justify-between border border-slate-200/90 shadow-xs">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                  HCHO Temporal Trend
                </h3>
                <span className="text-[10px] text-slate-400">7-Day Continuous Satellite Trajectory</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                Daily Mean
              </span>
            </div>

            <div className="flex-1 h-[460px] min-h-[300px] min-w-0">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                  <LineChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(v) => (v * 1e5).toFixed(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                        fontSize: '11px',
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      formatter={(v: any) => [`${(Number(v) * 1e5).toFixed(2)} × 10⁻⁵ mol/m²`, 'Mean HCHO']}
                    />
                    <Line
                      type="monotone"
                      dataKey="mean_hcho"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#d97706' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-2xl mb-2">📊</span>
                  <span className="text-xs font-medium text-slate-600">No HCHO Trend Data Available</span>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                    Ingesting continuous trajectory passes from Sentinel-5P...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Streaming Telemetry Ticker & Hotspot Cluster Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Incoming Telemetry Log Stream */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-[340px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-xs font-heading font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <span className="text-rose-600">📡</span> Live Telemetry Feed
            </h3>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              RECEIVING 100%
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs custom-scrollbar">
            {liveEvents.length > 0 ? (
              liveEvents.map((evt, idx) => (
                <div
                  key={evt.id || idx}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all flex flex-col gap-1 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">{evt.time}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                        evt.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {evt.severity}
                    </span>
                  </div>
                  <div className="font-sans font-bold text-slate-800 text-xs truncate">
                    {evt.region}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{evt.state || 'National Grid'}</span>
                    <span className="font-bold text-slate-700">
                      {evt.value} × 10⁻⁵ mol/m²
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <span>🛰️ Listening for live Sentinel-5P overpasses...</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Active Hotspots Ranking Table */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-[340px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-xs font-heading font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <span>🏛️</span> Active Hotspot Clusters Ranking
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              {hotspots.length} Verified Spatial Clusters
            </span>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                  <th className="py-2 px-3">Rank</th>
                  <th className="py-2 px-3">Region & State</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Mean HCHO</th>
                  <th className="py-2 px-3">Peak Density</th>
                  <th className="py-2 px-3">Cluster Area</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {hotspots.slice(0, 7).map((hot, idx) => {
                  const meanVal = hot.mean_hcho ? (hot.mean_hcho * 1e5).toFixed(2) : '—';
                  const peakVal = hot.peak_hcho || hot.max_hcho ? ((hot.peak_hcho || hot.max_hcho) * 1e5).toFixed(2) : '—';
                  const areaVal = hot.area_sq_km ? `${hot.area_sq_km} km²` : '—';

                  return (
                    <tr key={hot.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-800">{hot.region_name || 'Industrial Corridor'}</div>
                        <div className="text-[10px] text-slate-400">{hot.state || 'India'}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                          {(hot.detection_method || selectedMethod).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        {meanVal} <span className="text-[10px] font-normal text-slate-400">× 10⁻⁵</span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-rose-600">
                        {peakVal} <span className="text-[10px] font-normal text-slate-400">× 10⁻⁵</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">{areaVal}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          Elevated
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HchoDashboard;
