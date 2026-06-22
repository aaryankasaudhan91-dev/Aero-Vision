import React, { useEffect, useState } from 'react';
import IndiaMap3D from './IndiaMap3D';
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
  const [selectedDate, setSelectedDate] = useState('2026-06-22');
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
        limit: 100,
      });

      const items = res.data || [];
      setDataList(items);

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
      // Fallback
      const key = selectedPollutant.toLowerCase().replace('.', '');
      const mockItems = [
        { id: 1, cpcb_stations: { station_name: 'Anand Vihar, Delhi', latitude: 28.6476, longitude: 77.3158 }, pm25: 180, pm10: 320, no2: 95, so2: 12, co: 4.2, o3: 65 },
        { id: 2, cpcb_stations: { station_name: 'Bandra, Mumbai', latitude: 19.0596, longitude: 72.8295 }, pm25: 42, pm10: 85, no2: 32, so2: 8, co: 1.1, o3: 45 },
        { id: 3, cpcb_stations: { station_name: 'Adyar, Chennai', latitude: 13.0012, longitude: 80.2565 }, pm25: 22, pm10: 48, no2: 18, so2: 5, co: 0.6, o3: 28 },
        { id: 4, cpcb_stations: { station_name: 'Victoria Memorial, Kolkata', latitude: 22.5448, longitude: 88.3426 }, pm25: 65, pm10: 120, no2: 45, so2: 9, co: 1.8, o3: 52 },
      ];
      setDataList(mockItems);
      setRanking(
        mockItems
          .map((item: any) => ({
            name: item.cpcb_stations.station_name,
            value: item[key] || 0,
          }))
          .sort((a, b) => b.value - a.value)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedDate, selectedPollutant]);

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
            <IndiaMap3D
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
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              Top 10 Hotspots ({selectedPollutant})
            </h3>
            <div className="h-[400px]">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PollutantDashboard;
