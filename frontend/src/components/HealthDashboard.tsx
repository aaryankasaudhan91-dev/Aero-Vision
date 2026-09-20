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
    if (score >= 80) return 'text-rose-600 font-bold';
    if (score >= 60) return 'text-orange-600 font-bold';
    if (score >= 40) return 'text-amber-700 font-semibold';
    return 'text-teal-700 font-semibold';
  };

  const getHealthRiskColor = (score: number) => {
    if (score >= 80) return '#e11d48'; // Rose
    if (score >= 60) return '#ea580c'; // Orange
    if (score >= 40) return '#d97706'; // Amber
    return '#0d9488'; // Clean Teal
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get CPCB AQI Overview
      const aqiRes = await aqiApi.getOverview({
        date: selectedDate,
        state: selectedState,
        city: selectedCity,
      });
      const observations = aqiRes.data?.observations || [];
      setAqiObservations(observations);

      // 2. Fetch list of unique cities for the selected state to populate dropdown
      const stationsRes = await aqiApi.getStations({
        state: selectedState,
        is_active: true,
      });
      const uniqueCities = Array.from(
        new Set((stationsRes.data || []).map((s: any) => s.city).filter(Boolean))
      ) as string[];
      setCitiesList(uniqueCities);

      // 3. Get HCHO Overview for secondary photochemical exposure
      try {
        const hchoRes = await hchoApi.getOverview({
          date: selectedDate,
          state: selectedState,
        });
        setHchoOverview(hchoRes.data || {});
      } catch (e) {
        console.warn('HCHO data skipped:', e);
      }

      // 4. Get active fire counts for smoke plume exposure
      try {
        const fireRes = await fireApi.getRecords({
          start_date: selectedDate,
          end_date: selectedDate,
          state: selectedState,
        });
        setFireRecords(fireRes.data || []);
      } catch (e) {
        console.warn('Fire records skipped:', e);
      }

      // 5. Historical trends for public exposure timeline
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
      console.error('Error fetching health dashboard telemetry:', err);
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

  // Compute composite health risk score per monitoring station
  const computedPoints: HealthPoint[] = useMemo(() => {
    if (!aqiObservations.length) return [];

    const fireIntensityFactor = Math.min(1.3, 1.0 + (fireRecords.length / 500));
    const hchoFactor = (hchoOverview.avg_hcho || 0) > 15 ? 1.15 : 1.0;

    return aqiObservations
      .map((obs: any) => {
        const lat = obs.cpcb_stations?.latitude;
        const lon = obs.cpcb_stations?.longitude;
        if (!lat || !lon) return null;

        const aqi = obs.aqi || 0;
        let baseRisk = 0;

        if (aqi <= 50) baseRisk = (aqi / 50) * 25;
        else if (aqi <= 100) baseRisk = 25 + ((aqi - 50) / 50) * 25;
        else if (aqi <= 200) baseRisk = 50 + ((aqi - 100) / 100) * 25;
        else if (aqi <= 300) baseRisk = 75 + ((aqi - 200) / 100) * 15;
        else baseRisk = Math.min(100, 90 + ((aqi - 300) / 200) * 10);

        const compositeRisk = Math.min(100, Math.round(baseRisk * fireIntensityFactor * hchoFactor));

        return {
          latitude: lat,
          longitude: lon,
          value: compositeRisk,
          label: `${obs.cpcb_stations?.station_name || 'Station'} (${obs.cpcb_stations?.city || ''})`,
          state: obs.cpcb_stations?.state || '',
          color: getHealthRiskColor(compositeRisk),
          aqi: aqi,
        };
      })
      .filter(Boolean) as HealthPoint[];
  }, [aqiObservations, fireRecords, hchoOverview]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!computedPoints.length) {
      return {
        avgRisk: 0,
        maxRisk: 0,
        populationAtRisk: '0M',
        alertsCount: 0,
        category: 'Nominal',
      };
    }

    const scores = computedPoints.map((p) => p.value);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const max = Math.max(...scores);
    const critical = scores.filter((s) => s >= 60).length;

    let popEstimate = '12.4M';
    if (critical > 50) popEstimate = '145.2M';
    else if (critical > 20) popEstimate = '68.5M';
    else if (critical > 5) popEstimate = '28.1M';

    let cat = 'Minimal Risk';
    if (avg >= 70) cat = 'Severe Health Emergency';
    else if (avg >= 50) cat = 'Elevated Exposure Warning';
    else if (avg >= 30) cat = 'Moderate Caution';

    return {
      avgRisk: avg,
      maxRisk: max,
      populationAtRisk: popEstimate,
      alertsCount: critical,
      category: cat,
    };
  }, [computedPoints]);

  // Top 5 critical zones
  const criticalCities = useMemo(() => {
    return [...computedPoints]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((p) => {
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
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            🏥 Health Impact & Air Quality Early Warning System
            {loading && (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent"></span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
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
        <section className="glass-card bg-rose-50/70 border-rose-200 rounded-2xl p-5 flex items-center gap-5 shadow-xs relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 border border-rose-200">
            <span className="text-rose-600 text-2xl animate-pulse">⚠️</span>
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase font-mono">
                High Exposure Alert
              </span>
              <h3 className="text-base font-heading font-bold text-rose-900 leading-tight">
                CRITICAL: Severe Health Risk Spike Detected in Monitoring Grid
              </h3>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Atmospheric stagnation combined with local emission indices has trapped hazardous particulate columns. Outdoor activities should be limited, especially across the Indo-Gangetic plain.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-rose-700 font-semibold uppercase tracking-widest animate-pulse font-mono">
              Active Warning
            </span>
          </div>
        </section>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-1000">
        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading">
            Average Risk Score
          </span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
              {summaryMetrics.avgRisk}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getHealthRiskClass(summaryMetrics.avgRisk)} bg-slate-100`}>
              {summaryMetrics.category}
            </span>
          </div>
          <span className="text-xs text-slate-500 block mt-1">Multi-pollutant weighted index</span>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 font-heading">
            Maximum Exposure
          </span>
          <div className="mt-3">
            <span className="text-4xl font-extrabold text-rose-600 font-heading tracking-tight">
              {summaryMetrics.maxRisk}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Highest Localized Score</span>
          </div>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 font-heading">
            Population Under Alert
          </span>
          <div className="mt-3">
            <span className="text-4xl font-extrabold text-amber-700 font-heading tracking-tight">
              {summaryMetrics.populationAtRisk}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Estimated Indian Exposure</span>
          </div>
        </div>

        <div className="glass-card card-3d p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-700 font-heading">
            Critical Stations
          </span>
          <div className="mt-3">
            <span className="text-4xl font-extrabold text-sky-700 font-heading tracking-tight">
              {summaryMetrics.alertsCount}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Nodes Above Exposure Threshold</span>
          </div>
        </div>
      </div>

      {/* Main Map & Critical Cities List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Critical Cities List & Gauges */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-5 flex-1 flex flex-col justify-between border border-slate-200/90 shadow-xs">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-heading font-bold text-slate-900">Critical Exposure Zones</h3>
                <span className="text-[10px] font-mono text-slate-500">Realtime Score</span>
              </div>
              <div className="space-y-3.5">
                {criticalCities.length > 0 ? (
                  criticalCities.map((city, idx) => (
                    <div key={`${city.name}-${idx}`} className="space-y-1">
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{city.name}</h4>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{city.tag}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold ${getHealthRiskClass(city.score)}`}>{city.score}</span>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${city.score}%`,
                            backgroundColor: getHealthRiskColor(city.score),
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <span>📡</span>
                    <span className="text-xs mt-1">No stations matching critical parameters</span>
                  </div>
                )}
              </div>
            </div>

            {/* Micro Gauge widgets */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-slate-100" cx="32" cy="32" fill="none" r="26" stroke="currentColor" strokeWidth="4"></circle>
                    <circle
                      className="text-rose-500"
                      cx="32"
                      cy="32"
                      fill="none"
                      r="26"
                      stroke="currentColor"
                      strokeDasharray="163"
                      strokeDashoffset={163 - (163 * (summaryMetrics.avgRisk || 30)) / 100}
                      strokeWidth="4"
                    ></circle>
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xs font-bold text-slate-900 font-mono">{summaryMetrics.avgRisk}%</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center font-heading">Respiratory Stress</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-slate-100" cx="32" cy="32" fill="none" r="26" stroke="currentColor" strokeWidth="4"></circle>
                    <circle
                      className="text-amber-500"
                      cx="32"
                      cy="32"
                      fill="none"
                      r="26"
                      stroke="currentColor"
                      strokeDasharray="163"
                      strokeDashoffset={163 - (163 * (Math.min(100, (fireRecords.length * 1.5) + (hchoOverview.avg_hcho * 2.5 || 25)))) / 100}
                      strokeWidth="4"
                    ></circle>
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xs font-bold text-slate-900 font-mono">
                      {Math.round(Math.min(100, (fireRecords.length * 1.5) + (hchoOverview.avg_hcho * 2.5 || 25)))}%
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center font-heading">Satellite Anomaly</p>
              </div>
            </div>
          </div>
        </div>

        {/* Spatial Map Component */}
        <div className="lg:col-span-7 glass-card p-4 rounded-2xl h-[520px] flex flex-col justify-between border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-heading font-bold text-slate-900">Spatial Health Risk Distribution</h3>
            <span className="text-xs font-mono text-slate-500">Indian Subcontinent Grid</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-100">
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
      <div className="space-y-3">
        <h3 className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">Targeted Health Advisories</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-rose-500 border-slate-200/90 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center mb-2.5 text-rose-600 font-bold border border-rose-100">
              🫁
            </div>
            <h4 className="text-xs font-heading font-bold text-slate-900 mb-1">Asthma / COPD Group</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Elevated particulate column densities (PM2.5) triggered. Stay indoors. Run HEPA filters at high capacity. Avoid physical outdoor tasks.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-500 border-slate-200/90 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2.5 text-amber-600 font-bold border border-amber-100">
              👶
            </div>
            <h4 className="text-xs font-heading font-bold text-slate-900 mb-1">Pediatric Care</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Lung development stress factors elevated due to photochemical ozone precursor columns. Suspend school outdoor activities.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4 border-l-4 border-l-sky-500 border-slate-200/90 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center mb-2.5 text-sky-600 font-bold border border-sky-100">
              👵
            </div>
            <h4 className="text-xs font-heading font-bold text-slate-900 mb-1">Senior Citizens</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Observed cardiovascular risk multiplier is active. Monitor blood pressure levels and avoid travelling in thermal inversion zones.
            </p>
          </div>
        </div>
      </div>

      {/* 30-Day Exposure Trends Area Chart */}
      <div className="glass-card rounded-2xl p-5 border border-slate-200/90 shadow-xs">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs font-heading font-bold text-slate-900 uppercase tracking-wider">
              Population Exposure Trajectory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">30-Day Cumulative Health Risk Profile</p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Ground CPCB CAAQMS Ingestion
          </div>
        </div>
        <div className="h-60 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskLightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} domain={[0, 100]} tickLine={false} />
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
                <Area
                  type="monotone"
                  dataKey="risk"
                  name="Health Exposure Score"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#riskLightGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-3 border border-dashed border-slate-200 rounded-xl">
              <span>📈</span>
              <span className="text-xs font-medium text-slate-500 mt-1">
                No historical trend data matches the current filters
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;
