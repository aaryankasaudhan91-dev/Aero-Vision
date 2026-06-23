import React, { useEffect, useState } from 'react';
import IndiaMap3D from './IndiaMap3D';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { fireApi } from '../services/api';
import FilterBar from './FilterBar';

export const FireDashboard: React.FC = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-06-22');
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    fire_count: 0,
    avg_frp: 0,
    correlation_r: 0,
    lag_days: 0,
  });
  const [fires, setFires] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Overview Metrics
      const overviewRes = await fireApi.getOverview({
        date: selectedDate,
        state: selectedState,
      });
      if (overviewRes.data) {
        setMetrics({
          fire_count: overviewRes.data.fire_count || 0,
          avg_frp: overviewRes.data.avg_frp || 0,
          correlation_r: overviewRes.data.correlation_r || 0,
          lag_days: overviewRes.data.lag_days || 0,
        });
      }

      // 2. Get Fire Records
      const firesRes = await fireApi.getRecords({
        start_date: selectedDate,
        end_date: selectedDate,
        state: selectedState,
      });
      setFires(firesRes.data || []);

      // 3. Get Fire-HCHO Correlation Timeseries
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - 7);
      const corrRes = await fireApi.getCorrelationTimeseries({
        region: selectedState || 'Indo-Gangetic Plain',
        start_date: start.toISOString().split('T')[0],
        end_date: selectedDate,
      });
      setChartData(corrRes.data || []);

    } catch (err) {
      console.error("Error fetching Fire dashboard data:", err);
      setFires([]);
      setChartData([]);
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
          Active Fires & HCHO Correlation
          {loading && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
        </h2>
        <p className="text-slate-400 text-sm">
          NASA FIRMS active thermal anomalies overlaid with Sentinel-5P HCHO columns for biomass burning impacts.
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
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Fire Detections</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-white">{metrics.fire_count}</span>
            <span className="text-xs text-slate-500 block mt-1">MODIS + VIIRS Active Nodes</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Average FRP</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-amber-500">{metrics.avg_frp}</span>
            <span className="text-xs text-slate-500 ml-1">MW (Fire Radiative Power)</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Fire-HCHO Correlation (r)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-400">{metrics.correlation_r}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300">
              Strong
            </span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Optimal Transport Lag</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-blue-400">+{metrics.lag_days}d</span>
            <span className="text-xs text-slate-500 block mt-1">Primary peak offset time</span>
          </div>
        </div>
      </div>

      {/* Maps and correlation chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial Map */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Fire Radiative Power Spatial Grid</h3>
            <span className="text-xs text-slate-500">NASA FIRMS NRT</span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative">
            <IndiaMap3D
              points={fires
                .map((fire: any) => {
                  const lat = fire.latitude;
                  const lon = fire.longitude;
                  if (!lat || !lon) return null;
                  return {
                    latitude: lat,
                    longitude: lon,
                    value: fire.frp || 0,
                    label: `Active Fire (${fire.source})`,
                    state: fire.state || 'N/A',
                  };
                })
                .filter(Boolean) as any[]}
              dataType="fire"
            />
          </div>
        </div>

        {/* Dual Axis Correlation Chart */}
        <div className="glass-card p-5 rounded-2xl h-[500px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Biomass Burning vs HCHO</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line yAxisId="left" type="monotone" dataKey="fire_count" name="Fire Count" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="hcho" name="HCHO (1e-5)" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FireDashboard;
