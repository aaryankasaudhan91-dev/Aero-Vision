import React from 'react';
import appLogo from '../assets/app-logo.webp';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose?: () => void;
  onOpenAlertModal?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  onOpenAlertModal,
}) => {
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 glass-panel border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary Navigation"
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={appLogo}
              alt="AeroVision Satellite Atmospheric Intelligence Platform Logo"
              width="40"
              height="40"
              className="w-10 h-10 object-contain animate-pulse-subtle"
            />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent m-0 leading-none">
                AeroVision
              </h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                Geospatial Intel
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white lg:hidden rounded-lg"
              aria-label="Close sidebar navigation"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary Dashboards Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Analytical Modules
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleNavClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-purple-600/20 border-l-4 border-purple-500 text-purple-200 shadow-md shadow-purple-900/10 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border-l-4 border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-base" aria-hidden="true">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            );
          })}

          {/* Quick CTA inside Sidebar */}
          {onOpenAlertModal && (
            <div className="pt-3 px-1">
              <button
                onClick={onOpenAlertModal}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔔</span>
                <span>Subscribe to Alerts</span>
              </button>
            </div>
          )}

          {/* Secondary Legal & System Nav */}
          <div className="pt-4 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Platform & Governance
          </div>
          <button
            onClick={() => handleNavClick('privacy')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-purple-600/20 text-purple-200 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <span>🛡️</span>
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => handleNavClick('terms')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-purple-600/20 text-purple-200 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            }`}
          >
            <span>📜</span>
            <span>Terms of Service</span>
          </button>
        </nav>

        {/* User / Partner Status Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
              IN
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 leading-none">ISRO SAC & CPCB Grid</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Telemetry Live
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
