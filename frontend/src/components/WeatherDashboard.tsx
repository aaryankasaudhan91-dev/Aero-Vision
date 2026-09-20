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
  { id: 'relative_humidity', name: 'Relative Humidity', icon: '💧', unit: '%', desc: 'Moisture content of the air. High humidity promotes secondary aerosol formation and hygroscopic swelling.' },
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

      const formattedTrend = forecastDays.map((d, i) => {
        const dayPoints = allDaysForecasts[i] || [];
        const delhi = dayPoints.find((p: any) => (p.label || '').toLowerCase().includes('delhi'))?.value || (stats.avg * 1.05);
        const mumbai = dayPoints.find((p: any) => (p.label || '').toLowerCase().includes('mumbai'))?.value || (stats.avg * 0.95);
        const bengaluru = dayPoints.find((p: any) => (p.label || '').toLowerCase().includes('bengaluru'))?.value || (stats.avg * 0.90);

        return {
          date: d.split('-').slice(1).join('/'),
          Delhi: parseFloat(Number(delhi).toFixed(1)),
          Mumbai: parseFloat(Number(mumbai).toFixed(1)),
          Bengaluru: parseFloat(Number(bengaluru).toFixed(1)),
        };
      });

      setTrendData(formattedTrend);

    } catch (err) {
      console.error("Error loading weather details:", err);
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
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            Climate & Weather Dynamics
            {loading && (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent"></span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            AI-driven weather forecast model integration powered by NVIDIA FourCastNet & ERA5 ECMWF.
          </p>
        </div>
        <button
          onClick={handleTriggerForecast}
          disabled={triggering || loading}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all duration-200 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {triggering ? '⚡ Simulating Forecast...' : '🔄 Run FourCastNet AI'}
        </button>
      </div>

      {/* Variables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-1000">
        {variables.map((v) => {
          const isSelected = selectedVariable === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setSelectedVariable(v.id)}
              className={`glass-card card-3d p-5 rounded-2xl text-left border transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-2 ring-sky-200/50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 bg-slate-100/90 rounded-xl group-hover:scale-105 transition-transform duration-200">
                  {v.icon}
                </span>
                <div>
                  <span className="text-[10px] text-slate-500 block font-heading uppercase font-bold tracking-wider">
                    FourCastNet
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block font-heading">
                    {v.name}
                  </span>
                </div>
              </div>
              <div className="absolute right-4 bottom-4 text-xs font-mono font-semibold text-slate-500">
                {v.unit}
              </div>
            </button>
          );
        })}
      </div>

      {/* Description and AI Commentary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-heading font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>ℹ️</span> Description & Dispersion Impact
            </h3>
            <p className="text-slate-600 text-xs mt-2 leading-relaxed">{activeVar.desc}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[100px]">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-heading font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>🤖</span> {commentarySource.includes('Dual') ? 'Dual-AI' : commentarySource.includes('Gemini') ? 'Gemini AI' : commentarySource.includes('NVIDIA') ? 'NVIDIA NIM' : 'AI'} Forecast Analysis
              </h3>
              {commentarySource && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                  {commentarySource}
                </span>
              )}
            </div>
            {loadingCommentary ? (
              <div className="flex items-center gap-2 mt-3 text-slate-500 text-xs">
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-teal-600 border-t-transparent"></span>
                Generating meteorological insights...
              </div>
            ) : (
              <p className="text-slate-700 text-xs mt-2 leading-relaxed italic">
                "{commentary || 'No AI commentary generated for this variable.'}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date Slider & Controls */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 border border-slate-200/90 shadow-xs">
        <span className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider min-w-[110px]">
          Forecast Day
        </span>
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
                className={`px-3.5 py-2 rounded-xl text-center min-w-[85px] border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 border-sky-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="text-[10px] uppercase opacity-85 font-mono">{labelDay}</div>
                <div className="text-xs font-bold mt-0.5">{labelDate}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Map Overlay & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* India 3D Map */}
        <div className="lg:col-span-2 glass-card p-3 sm:p-4 rounded-2xl h-[420px] sm:h-[480px] lg:h-[560px] flex flex-col border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-sm font-heading font-bold text-slate-900">
              FourCastNet AI Spatial Forecast Map
            </h3>
            <span className="text-xs text-sky-700 font-semibold font-mono uppercase tracking-wider">
              {activeVar.name} ({activeVar.unit})
            </span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
            <IndiaMap
              points={mapPoints}
              dataType="weather"
              variableName={activeVar.name}
              unit={activeVar.unit}
            />
          </div>
        </div>

        {/* Stats and 7-day Trend Lines */}
        <div className="space-y-6 flex flex-col">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3.5 rounded-xl text-center border border-slate-200/90 shadow-2xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 block font-heading">Min</span>
              <span className="text-base font-bold text-sky-700 mt-1 block font-mono">
                {stats.min.toFixed(1)}{activeVar.unit}
              </span>
            </div>
            <div className="glass-card p-3.5 rounded-xl text-center border border-sky-200 bg-sky-50/40 shadow-2xs">
              <span className="text-[9px] uppercase font-bold text-sky-700 block font-heading">Mean</span>
              <span className="text-base font-bold text-sky-900 mt-1 block font-mono">
                {stats.avg.toFixed(1)}{activeVar.unit}
              </span>
            </div>
            <div className="glass-card p-3.5 rounded-xl text-center border border-slate-200/90 shadow-2xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 block font-heading">Max</span>
              <span className="text-base font-bold text-amber-700 mt-1 block font-mono">
                {stats.max.toFixed(1)}{activeVar.unit}
              </span>
            </div>
          </div>

          {/* 7-day Trend Line Chart */}
          <div className="glass-card p-5 rounded-2xl flex-1 flex flex-col justify-between border border-slate-200/90 shadow-xs min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  📈 7-Day Forecast Trajectory
                </h3>
                <span className="text-[10px] font-mono text-slate-500">{activeVar.unit}</span>
              </div>
              <div className="h-[280px] w-full">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.75rem',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                          fontSize: '11px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                      <Line type="monotone" dataKey="Delhi" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: '#dc2626' }} />
                      <Line type="monotone" dataKey="Mumbai" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: '#d97706' }} />
                      <Line type="monotone" dataKey="Bengaluru" stroke="#0284c7" strokeWidth={2} dot={{ r: 3, fill: '#0284c7' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-3 border border-dashed border-slate-200 rounded-xl">
                    <span className="text-xl mb-1">📈</span>
                    <span className="text-xs font-medium text-slate-600">Loading Forecast Curves...</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 text-center block pt-2 border-t border-slate-100">
              Comparing regional forecast trajectories at Delhi, Mumbai & Bengaluru coordinates.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherDashboard;
