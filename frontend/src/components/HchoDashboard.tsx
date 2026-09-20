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
        return 'DBSCAN Density Clusters';
      case 'getis_ord':
        return 'Getis-Ord Gi* Statistics';
      case 'morans_i':
        return "Local Moran's Spatial Autocorrelation";
      default:
        return '95th Percentile Extreme Threshold';
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
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          TROPOMI Formaldehyde (HCHO) Hotspots
          {loading && (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent"></span>
          )}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Sentinel-5P Formaldehyde tropospheric vertical columns and geospatial emission density clusters.
        </p>
      </div>

      <FilterBar
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onRefresh={fetchData}
      />

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 perspective-1000">
        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading">
            Mean HCHO Tropospheric Column
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
              {(metrics.avg_hcho * 1e5).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">× 10⁻⁵ mol/m²</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Satellite tropospheric column density</p>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-700 font-heading">
            Identified Hotspot Clusters
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-sky-700 font-heading tracking-tight">
              {metrics.hotspot_count}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Clusters
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Spatial clusters exceeding threshold</p>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
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

      {/* Map & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial 3D / 2D Map */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[560px] flex flex-col border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <div className="flex gap-2.5 items-center">
              <h3 className="text-sm font-heading font-bold text-slate-900">Hotspot Location Grid</h3>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-sky-500 cursor-pointer shadow-2xs"
              >
                <option value="dbscan">DBSCAN Clusters</option>
                <option value="getis_ord">Getis-Ord Gi*</option>
                <option value="morans_i">Local Moran's I</option>
                <option value="percentile">95th Percentile</option>
              </select>
            </div>
            <span className="text-xs font-mono text-slate-500">{getMethodLabel(selectedMethod)}</span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
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
        <div className="glass-card p-5 rounded-2xl h-[560px] flex flex-col justify-between border border-slate-200/90 shadow-xs">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                HCHO Temporal Trend
              </h3>
              <span className="text-[10px] font-mono text-slate-500">7-Day Trajectory</span>
            </div>

            <div className="flex-1 h-[440px]">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
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
                    No TROPOMI HCHO readings were available during the selected period.
                  </p>
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
