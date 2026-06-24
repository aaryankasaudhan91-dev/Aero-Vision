import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AqiDashboard from './components/AqiDashboard';
import PollutantDashboard from './components/PollutantDashboard';
import HchoDashboard from './components/HchoDashboard';
import FireDashboard from './components/FireDashboard';
import TransportDashboard from './components/TransportDashboard';
import InsightsDashboard from './components/InsightsDashboard';
import ReportsDashboard from './components/ReportsDashboard';
import WeatherDashboard from './components/WeatherDashboard';
import HealthDashboard from './components/HealthDashboard';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('aqi');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [latency, setLatency] = useState(12);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncText, setSyncText] = useState('Just Now');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Listen for global api latency events
  useEffect(() => {
    const handleLatency = (e: Event) => {
      const duration = (e as CustomEvent).detail.duration;
      setLatency(duration);
      setLastSync(new Date());
    };
    window.addEventListener('api-latency', handleLatency);
    return () => {
      window.removeEventListener('api-latency', handleLatency);
    };
  }, []);

  // Update last sync elapsed text every second
  useEffect(() => {
    const interval = setInterval(() => {
      const diffSeconds = Math.floor((Date.now() - lastSync.getTime()) / 1000);
      if (diffSeconds < 5) {
        setSyncText('Just Now');
      } else if (diffSeconds < 60) {
        setSyncText(`${diffSeconds}s ago`);
      } else {
        const diffMinutes = Math.floor(diffSeconds / 60);
        const remSeconds = diffSeconds % 60;
        setSyncText(`${diffMinutes}m ${remSeconds}s ago`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSync]);

  // Dispatch auto-refresh events periodically
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      window.dispatchEvent(new Event('refresh-active-dashboard'));
    }, 15000); // 15 seconds auto-refresh interval
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const renderContent = () => {
    switch (activeTab) {
      case 'aqi':
        return <AqiDashboard />;
      case 'pollutants':
        return <PollutantDashboard />;
      case 'health':
        return <HealthDashboard />;
      case 'hcho':
        return <HchoDashboard />;
      case 'fire':
        return <FireDashboard />;
      case 'transport':
        return <TransportDashboard />;
      case 'weather':
        return <WeatherDashboard />;
      case 'insights':
        return <InsightsDashboard />;
      case 'reports':
        return <ReportsDashboard />;
      default:
        return <AqiDashboard />;
    }
  };

  return (
    <div className="flex bg-[#0b0f19] min-h-screen text-slate-100 font-sans relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} />
      <main className={`flex-1 min-h-screen overflow-x-hidden flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between bg-[#0f172a]/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-3 p-2 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white transition-all duration-150 flex items-center justify-center shadow"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <span className="text-sm font-bold leading-none">{sidebarOpen ? '◀' : '☰'}</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              🇮🇳 India National Grid
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              V1.2.0-Production
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-400 font-medium">
            {/* Auto Refresh Toggler */}
            <div className="flex items-center gap-2 bg-slate-800/20 px-2.5 py-1 rounded-lg border border-slate-750/30">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Auto Refresh</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-7 h-4 rounded-full relative transition-colors duration-200 focus:outline-none ${autoRefresh ? 'bg-purple-600' : 'bg-slate-700'}`}
                title={autoRefresh ? "Disable Real-Time Auto Sync" : "Enable Real-Time Auto Sync"}
              >
                <span className={`block w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${autoRefresh ? 'left-4' : 'left-0.5'}`}></span>
              </button>
              {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>}
            </div>
            <span>|</span>
            <span>Server Latency: <span className="text-emerald-400 font-semibold">{latency}ms</span></span>
            <span>|</span>
            <span>Last Sync: <span className="text-emerald-400 font-semibold">{syncText}</span></span>
          </div>
        </header>

        {/* Dashboard Panels */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
