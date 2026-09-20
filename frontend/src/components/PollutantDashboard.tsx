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
    if (val <= limit * 0.5) return '#0d9488'; // Clean Teal
    if (val <= limit) return '#d97706'; // Moderate Amber
    return '#dc2626'; // Exceeds limit (Red)
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
      const rawStations = Array.isArray(stationsRes?.data) ? stationsRes.data : [];
      const uniqueCities = Array.from(
        new Set(rawStations.map((s: any) => s.city).filter(Boolean))
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

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, [selectedState, selectedCity, selectedDate, selectedPollutant]);

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          Target Pollutant Distributions
          {loading && (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent"></span>
          )}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Granular spatial monitoring and regulatory standards comparison across Indian monitoring networks.
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
        {/* Spatial 3D / 2D Map */}
        <div className="lg:col-span-2 glass-card p-3 sm:p-4 rounded-2xl h-[420px] sm:h-[480px] lg:h-[560px] flex flex-col border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-heading font-bold text-slate-900">
              {selectedPollutant} Spatial Concentration Map
            </h3>
            <span className="text-xs font-mono text-slate-500">
              CPCB Standard: {standards[selectedPollutant]} {selectedPollutant === 'CO' ? 'mg/m³' : 'μg/m³'}
            </span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
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
        <div className="glass-card p-4 sm:p-5 rounded-2xl h-auto lg:h-[560px] flex flex-col justify-between border border-slate-200/90 shadow-xs">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                Top 10 Hotspots ({selectedPollutant})
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Highest Values</span>
            </div>

            <div className="flex-1 h-[440px]">
              {ranking && ranking.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={90} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                        fontSize: '11px',
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <ReferenceLine
                      x={standards[selectedPollutant]}
                      stroke="#dc2626"
                      strokeDasharray="3 3"
                      label={{ value: 'Limit', fill: '#dc2626', fontSize: 10, position: 'top' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {ranking.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getPollutantColor(entry.value, selectedPollutant)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-2xl mb-2">📊</span>
                  <span className="text-xs font-medium text-slate-600">No Hotspot Data Available</span>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                    No active stations exceeded standard metrics or reported readings for this pollutant on this date.
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

export default PollutantDashboard;
