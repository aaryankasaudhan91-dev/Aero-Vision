import React, { useEffect, useState } from 'react';
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

  // States for data
  const [metrics, setMetrics] = useState({
    avg_aqi: 0,
    max_aqi: 0,
    min_aqi: 0,
    category: 'N/A',
  });
  const [stations, setStations] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);



  const getAqiClass = (aqi: number) => {
    if (aqi <= 50) return 'aqi-good';
    if (aqi <= 100) return 'aqi-satisfactory';
    if (aqi <= 200) return 'aqi-moderate';
    if (aqi <= 300) return 'aqi-poor';
    if (aqi <= 400) return 'aqi-verypoor';
    return 'aqi-severe';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Overview Metrics
      const overviewRes = await aqiApi.getOverview({
        date: selectedDate,
        state: selectedState,
        city: selectedCity,
      });
      if (overviewRes.data) {
        setMetrics({
          avg_aqi: overviewRes.data.avg_aqi || 0,
          max_aqi: overviewRes.data.max_aqi || 0,
          min_aqi: overviewRes.data.min_aqi || 0,
          category: overviewRes.data.aqi_category || 'N/A',
        });

        // Map observations to flat station structure for Map and Cards
        const mappedStations = (overviewRes.data.observations || []).map((o: any) => ({
          station_id: o.station_id,
          station_name: o.cpcb_stations?.station_name || 'Unknown',
          city: o.cpcb_stations?.city || '',
          state: o.cpcb_stations?.state || '',
          latitude: o.cpcb_stations?.latitude || 0,
          longitude: o.cpcb_stations?.longitude || 0,
          aqi: o.aqi,
        }));
        setStations(mappedStations);
      }

      // 2. Fetch list of unique cities for the selected state to populate dropdown
      const stationsRes = await aqiApi.getStations({
        state: selectedState,
        is_active: true,
      });
      const uniqueCities = Array.from(
        new Set((stationsRes.data || []).map((s: any) => s.city).filter(Boolean))
      ) as string[];
      setCitiesList(uniqueCities);

      // 3. Get Trends
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - 7);
      const trendsRes = await aqiApi.getTrends({
        start_date: start.toISOString().split('T')[0],
        end_date: selectedDate,
        state: selectedState,
        city: selectedCity,
      });
      setTrends(trendsRes.data || []);

      // 4. Get Predictions
      await aqiApi.getPredictions({
        date: selectedDate,
        state: selectedState,
      });

    } catch (err: any) {
      console.error("Error fetching AQI dashboard data:", err);
      setStations([]);
      setTrends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedCity, selectedDate]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            National AQI Overview
            {loading && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
          </h2>
          <p className="text-slate-400 text-sm">
            Real-time CPCB ground monitoring and hybrid estimation.
          </p>
        </div>
      </div>

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

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Average AQI</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white">{metrics.avg_aqi}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getAqiClass(metrics.avg_aqi)}`}>
              {metrics.category}
            </span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Maximum AQI</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-red-400">{metrics.max_aqi}</span>
            <span className="text-xs text-slate-500 block mt-1">Severe Spike Risk</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Minimum AQI</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-emerald-400">{metrics.min_aqi}</span>
            <span className="text-xs text-slate-500 block mt-1">Clean Air Pockets</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Monitored Stations</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-purple-400">{stations.length}</span>
            <span className="text-xs text-slate-500 block mt-1">Active CPCB Nodes</span>
          </div>
        </div>
      </div>

      {/* Main Map & Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Panel */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Spatial AQI Distribution</h3>
            <span className="text-xs text-slate-500">Ground Sensors</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative">
            <IndiaMap
              points={stations.map((stn) => ({
                latitude: stn.latitude,
                longitude: stn.longitude,
                value: stn.aqi || 0,
                label: stn.station_name,
                state: stn.state || '',
              }))}
              dataType="aqi"
            />
          </div>
        </div>

        {/* Side Panel: Trends & Predictions */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[500px]">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Historical AQI Trend</h3>
            <div className="h-[180px]">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area type="monotone" dataKey="aqi" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#aqiGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-3 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-xl">📈</span>
                  <span className="text-[10px] font-medium text-slate-400 mt-1">No Trend Data Available</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">AQI Category Distribution</h3>
            <div className="h-[180px]">
              {stations && stations.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Good', count: stations.filter(s => (s.aqi || 0) <= 50).length },
                    { name: 'Satis.', count: stations.filter(s => (s.aqi || 0) > 50 && (s.aqi || 0) <= 100).length },
                    { name: 'Mod.', count: stations.filter(s => (s.aqi || 0) > 100 && (s.aqi || 0) <= 200).length },
                    { name: 'Poor', count: stations.filter(s => (s.aqi || 0) > 200).length }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6">
                      <Cell fill="#009966" />
                      <Cell fill="#58B453" />
                      <Cell fill="#FFDE33" />
                      <Cell fill="#FF9933" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-3 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-xl">📊</span>
                  <span className="text-[10px] font-medium text-slate-400 mt-1">No Station Data for Distribution</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AqiDashboard;
