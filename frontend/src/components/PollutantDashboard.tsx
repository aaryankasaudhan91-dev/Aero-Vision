import React, { useEffect, useState } from 'react';
import IndiaMap from './IndiaMap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { aqiApi } from '../services/api';
import FilterBar from './FilterBar';

export const PollutantDashboard: React.FC = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getYesterdayString());
  const [selectedPollutant, setSelectedPollutant] = useState('PM2.5');
  const [loading, setLoading] = useState(false);

  const [dataList, setDataList] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);

  // Standards (CPCB NAQI 24-hr limit)
  const standards: Record<string, number> = {
    'PM2.5': 60,
    'PM10': 100,
    'NO2': 80,
    'SO2': 80,
    'CO': 2, // 8-hour limit mg/m³
    'O3': 100, // 8-hour limit
  };

  const getPollutantColor = (val: number, pol: string) => {
    const limit = standards[pol] || 100;
    if (val <= limit * 0.5) return '#10b981'; // Good/Satisfactory
    if (val <= limit) return '#fbbf24'; // Moderate
    return '#ef4444'; // Exceeds limit
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await aqiApi.getObservations({
        start_date: selectedDate,
        end_date: selectedDate,
        state: selectedState,
        city: selectedCity,
        limit: 100,
      });

      const items = res.data || [];
      setDataList(items);

      // Fetch list of unique cities for the selected state to populate dropdown
      const stationsRes = await aqiApi.getStations({
        state: selectedState,
        is_active: true,
      });
      const uniqueCities = Array.from(
        new Set((stationsRes.data || []).map((s: any) => s.city).filter(Boolean))
      ) as string[];
      setCitiesList(uniqueCities);

      // Extract pollutant value and sort for ranking
      const key = selectedPollutant.toLowerCase().replace('.', '');
      const ranked = items
        .map((item: any) => ({
          name: item.cpcb_stations?.station_name || 'Station',
          value: parseFloat(item[key]) || 0,
        }))
        .filter((item: any) => item.value > 0)
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 10);

      setRanking(ranked);
    } catch (err) {
      console.error("Error fetching pollutant data:", err);
      setDataList([]);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedCity, selectedDate, selectedPollutant]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Target Pollutant Distributions
          {loading && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
        </h2>
        <p className="text-slate-400 text-sm">
          Granular spatial monitoring and regulatory standards comparison.
        </p>
      </div>

      <FilterBar
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        cities={citiesList}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        pollutants={['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3']}
        selectedPollutant={selectedPollutant}
        setSelectedPollutant={setSelectedPollutant}
        onRefresh={fetchData}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spatial Map */}
        <div className="lg:col-span-2 glass-card p-4 rounded-2xl h-[520px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              {selectedPollutant} Concentration Map
            </h3>
            <span className="text-xs text-slate-500">
              CPCB Standard: {standards[selectedPollutant]} {selectedPollutant === 'CO' ? 'mg/m³' : 'μg/m³'}
            </span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative">
            <IndiaMap
              points={dataList
                .map((item: any) => {
                  const lat = item.cpcb_stations?.latitude;
                  const lon = item.cpcb_stations?.longitude;
                  if (!lat || !lon) return null;
                  const k = selectedPollutant.toLowerCase().replace('.', '');
                  return {
                    latitude: lat,
                    longitude: lon,
                    value: parseFloat(item[k]) || 0,
                    label: item.cpcb_stations?.station_name || 'Station',
                    state: item.cpcb_stations?.state || '',
                  };
                })
                .filter(Boolean) as any[]}
              dataType="pollutant"
              pollutantName={selectedPollutant}
            />
          </div>
        </div>

        {/* Top 10 Polluted Stations Chart */}
        <div className="glass-card p-5 rounded-2xl h-[520px] flex flex-col justify-between">
          <div className="h-full flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              Top 10 Hotspots ({selectedPollutant})
            </h3>
            <div className="flex-1 h-[400px]">
              {ranking && ranking.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={8} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <ReferenceLine x={standards[selectedPollutant]} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limit', fill: '#ef4444', fontSize: 10 }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      {ranking.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getPollutantColor(entry.value, selectedPollutant)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-6 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-2xl mb-2">📊</span>
                  <span className="text-xs font-medium text-slate-400">No Hotspot Data Available</span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">No active stations exceeded the standard metrics or reported observations for this pollutant on this date.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PollutantDashboard;
