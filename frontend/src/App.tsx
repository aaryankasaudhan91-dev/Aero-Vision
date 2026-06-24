import { useState } from 'react';
import Sidebar from './components/Sidebar';
import AqiDashboard from './components/AqiDashboard';
import PollutantDashboard from './components/PollutantDashboard';
import HchoDashboard from './components/HchoDashboard';
import FireDashboard from './components/FireDashboard';
import TransportDashboard from './components/TransportDashboard';
import InsightsDashboard from './components/InsightsDashboard';
import ReportsDashboard from './components/ReportsDashboard';
import WeatherDashboard from './components/WeatherDashboard';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('aqi');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'aqi':
        return <AqiDashboard />;
      case 'pollutants':
        return <PollutantDashboard />;
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
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span>Server Latency: <span className="text-emerald-400">12ms</span></span>
            <span>|</span>
            <span>Last Sync: <span className="text-emerald-400">Just Now</span></span>
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
