import React, { useEffect, useState } from 'react';
import IndiaMap from './IndiaMap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { weatherApi } from '../services/api';

const variables = [
  { id: 'temperature_2m', name: 'Temperature', icon: '🌡️', unit: '°C', desc: 'Air temperature at 2 meters above ground. Used to identify urban heat islands and convective mixing.' },
  { id: 'wind_speed_10m', name: 'Wind Speed', icon: '🌀', unit: 'm/s', desc: 'Horizontal wind speed at 10 meters. Controls horizontal dispersion and transport of criteria pollutants.' },
  { id: 'relative_humidity', name: 'Relative Humidity', icon: '💧', unit: '%', desc: 'Moisture content of the air. High humidity promotes secondary aerosol formation and swelling.' },
  { id: 'pbl_height', name: 'Boundary Layer Height', icon: '☁️', unit: 'm', desc: 'Planetary Boundary Layer height. Dictates the vertical mixing volume for surface pollutants.' }
];

export const WeatherDashboard: React.FC = () => {
  const [selectedVariable, setSelectedVariable] = useState('temperature_2m');
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [startDate] = useState(getTodayString());
  
  const [forecastDays, setForecastDays] = useState<string[]>([]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [mapPoints, setMapPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [stats, setStats] = useState({ avg: 0, min: 0, max: 0 });
  const [trendData, setTrendData] = useState<any[]>([]);
  
  const [commentary, setCommentary] = useState<string>('');
  const [commentarySource, setCommentarySource] = useState<string>('');
  const [loadingCommentary, setLoadingCommentary] = useState(false);

  // Generate 7 forecast days starting from today
  useEffect(() => {
    const days: string[] = [];
    const base = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    setForecastDays(days);
  }, [startDate]);

  const fetchForecastForDate = async (dateStr: string, variable: string) => {
    try {
      const res = await weatherApi.getForecast({ start_date: dateStr, variable });
      return res.data || [];
    } catch (err) {
      console.error(`Error fetching forecast for ${dateStr}:`, err);
      return [];
    }
  };

  const loadDashboardData = async () => {
    if (forecastDays.length === 0) return;
    setLoading(true);
    setLoadingCommentary(true);
    const targetDate = forecastDays[selectedDateIdx];

    try {
      // 1. Fetch map points for currently selected date index
      const points = await fetchForecastForDate(targetDate, selectedVariable);
      setMapPoints(points);

      // Fetch commentary
      try {
        const commRes = await weatherApi.getForecastCommentary({ start_date: targetDate, variable: selectedVariable });
        setCommentary(commRes.data?.commentary || '');
        setCommentarySource(commRes.data?.source || '');
      } catch (err) {
        console.error("Error fetching commentary:", err);
        setCommentary('');
        setCommentarySource('');
      } finally {
        setLoadingCommentary(false);
      }

      // Compute statistics
      if (points.length > 0) {
        const vals = points.map((p: any) => p.value);
        const sum = vals.reduce((a: number, b: number) => a + b, 0);
        setStats({
          avg: sum / vals.length,
          min: Math.min(...vals),
          max: Math.max(...vals)
        });
      } else {
        setStats({ avg: 0, min: 0, max: 0 });
      }

      // 2. Fetch all 7 days in parallel to generate the 7-day trend lines for key cities
      const allDaysForecasts = await Promise.all(
        forecastDays.map(d => fetchForecastForDate(d, selectedVariable))
      );

      const cities = [
        { name: 'Delhi', lat: 29.15, lon: 77.25 },
        { name: 'Mumbai', lat: 19.5, lon: 72.8 },
        { name: 'Bengaluru', lat: 13.5, lon: 77.3 }
      ];

      const formattedTrend = forecastDays.map((dateStr, idx) => {
        const dayPoints = allDaysForecasts[idx] || [];
        const entry: any = { date: dateStr.split('-').slice(1).join('/') }; // MM/DD format
        
        cities.forEach(city => {
          // Find nearest grid point in the data for each city
          let nearestVal: number | null = null;
          let minDistance = Infinity;
          
          for (const pt of dayPoints) {
            const dist = (pt.latitude - city.lat) ** 2 + (pt.longitude - city.lon) ** 2;
            if (dist < minDistance && dist < 3.0) { // Limit search radius
              minDistance = dist;
              nearestVal = pt.value;
            }
          }
          
          entry[city.name] = nearestVal !== null ? Number(nearestVal.toFixed(1)) : 0;
        });

        return entry;
      });

      setTrendData(formattedTrend);

    } catch (err) {
      console.error("Error loading dashboard details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerForecast = async () => {
    setTriggering(true);
    try {
      await weatherApi.triggerForecast(startDate);
      await loadDashboardData();
    } catch (err) {
      console.error("Error triggering forecast:", err);
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    if (forecastDays.length > 0) {
      loadDashboardData();
    }
  }, [selectedVariable, selectedDateIdx, forecastDays]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      if (forecastDays.length > 0) {
        loadDashboardData();
      }
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, [selectedVariable, selectedDateIdx, forecastDays]);

  const activeVar = variables.find(v => v.id === selectedVariable) || variables[0];

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Climate & Weather Dynamics
            {loading && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
          </h2>
          <p className="text-slate-400 text-sm">
            AI-driven weather forecast model integration powered by NVIDIA FourCastNet.
          </p>
        </div>
        <button
          onClick={handleTriggerForecast}
          disabled={triggering || loading}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/20 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
        >
          {triggering ? '⚡ Simulating Forecast...' : '🔄 Run FourCastNet AI'}
        </button>
      </div>

      {/* Variables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {variables.map(v => {
          const isSelected = selectedVariable === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setSelectedVariable(v.id)}
              className={`glass-card p-5 rounded-2xl text-left border transition-all duration-300 relative overflow-hidden group ${
                isSelected 
                  ? 'border-purple-500/50 bg-purple-950/10 shadow-lg shadow-purple-900/10' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2.5 bg-slate-800/80 rounded-xl group-hover:scale-110 transition-transform duration-200">{v.icon}</span>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">FourCastNet AI</span>
                  <span className="text-sm font-bold text-white mt-0.5 block">{v.name}</span>
                </div>
              </div>
              <div className="absolute right-4 bottom-4 text-xs font-semibold text-slate-500">{v.unit}</div>
            </button>
          );
        })}
      </div>

      {/* Description and AI Commentary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/20 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-1.5">
              <span>ℹ️</span> Description & Dispersion Impact
            </h3>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed">{activeVar.desc}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-slate-900/20 flex flex-col justify-between min-h-[100px]">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <span>🤖</span> NVIDIA AI Forecast Analysis
              </h3>
              {commentarySource && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-500/25">
                  {commentarySource}
                </span>
              )}
            </div>
            {loadingCommentary ? (
              <div className="flex items-center gap-2 mt-3 text-slate-400 text-xs">
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent"></span>
                Generating meteorological insights...
              </div>
            ) : (
              <p className="text-slate-200 text-xs mt-2 leading-relaxed italic">
                "{commentary || 'No AI commentary generated for this variable.'}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date Slider & Controls */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center gap-6 border border-slate-800">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[120px]">Forecast Time</span>
        <div className="flex-1 flex justify-between w-full overflow-x-auto gap-2 py-1">
          {forecastDays.map((d, idx) => {
            const isSelected = selectedDateIdx === idx;
            const parsed = new Date(d);
            const labelDay = parsed.toLocaleDateString('en-IN', { weekday: 'short' });
            const labelDate = parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return (
              <button
                key={d}
                onClick={() => setSelectedDateIdx(idx)}
                className={`px-4 py-2.5 rounded-xl text-center min-w-[90px] border transition-all duration-200 ${
                  isSelected
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/20'
                    : 'bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] font-bold uppercase opacity-80">{labelDay}</div>
                <div className="text-xs font-extrabold mt-0.5">{labelDate}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Map Overlay & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* India 3D Map */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[530px] flex flex-col border border-slate-800">
          <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-sm font-semibold text-slate-300">
              FourCastNet AI Spatial Forecast
            </h3>
            <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
              {activeVar.name} ({activeVar.unit})
            </span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative">
            <IndiaMap
              points={mapPoints}
              dataType="pollutant"
              variableName={activeVar.name}
              unit={activeVar.unit}
            />
          </div>
        </div>

        {/* Stats and 7-day Trend Lines */}
        <div className="space-y-6 flex flex-col">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-4 rounded-xl text-center border border-slate-800/60 bg-slate-900/10">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Min</span>
              <span className="text-lg font-bold text-blue-400 mt-1 block">
                {stats.min.toFixed(1)}{activeVar.unit}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl text-center border border-purple-500/20 bg-purple-950/5">
              <span className="text-[9px] uppercase font-bold text-purple-400 block">Mean</span>
              <span className="text-lg font-bold text-purple-300 mt-1 block">
                {stats.avg.toFixed(1)}{activeVar.unit}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl text-center border border-slate-800/60 bg-slate-900/10">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Max</span>
              <span className="text-lg font-bold text-amber-500 mt-1 block">
                {stats.max.toFixed(1)}{activeVar.unit}
              </span>
            </div>
          </div>

          {/* 7-day Trend Line Chart */}
          <div className="glass-card p-5 rounded-2xl flex-1 flex flex-col justify-between border border-slate-800 min-h-[380px]">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-1.5">
                📈 7-Day Forecasting Trend
              </h3>
              <div className="h-[260px] w-full">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                      <YAxis stroke="#64748b" fontSize={9} label={{ value: activeVar.unit, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                        labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                        itemStyle={{ fontSize: 10 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                      <Line type="monotone" dataKey="Delhi" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Mumbai" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Bengaluru" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-3 border border-dashed border-slate-800 rounded-xl">
                    <span className="text-xl">📈</span>
                    <span className="text-[10px] font-medium text-slate-400 mt-1">Loading Trend Data...</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-500 text-center block pt-2 border-t border-slate-800/40">
              Comparing regional forecast trajectories at Delhi, Mumbai & Bengaluru coordinates.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherDashboard;
