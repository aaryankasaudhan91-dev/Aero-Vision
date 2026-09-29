import React, { useState } from 'react';
import AeroVisionPipeline3D, { type StationId } from '@/components/ui/aero-pipeline-3d';
import {
  Satellite,
  Layers,
  Cpu,
  Flame,
  FileText,
  Activity,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Info,
  Radio,
  Compass,
  ArrowRight,
  TrendingUp,
  Workflow,
  X,
  Database,
  Sparkles,
  GitBranch,
} from 'lucide-react';

interface StationInfo {
  id: StationId;
  step: number;
  name: string;
  badge: string;
  output: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  sensors: string[];
  algorithm: string;
  deliverables: string[];
  metrics: { label: string; value: string; color: string }[];
  targetTab: string;
  buttonLabel: string;
}

const STATIONS: StationInfo[] = [
  {
    id: 'ground',
    step: 1,
    name: 'Ground Sensors',
    badge: 'CPCB Network',
    output: 'Telemetry Reading',
    icon: <Satellite className="w-5 h-5 text-sky-500" />,
    category: 'Ground CAAQMS Telemetry',
    description:
      'Continuous real-time ingestion from 29 CPCB monitoring stations reporting PM2.5, PM10, NO2, SO2, CO, and O3 criteria pollutants every hour across Delhi and national airsheds.',
    sensors: [
      'CPCB Ground Stations: Hourly PM2.5, PM10 criteria data',
      'Dynamic telemetry from Delhi, Kolkata, Mumbai networks',
      'Continuous sensor calibration and quality assurance',
      'Ground truth validation collocation matrix',
    ],
    algorithm:
      'Real-time ingestion and automated outlier rejection for ground station pollutant concentration streams.',
    deliverables: ['Ingested Raw Telemetry Cache', 'Station Reading Cards', 'Ground Truth Collocation Matrix'],
    metrics: [
      { label: 'Active Network', value: '29 Stations', color: 'text-sky-600' },
      { label: 'Ingest Cadence', value: 'Hourly', color: 'text-emerald-600' },
      { label: 'Target City', value: 'Delhi-NCR', color: 'text-rose-600' },
    ],
    targetTab: 'pollutants',
    buttonLabel: 'Explore Pollutant Maps',
  },
  {
    id: 'satellite',
    step: 2,
    name: 'Satellite',
    badge: 'TROPOMI Orbit',
    output: 'HCHO Grid',
    icon: <Layers className="w-5 h-5 text-indigo-500" />,
    category: 'Sentinel-5P Remote Sensing',
    description:
      'Sentinel-5P TROPOMI formaldehyde (HCHO) total column retrieval, coupled with DBSCAN spatial clustering, Getis-Ord Gi* hot spot analysis, and Local Moran’s I spatial autocorrelation.',
    sensors: [
      'Sentinel-5P TROPOMI: Near-real-time HCHO column pass',
      'DBSCAN Spatial Clustering: active plume clusters',
      'Getis-Ord Gi*: High-confidence z-score hot spot detection',
      'NASA FIRMS: Stubble burning fire radiative power',
    ],
    algorithm:
      'HCHO column density extraction; spatial clustering of active biomass burning plumes across the Indo-Gangetic Plain.',
    deliverables: ['TROPOMI HCHO Column Grid', 'DBSCAN Hotspot Clusters', 'Fire Radiance Correlation Map'],
    metrics: [
      { label: 'Z-Score (Gi*)', value: 'z = 3.2', color: 'text-amber-600' },
      { label: 'Active Clusters', value: '4 Regions', color: 'text-rose-600' },
      { label: 'Moran’s I', value: '0.41', color: 'text-indigo-600' },
    ],
    targetTab: 'hcho',
    buttonLabel: 'Open HCHO Hotspots',
  },
  {
    id: 'intelligence',
    step: 3,
    name: 'AI Engine',
    badge: 'Deep Forecasting',
    output: 'Atmospheric Forecast',
    icon: <Cpu className="w-5 h-5 text-sky-600" />,
    category: 'Neural Transport & LLM Insights',
    description:
      'High-performance atmospheric modeling pipeline running ECMWF ERA5 wind transport simulations, FourCastNet 7-day weather/pollution forecasts, and Gemini LLM synthesis of daily public insights.',
    sensors: [
      'FourCastNet: 7-day gridded atmospheric prediction',
      'ERA5: 850 hPa wind transport and dispersion vectors',
      'DBSCAN: Real-time HCHO plume trajectory queue',
      'Gemini AI: Automated multimodal atmospheric insight synthesis',
    ],
    algorithm:
      'Deep autoregressive weather models coupled with Lagrangian forward plume trajectories and Gemini generative summaries.',
    deliverables: ['7-Day FourCastNet Grids', 'Dispersion Vectors', 'Gemini AI Intelligence Briefs'],
    metrics: [
      { label: 'Forecast Horizon', value: '7-Day Grid', color: 'text-sky-600' },
      { label: 'Model Queue', value: '3 / 8 Running', color: 'text-amber-600' },
      { label: 'AI Synthesis', value: 'Gemini Live', color: 'text-emerald-600' },
    ],
    targetTab: 'insights',
    buttonLabel: 'View AI Insights',
  },
  {
    id: 'dashboard',
    step: 4,
    name: 'Dashboard',
    badge: 'Live Geospatial',
    output: 'Interactive Live Map',
    icon: <Flame className="w-5 h-5 text-amber-500" />,
    category: 'Geospatial Analytics & Alerts',
    description:
      'Interactive 2D and 3D geospatial visualization suite with Inverse Distance Weighting (IDW) surface interpolation, animated wind streamlines, NASA FIRMS fire correlation, and automated alert cards.',
    sensors: [
      '2D & 3D WebGL Leaflet Maps with India boundaries',
      'Inverse Distance Weighting (IDW) surface interpolation',
      'Dynamic animated wind vector streamlines',
      'Automated HCHO & particulate threshold alert cards',
    ],
    algorithm:
      'Spatial IDW surface rendering with real-time vector particle wind streamlines and fire-pollution correlation overlay.',
    deliverables: ['Interactive AQI & Pollutant Maps', 'Wind Streamline Layers', 'Floating Early-Warning Cards'],
    metrics: [
      { label: 'Map Surfaces', value: '2D / 3D WebGL', color: 'text-sky-600' },
      { label: 'Streamlines', value: 'Dynamic ERA5', color: 'text-indigo-600' },
      { label: 'Active Alerts', value: '1 Severe', color: 'text-rose-600' },
    ],
    targetTab: 'aqi',
    buttonLabel: 'Open AQI Overview',
  },
  {
    id: 'health',
    step: 5,
    name: 'Health Impact',
    badge: 'Policy & Advisories',
    output: 'Public Advisory & Report',
    icon: <FileText className="w-5 h-5 text-emerald-600" />,
    category: 'Public Health & Governance',
    description:
      'Translates real-time criteria pollution, active fire radiative power, and HCHO columns into a unified 0–100 Exposure Risk Score, vulnerable population advisories (Asthma/COPD), and automated PDF research reports.',
    sensors: [
      '0–100 Multi-Pollutant Exposure Risk Scoring Model',
      'Vulnerable Cohort Early Warning (Asthma, COPD, Elderly)',
      'Automated Official PDF Environmental Research Reports',
      'CPCB NAQI Regulatory Compliance Thresholds',
    ],
    algorithm:
      'Non-linear health risk function integrating PM2.5, HCHO anomalies, and smoke plume exposure into actionable public warnings.',
    deliverables: ['Health Advisory Printouts', '0–100 Risk Score Cards', 'Exportable PDF Policy Bulletins'],
    metrics: [
      { label: 'Risk Score', value: '78 / 100', color: 'text-rose-600' },
      { label: 'Risk Category', value: 'Critical', color: 'text-rose-700' },
      { label: 'Reports Issued', value: 'PDF #001', color: 'text-slate-800' },
    ],
    targetTab: 'health',
    buttonLabel: 'Check Health Impact',
  },
];

