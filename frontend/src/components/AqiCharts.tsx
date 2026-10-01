import React from 'react';
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
  Cell,
} from 'recharts';

interface AqiChartsProps {
  trends: any[];
  stations: any[];
}

export const AqiCharts: React.FC<AqiChartsProps> = ({ trends, stations }) => {
  return (
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
  );
};

export default AqiCharts;
