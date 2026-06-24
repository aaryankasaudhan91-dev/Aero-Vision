import React, { useEffect, useState } from 'react';
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

export const HchoDashboard: React.FC = () => {
  const [selectedState, setSelectedState] = useState('');
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getYesterdayString());
  const [selectedMethod, setSelectedMethod] = useState('dbscan');
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    avg_hcho: 0,
    hotspot_count: 0,
    highest_region: 'N/A',
  });
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);

  const getMethodLabel = (m: string) => {
    switch (m) {
      case 'dbscan':
        return 'DBSCAN Clusters';
      case 'getis_ord':
        return 'Getis-Ord Gi*';
      case 'morans_i':
        return "Local Moran's I";
      default:
        return '95th Percentile';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Overview Metrics
      const overviewRes = await hchoApi.getOverview({
        date: selectedDate,
        state: selectedState,
      });
      if (overviewRes.data) {
        setMetrics({
          avg_hcho: overviewRes.data.avg_hcho || 0,
          hotspot_count: overviewRes.data.hotspot_count || 0,
          highest_region: overviewRes.data.highest_region || 'N/A',
        });
      }

      // 2. Get Hotspots by method
      const hotspotsRes = await hchoApi.getHotspots({
        start_date: selectedDate,
        end_date: selectedDate,
        method: selectedMethod,
        state: selectedState,
      });
      setHotspots(hotspotsRes.data || []);

      // 3. Get Trends
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - 7);
      const trendsRes = await hchoApi.getTrends({
        start_date: start.toISOString().split('T')[0],
        end_date: selectedDate,
        state: selectedState,
      });
      setTrends(trendsRes.data || []);

    } catch (err) {
      console.error("Error fetching HCHO data:", err);
      setHotspots([]);
      setTrends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedDate, selectedMethod]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, [selectedState, selectedDate, selectedMethod]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          TROPOMI HCHO Hotspots
          {loading && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
        </h2>
        <p className="text-slate-400 text-sm">
          Sentinel-5P Formaldehyde columns and statistically detected high-risk source zones.
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Avg HCHO Column</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-white">
              {(metrics.avg_hcho * 1e5).toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 ml-1">× 10⁻⁵ mol/m²</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Detected Hotspots</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-purple-400">{metrics.hotspot_count}</span>
            <span className="text-xs text-slate-500 block mt-1">Spatial clusters exceeding threshold</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Primary Core Zone</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-amber-400 truncate block">
              {metrics.highest_region}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Highest regional emission density</span>
          </div>
        </div>
      </div>

      {/* Map & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial Map */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-2 items-center">
              <h3 className="text-sm font-semibold text-slate-300">Hotspot Location Grid</h3>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-purple-300 outline-none focus:border-purple-500"
              >
                <option value="dbscan">DBSCAN Clusters</option>
                <option value="getis_ord">Getis-Ord Gi*</option>
                <option value="morans_i">Local Moran's I</option>
                <option value="percentile">95th Percentile</option>
              </select>
            </div>
            <span className="text-xs text-slate-500">{getMethodLabel(selectedMethod)}</span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative">
            <IndiaMap
              points={hotspots
                .map((hot: any) => {
                  const lat = hot.centroid_lat;
                  const lon = hot.centroid_lon;
                  if (!lat || !lon) return null;
                  return {
                    latitude: lat,
                    longitude: lon,
                    value: (hot.mean_hcho * 1e5) || 0,
                    label: hot.region_name || 'Hotspot Zone',
                    state: hot.state || '',
                  };
                })
                .filter(Boolean) as any[]}
              dataType="hcho"
            />
          </div>
        </div>

        {/* Temporal HCHO Trends */}
        <div className="glass-card p-5 rounded-2xl h-[500px] flex flex-col justify-between">
          <div className="h-full flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">HCHO Temporal Trend</h3>
            <div className="flex-1 h-[400px]">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickFormatter={(v) => (v * 1e5).toFixed(1)}
                      label={{ value: 'HCHO (×10⁻⁵ mol/m²)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Line type="monotone" dataKey="mean_hcho" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-6 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-2xl mb-2">📊</span>
                  <span className="text-xs font-medium text-slate-400">No HCHO Trend Data Available</span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">No TROPOMI HCHO readings were available during the selected 7-day period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HchoDashboard;