interface AgenticFactory3DDemoProps {
  height?: string | number;
  onNavigateTab?: (tab: string) => void;
}

export default function AgenticFactory3DDemo({
  height = 'calc(100vh - 12rem)',
  onNavigateTab,
}: AgenticFactory3DDemoProps) {
  const [activeStationId, setActiveStationId] = useState<StationId>('ground');
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeMode, setActiveMode] = useState<'assembled' | 'cutaway' | 'stations' | 'order'>('assembled');
  const [activeCamera, setActiveCamera] = useState<'overview' | 'side' | 'top' | 'station' | 'flight'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // Sync internal machine state if available
  const handleStationClick = (id: StationId) => {
    setActiveStationId(id);
    const m = window.__aeroPipeline || window.__machine;
    if (m) {
      m.focusStation(id);
    }
  };

  const handleModeChange = (mode: 'assembled' | 'cutaway' | 'stations' | 'order') => {
    setActiveMode(mode);
    const m = window.__aeroPipeline || window.__machine;
    if (m) {
      m.setMode(mode);
    }
  };

  const handleCameraChange = (cam: 'overview' | 'side' | 'top' | 'station' | 'flight') => {
    setActiveCamera(cam);
    const m = window.__aeroPipeline || window.__machine;
    if (m) {
      m.setCamera(cam);
    }
  };

  const togglePlay = () => {
    const m = window.__aeroPipeline || window.__machine;
    if (isPlaying) {
      m?.pause();
      setIsPlaying(false);
    } else {
      m?.play();
      setIsPlaying(true);
    }
  };

  const activeStation = STATIONS.find((s) => s.id === activeStationId) || STATIONS[0];

  const navigateTo = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      window.location.hash = tab;
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto animate-fade-in font-sans">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900">
              Agentic Factory 3D
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
              Digital Twin v1.0
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1 max-w-3xl">
            Autonomous 3D Atmospheric Intelligence Pipeline simulating the complete ISRO SAC & CPCB satellite remote
            sensing, CNN-LSTM neural estimation, and national air quality dispatch workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWorkflowModal(true)}
            className="glass-panel px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50/90 hover:bg-sky-100 border border-sky-200/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <Workflow className="w-3.5 h-3.5 text-sky-600" />
            3D Pipeline Workflow Guide
          </button>
          <span className="glass-panel px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 border border-slate-200 shadow-2xs flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            ISRO SAC · CPCB Pipeline Active
          </span>
          <span className="glass-panel px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 border border-slate-200 shadow-2xs">
            Orbit: CYCLE 001
          </span>
        </div>
      </div>

      {/* 2. Top 4 High-Precision Pipeline KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-1000">
        {/* Metric 1 */}
        <div className="glass-card card-3d p-4 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-heading">
              Sensor Ingestion
            </span>
            <Satellite className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900 font-heading tracking-tight">5 Feeds</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Real-time
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            INSAT-3D, TROPOMI S5P, CPCB API, FIRMS, ERA5
          </p>
        </div>

        {/* Metric 2 */}
        <div className="glass-card card-3d p-4 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 font-heading">
              Spatial Harmonization
            </span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-indigo-900 font-heading tracking-tight">0.1° × 0.1°</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              NetCDF4
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Xarray regridded · Cloud mask &lt; 0.30 · QA &gt; 0.75
          </p>
        </div>

        {/* Metric 3 */}
        <div className="glass-card card-3d p-4 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 font-heading">
              Deep Learning Model
            </span>
            <Cpu className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-teal-800 font-heading tracking-tight">R = 0.89</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              Pearson
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Val RMSE: 11.2 µg/m³ · 2D-CNN + Temporal LSTM
          </p>
        </div>

        {/* Metric 4 */}
        <div className="glass-card card-3d p-4 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 font-heading">
              Hotspots & NAQI Status
            </span>
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-rose-600 font-heading tracking-tight">AQI 294</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Poor / Severe
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            DBSCAN Plume #04 · Stubble smoke lag +1D transport
          </p>
        </div>
      </div>

      {/* 3. Interactive 5-Stage Workflow Pipeline Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-500" />
            End-To-End Atmospheric Processing Workflow (Click station to focus 3D camera)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Active: <strong className="text-sky-700">{activeStation.name}</strong> (Step {activeStation.step} of 5)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {STATIONS.map((station) => {
            const isActive = station.id === activeStationId;
            return (
              <button
                key={station.id}
                onClick={() => handleStationClick(station.id)}
                className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-sky-50/90 border-sky-500/80 shadow-xs ring-2 ring-sky-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-sky-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {station.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-sky-600">0{station.step}</span>
                    <h4 className="text-xs font-heading font-bold text-slate-900 truncate">{station.name}</h4>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">{station.output}</span>
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-sky-500 absolute right-2.5 top-2.5 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Centerpiece 3D Canvas Viewport in Modern Studio Housing */}
      <div
        style={!isFullscreen && height ? { height } : undefined}
        className={`rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden bg-slate-950 relative transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'h-[640px] md:h-[720px] w-full min-h-[580px]'
        }`}
      >
        {/* Floating Top Control HUD */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Left HUD: Mode Switcher */}
          <div className="pointer-events-auto flex items-center gap-1 p-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-lg">
            {(['assembled', 'cutaway', 'stations', 'order'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${
                  activeMode === m
                    ? 'bg-sky-500 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {m === 'order' ? 'Pipeline Run' : m}
              </button>
            ))}
          </div>

          {/* Right HUD: Camera Presets & Actions */}
          <div className="pointer-events-auto flex items-center gap-1 p-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-lg">
            {(['overview', 'side', 'top', 'station', 'flight'] as const).map((c) => (
              <button
                key={c}
                onClick={() => handleCameraChange(c)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${
                  activeCamera === c
                    ? 'bg-slate-700 text-sky-400 font-semibold shadow-2xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}

            <div className="w-px h-4 bg-slate-700 mx-1" />

            <button
              onClick={togglePlay}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 3D Scene Viewport */}
        <AeroVisionPipeline3D
          height="100%"
          className="w-full h-full"
          onStation={(id) => setActiveStationId(id)}
        />
      </div>

      {/* 5. Detailed Station Workflow Inspector Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-600 shadow-xs">
              {activeStation.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-sky-600">STATION 0{activeStation.step}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                  {activeStation.category}
                </span>
              </div>
              <h3 className="text-xl font-heading font-extrabold text-slate-900 mt-0.5">
                {activeStation.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleModeChange('order')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Trace Single Packet Run
            </button>
            <button
              onClick={() => navigateTo(activeStation.targetTab)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {activeStation.buttonLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Station Scientific Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          {/* Column 1: Methodology & Description */}
          <div className="space-y-3">
            <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-500" />
              Scientific Purpose & Methodology
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
              {activeStation.description}
            </p>

            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Mathematical Algorithm:</span>
              <p className="text-[11px] text-slate-600 font-mono leading-relaxed">{activeStation.algorithm}</p>
            </div>
          </div>

          {/* Column 2: Ingestion Feeds & Sensors */}
          <div className="space-y-3">
            <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Satellite className="w-4 h-4 text-sky-500" />
              Ingestion Streams & Parameters
            </h4>
            <ul className="space-y-2">
              {activeStation.sensors.map((sensor, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{sensor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Outputs & Live Metrics */}
          <div className="space-y-3">
            <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              Station Artifacts & Telemetry
            </h4>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              {activeStation.metrics.map((m, idx) => (
                <div key={idx} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 text-center">
                  <span className="text-[10px] text-slate-500 block truncate">{m.label}</span>
                  <span className={`text-sm font-extrabold font-heading ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Output Deliverables */}
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 block">Deliverable Artifacts:</span>
              {activeStation.deliverables.map((deliv, idx) => (
                <div key={idx} className="text-xs text-slate-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  {deliv}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Comprehensive 3D Model Workflow Guide Modal */}
      {showWorkflowModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowWorkflowModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 md:p-8 space-y-6 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                  <h3 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900">
                    AeroVision 3D Digital Twin Workflow
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                    ISRO SAC & CPCB Pipeline
                  </span>
                </div>
                <p className="text-slate-500 text-xs md:text-sm mt-1">
                  How real-world satellite telemetry, deep learning, and spatial clustering execute inside the interactive 3D machine.
                </p>
              </div>
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Flowchart Summary */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-sky-400" />
                  Continuous Conveyor Data Lifecycle
                </span>
                <span className="text-[10px] font-mono text-slate-400">5-Stage Autonomous Loop</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs font-medium">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-mono text-sky-400">01 GROUND</div>
                  <div className="font-bold mt-0.5">Sensor Reading</div>
                  <div className="text-[9px] text-slate-400 mt-1">29 CPCB Stations</div>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-mono text-indigo-400">02 SATELLITE</div>
                  <div className="font-bold mt-0.5">HCHO Grid</div>
                  <div className="text-[9px] text-slate-400 mt-1">Sentinel-5P TROPOMI</div>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-mono text-sky-400">03 AI ENGINE</div>
                  <div className="font-bold mt-0.5">ERA5 & Models</div>
                  <div className="text-[9px] text-slate-400 mt-1">FourCastNet + Gemini</div>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-mono text-amber-400">04 DASHBOARD</div>
                  <div className="font-bold mt-0.5">Live Map</div>
                  <div className="text-[9px] text-slate-400 mt-1">IDW & Streamlines</div>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <div className="text-[10px] font-mono text-emerald-400">05 HEALTH</div>
                  <div className="font-bold mt-0.5">Risk Advisory</div>
                  <div className="text-[9px] text-slate-400 mt-1">0–100 Score & Reports</div>
                </div>
              </div>
            </div>

            {/* Detailed 5-Stage Scientific Breakdown */}
            <div className="space-y-4">
              <h4 className="text-sm font-heading font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-sky-500" />
                Pipeline Stations & Physical 3D Machine Mechanics
              </h4>

              {STATIONS.map((station) => (
                <div
                  key={station.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                        {station.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-sky-600">STAGE 0{station.step}</span>
                          <h5 className="text-sm font-heading font-bold text-slate-900">{station.name}</h5>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold">
                            {station.badge}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">{station.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleStationClick(station.id);
                          setShowWorkflowModal(false);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 hover:border-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-sky-500" />
                        Focus in 3D
                      </button>
                      <button
                        onClick={() => {
                          setShowWorkflowModal(false);
                          navigateTo(station.targetTab);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Module
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{station.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200/70">
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Operational Sensors & Inputs:</span>
                      <ul className="space-y-1 text-slate-600 text-[11px]">
                        {station.sensors.slice(0, 3).map((s, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-sky-500 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Algorithmic Formulation:</span>
                      <p className="text-[11px] font-mono text-slate-600 leading-tight bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {station.algorithm}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 3D Model Twin Interactive Guide */}
            <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 md:p-5 space-y-3">
              <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-600" />
                How the 3D Machine Operates in Real-Time
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                  <strong className="block text-slate-900 mb-1">Animated Spline Conveyor</strong>
                  Transports physical data packets along a closed Bezier curve. Each packet updates its geometry and emission as it passes processing checkpoints.
                </div>
                <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                  <strong className="block text-slate-900 mb-1">Procedural Station Geometries</strong>
                  Includes custom 3D radar dish rotation, laser scanning grids, pulsating server CPU clusters, India geospatial terrain maps, and automated NAQI receipt printers.
                </div>
                <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                  <strong className="block text-slate-900 mb-1">Inspection Modes & Cameras</strong>
                  Switch between Assembled mode, Cutaway (internal x-ray view), Exploded Stations, and 5 cinematic camera angles (Overview, Side, Top-Down, Station, Flight).
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
              >
                Close & Return to 3D Factory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
