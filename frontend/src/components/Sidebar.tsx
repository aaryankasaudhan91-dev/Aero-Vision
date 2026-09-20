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
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/90 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 transform shadow-xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary Navigation"
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={appLogo}
              alt="AeroVision Satellite Atmospheric Intelligence Platform Logo"
              width="36"
              height="36"
              className="w-9 h-9 object-contain"
            />
            <div>
              <h1 className="text-base font-heading font-bold text-slate-900 m-0 leading-none">
                AeroVision
              </h1>
              <span className="text-[10px] text-sky-700 uppercase tracking-widest font-semibold">
                Atmospheric Intel
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden rounded-lg transition-colors"
              aria-label="Close sidebar navigation"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary Dashboards Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" role="navigation">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">
            Analytical Modules
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleNavClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-sky-50/80 border-l-3 border-sky-600 text-sky-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border-l-3 border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-sm" aria-hidden="true">{tab.icon}</span>
                <span className="truncate">{tab.name}</span>
              </button>
            );
          })}

          {/* Quick CTA inside Sidebar */}
          {onOpenAlertModal && (
            <div className="pt-3 px-1">
              <button
                onClick={onOpenAlertModal}
                className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔔</span>
                <span>Subscribe to Alerts</span>
              </button>
            </div>
          )}

          {/* Secondary Legal & System Nav */}
          <div className="pt-4 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">
            Platform & Governance
          </div>
          <button
            onClick={() => handleNavClick('privacy')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-sky-50 text-sky-800 font-semibold'
                : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <span>🛡️</span>
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => handleNavClick('terms')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-sky-50 text-sky-800 font-semibold'
                : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <span>📜</span>
            <span>Terms of Service</span>
          </button>
        </nav>

        {/* User / Partner Status Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200/80 flex items-center justify-center text-xs font-bold text-sky-800">
              IN
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">ISRO SAC & CPCB Grid</p>
              <span className="text-[10px] text-teal-700 flex items-center gap-1 font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                Telemetry Online
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
