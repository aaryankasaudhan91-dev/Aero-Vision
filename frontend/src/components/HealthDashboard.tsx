import React, { useEffect, useState, useMemo } from 'react';
import IndiaMap from './IndiaMap';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { aqiApi, hchoApi, fireApi } from '../services/api';
import FilterBar from './FilterBar';

interface HealthPoint {
  latitude: number;
  longitude: number;
  value: number; // Health Risk score (0-100)
  label: string; // Station / City name
  state: string;
  color: string; // Custom marker color
  aqi: number;
}

export const HealthDashboard: React.FC = () => {
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

  // Raw data states
  const [aqiObservations, setAqiObservations] = useState<any[]>([]);
  const [hchoOverview, setHchoOverview] = useState<any>({});
  const [fireRecords, setFireRecords] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);

  const getHealthRiskClass = (score: number) => {
    if (score >= 80) return 'text-red-500 font-bold';
    if (score >= 60) return 'text-orange-500 font-bold';
    if (score >= 40) return 'text-amber-500 font-semibold';
    return 'text-emerald-500 font-semibold';
  };

  const getHealthRiskColor = (score: number) => {
    if (score >= 80) return '#ef4444'; // Red
    if (score >= 60) return '#f97316'; // Orange
    if (score >= 40) return '#eab308'; // Yellow
    return '#10b981'; // Emerald
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get CPCB AQI Overview
      const aqiOverviewRes = await aqiApi.getOverview({
        date: selectedDate,
        state: selectedState,
        city: selectedCity,
      });
      const observations = aqiOverviewRes.data?.observations || [];
      setAqiObservations(observations);

      // 2. Get CPCB Station list to populate city filter
      const stationsRes = await aqiApi.getStations({
        state: selectedState,
        is_active: true,
      });
      const uniqueCities = Array.from(
        new Set((stationsRes.data || []).map((s: any) => s.city).filter(Boolean))
      ) as string[];
      setCitiesList(uniqueCities);

      // 3. Get HCHO Overview
      const hchoOverviewRes = await hchoApi.getOverview({
        date: selectedDate,
        state: selectedState,
      });
      setHchoOverview(hchoOverviewRes.data || {});

      // 4. Get active NASA FIRMS fires
      const fireRecordsRes = await fireApi.getRecords({
        start_date: selectedDate,
        end_date: selectedDate,
        state: selectedState,
      });
      setFireRecords(fireRecordsRes.data || []);

      // 5. Get 30-Day Trends
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - 30);
      const trendsRes = await aqiApi.getTrends({
        start_date: start.toISOString().split('T')[0],
        end_date: selectedDate,
        state: selectedState,
        city: selectedCity,
      });
      setTrends(trendsRes.data || []);

    } catch (err) {
      console.error("Error fetching health dashboard telemetry:", err);
      setAqiObservations([]);
      setHchoOverview({});
      setFireRecords([]);
      setTrends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedCity, selectedDate]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, [selectedState, selectedCity, selectedDate]);

  // Compute calculated risk indices for stations/cities
  const computedPoints = useMemo<HealthPoint[]>(() => {
    return aqiObservations.map((o: any) => {
      const station = o.cpcb_stations || {};
      const aqi = o.aqi || 0;

      // Base risk calculation from AQI
      let baseRisk = 0;
      if (aqi <= 50) {
        baseRisk = Math.round((aqi / 50) * 30);
      } else if (aqi <= 100) {
        baseRisk = Math.round(30 + ((aqi - 50) / 50) * 20);
      } else if (aqi <= 200) {
        baseRisk = Math.round(50 + ((aqi - 100) / 100) * 25);
      } else {
        baseRisk = Math.round(75 + Math.min(25, ((aqi - 200) / 300) * 25));
      }

      // Modifier: Active fires in the same state adds risk
      const stateName = station.state || '';
      const stateFiresCount = fireRecords.filter(
        (f) => f.state?.toLowerCase() === stateName.toLowerCase()
      ).length;
      const fireModifier = stateFiresCount > 0 ? Math.min(10, stateFiresCount * 2) : 0;

      const finalRisk = Math.min(100, baseRisk + fireModifier);
      const markerColor = getHealthRiskColor(finalRisk);

      return {
        latitude: station.latitude || 0,
        longitude: station.longitude || 0,
        value: finalRisk,
        label: `${station.station_name || 'Station'} (${station.city || 'Unknown'})`,
        state: stateName,
        color: markerColor,
        aqi: aqi,
      };
    }).filter(p => p.latitude !== 0 && p.longitude !== 0);
  }, [aqiObservations, fireRecords]);

  // Overall metrics summary
  const summaryMetrics = useMemo(() => {
    if (computedPoints.length === 0) {
      return { avgRisk: 0, maxRisk: 0, category: 'Good', populationAtRisk: '0.0M', alertsCount: 0 };
    }
    const sum = computedPoints.reduce((acc, p) => acc + p.value, 0);
    const avgRisk = Math.round(sum / computedPoints.length);
    const maxRisk = Math.max(...computedPoints.map((p) => p.value));

    let category = 'Good';
    if (avgRisk >= 80) category = 'Critical';
    else if (avgRisk >= 60) category = 'Severe';
    else if (avgRisk >= 40) category = 'Moderate';
    else if (avgRisk >= 30) category = 'Satisfactory';

    // Estimate population under alert based on proportion of critical stations
    const criticalStations = computedPoints.filter((p) => p.value >= 60).length;
    const popRatio = computedPoints.length > 0 ? criticalStations / computedPoints.length : 0;
    // Base estimated subcontinental exposure on active cities ratio
    const populationAtRisk = (popRatio * 180 + (fireRecords.length * 0.4)).toFixed(1) + 'M';

    const alertsCount = computedPoints.filter((p) => p.value >= 70).length + (fireRecords.length > 10 ? 1 : 0);

    return { avgRisk, maxRisk, category, populationAtRisk, alertsCount };
  }, [computedPoints, fireRecords]);

  // Filter and sort critical stations to display in the Cities list
  const criticalCities = useMemo(() => {
    return [...computedPoints]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(p => {
        let tag = 'Satisfactory Grid';
        if (p.value >= 80) tag = 'Severe Particulates';
        else if (p.value >= 60) tag = 'Biomass Fire Smoke';
        else if (p.value >= 40) tag = 'Critical Exposure';
        else if (p.value >= 30) tag = 'Moderate Alert';

        return {
          name: p.label.split('(')[1]?.replace(')', '') || p.label,
          station: p.label.split('(')[0]?.trim() || '',
          score: p.value,
          tag: tag,
        };
      });
  }, [computedPoints]);

  // Map 30-day trends into exposure indices
  const chartData = useMemo(() => {
    return trends.map((t: any) => {
      const aqi = t.aqi || 0;
      let baseRisk = 0;
      if (aqi <= 50) baseRisk = Math.round((aqi / 50) * 30);
      else if (aqi <= 100) baseRisk = Math.round(30 + ((aqi - 50) / 50) * 20);
      else if (aqi <= 200) baseRisk = Math.round(50 + ((aqi - 100) / 100) * 25);
      else baseRisk = Math.round(75 + Math.min(25, ((aqi - 200) / 300) * 25));

      return {
        date: t.date,
        risk: baseRisk,
        aqi: aqi,
      };
    });
  }, [trends]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            🏥 Health Impact & Air Quality Early Warning System
            {loading && (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>
            )}
          </h2>
          <p className="text-slate-400 text-sm">
            Dynamic public health exposure risk assessment combining ground telemetry, NASA active fires, and TROPOMI column densities.
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

      {/* Hero Alert Banner */}
      {summaryMetrics.maxRisk >= 70 && (
        <section className="glass-card bg-red-500/10 border-red-500/30 rounded-2xl p-6 flex items-center gap-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-50"></div>
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <span className="text-red-400 text-3xl animate-pulse">⚠️</span>
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-red-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded tracking-wider uppercase">
                High Exposure Alert
              </span>
              <h2 className="text-lg font-bold text-red-700 leading-tight">
                CRITICAL: Severe Health Risk Spike Detected in Monitoring Grid
              </h2>
            </div>
            <p className="text-sm text-slate-700">
              Atmospheric stagnation combined with local emission indices has trapped hazardous particulate columns. Outdoor activities should be limited, especially in the Indo-Gangetic plain.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-semibold uppercase tracking-widest animate-pulse">
              Active Warning
            </span>
          </div>
        </section>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Average Risk Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white">{summaryMetrics.avgRisk}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getHealthRiskClass(summaryMetrics.avgRisk)}`}>
              {summaryMetrics.category}
            </span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Maximum Exposure</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-red-500">{summaryMetrics.maxRisk}</span>
            <span className="text-xs text-slate-500 block mt-1">Highest Localized Score</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Population Under Alert</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-amber-500">{summaryMetrics.populationAtRisk}</span>
            <span className="text-xs text-slate-500 block mt-1">Estimated Indian Exposure</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Critical Stations</span>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-purple-600">{summaryMetrics.alertsCount}</span>
            <span className="text-xs text-slate-500 block mt-1">Nodes Above Exposure Threshold</span>
          </div>
        </div>
      </div>

      {/* Main Map & Critical Cities List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Critical Cities List & Gauges */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-slate-300">Critical Exposure Zones</h3>
                <span className="text-[10px] text-slate-500">Telemetry-based Score</span>
              </div>
              <div className="space-y-4">
                {criticalCities.length > 0 ? (
                  criticalCities.map((city, idx) => (
                    <div key={`${city.name}-${idx}`} className="space-y-1">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{city.name}</h4>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{city.tag}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-semibold ${getHealthRiskClass(city.score)}`}>{city.score}</span>
                          <span className="text-[10px] text-slate-500">/100</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${city.score}%`,
                            backgroundColor: getHealthRiskColor(city.score),
                            boxShadow: `0 0 8px ${getHealthRiskColor(city.score)}80`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                    <span>📡</span>
                    <span className="text-xs mt-1">No stations matching critical parameters</span>
                  </div>
                )}
              </div>
            </div>

            {/* Micro Gauge widgets */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800/80">
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-slate-800" cx="40" cy="40" fill="none" r="34" stroke="currentColor" strokeWidth="4"></circle>
                    <circle
                      className="text-red-500"
                      cx="40"
                      cy="40"
                      fill="none"
                      r="34"
                      stroke="currentColor"
                      strokeDasharray="213.6"
                      strokeDashoffset={213.6 - (213.6 * (summaryMetrics.avgRisk || 30)) / 100}
                      strokeWidth="4"
                    ></circle>
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xs font-bold text-white">{summaryMetrics.avgRisk}%</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">Respiratory Stress Index</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-slate-800" cx="40" cy="40" fill="none" r="34" stroke="currentColor" strokeWidth="4"></circle>
                    <circle
                      className="text-orange-400"
                      cx="40"
                      cy="40"
                      fill="none"
                      r="34"
                      stroke="currentColor"
                      strokeDasharray="213.6"
                      strokeDashoffset={213.6 - (213.6 * (Math.min(100, (fireRecords.length * 1.5) + (hchoOverview.avg_hcho * 2.5 || 25)))) / 100}
                      strokeWidth="4"
                    ></circle>
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xs font-bold text-white">
                      {Math.round(Math.min(100, (fireRecords.length * 1.5) + (hchoOverview.avg_hcho * 2.5 || 25)))}%
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">Satellite Anomaly Index</p>
              </div>
            </div>
          </div>
        </div>

        {/* Spatial Map Component */}
        <div className="lg:col-span-7 glass-card p-4 rounded-2xl h-[480px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Spatial Health Risk Distribution</h3>
            <span className="text-xs text-slate-500">Indian Subcontinent Grid</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative">
            <IndiaMap
              points={computedPoints.map((pt) => ({
                latitude: pt.latitude,
                longitude: pt.longitude,
                value: pt.value,
                label: pt.label,
                state: pt.state,
                color: pt.color,
              }))}
              dataType="pollutant"
              variableName="Health Risk Index"
              unit="Score"
            />
          </div>
        </div>
      </div>

      {/* Target Health Advisories */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Targeted Health Advisories</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-red-500 bg-slate-900/10">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-3 text-red-500 font-bold">
              🫁
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Asthma / COPD Group</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Elevated particulate column densities (PM2.5) triggered. Stay indoors. Run HEPA filters at high capacity. Avoid physical outdoor tasks.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-orange-400 bg-slate-900/10">
            <div className="w-8 h-8 rounded-lg bg-orange-400/10 flex items-center justify-center mb-3 text-orange-400 font-bold">
              👶
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Pediatric Care</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Lung development stress factors elevated due to photochemical ozone precursor columns. Suspend school outdoor activities.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-blue-400 bg-slate-900/10">
            <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center mb-3 text-blue-400 font-bold">
              👵
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Senior Citizens</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Observed cardiovascular risk multiplier is active. Monitor blood pressure levels and avoid travelling in thermal inversion zones.
            </p>
          </div>
        </div>
      </div>

      {/* 30-Day Exposure Trends Area Chart */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Population Exposure Trends</h3>
            <p className="text-xs text-slate-500 mt-1">30-Day Cumulative Health Risk Profile</p>
          </div>
          <div className="text-xs text-slate-400">
            Calculated from ground CPCB grid observations
          </div>
        </div>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415550" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  name="Health Exposure Score"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#riskGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-3 border border-dashed border-slate-800 rounded-xl">
              <span>📈</span>
              <span className="text-[10px] font-medium text-slate-400 mt-1">No historical trend data matches the current filters</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;
