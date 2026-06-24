import React from 'react';
import appLogo from '../assets/app-logo.svg';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
}

const tabs = [
  { id: 'aqi', name: 'AQI Overview', icon: '🌍' },
  { id: 'pollutants', name: 'Pollutant Maps', icon: '📊' },
  { id: 'health', name: 'Health Impact', icon: '🏥' },
  { id: 'hcho', name: 'HCHO Hotspots', icon: '🔥' },
  { id: 'fire', name: 'Fire Correlation', icon: '🛰️' },
  { id: 'transport', name: 'Transport Analysis', icon: '💨' },
  { id: 'weather', name: 'Weather Dynamics', icon: '🌦️' },
  { id: 'insights', name: 'AI Insights', icon: '🧠' },
  { id: 'reports', name: 'Research Reports', icon: '📝' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen }) => {
  return (
    <aside className={`w-64 glass-panel border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 transition-transform duration-300 transform ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <img src={appLogo} alt="AeroVision Logo" className="w-10 h-10 object-contain animate-pulse-subtle" />
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent m-0 leading-none">
            AeroVision
          </h1>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            Geospatial Intel
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-purple-600/20 border-l-4 border-purple-500 text-purple-200 shadow-lg shadow-purple-900/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-300">
            IN
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300 leading-none">ISRO SAC Admin</p>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Pipeline Active
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
