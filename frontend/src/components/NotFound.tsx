import React from 'react';

interface NotFoundProps {
  onNavigateHome?: (tab?: string) => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onNavigateHome }) => {
  const handleReturn = (tab: string = 'aqi') => {
    if (onNavigateHome) {
      onNavigateHome(tab);
    } else {
      window.location.hash = tab;
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[75vh] p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 shadow-2xl space-y-6">
        {/* Radar / Satellite Anomaly graphic */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-purple-600/20 animate-ping"></div>
          <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-purple-500/40 flex items-center justify-center text-3xl shadow-inner">
            🛰️
          </div>
          <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold">
            SIGNAL 404
          </div>
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-semibold">
            Telemetry Anomaly • Stratosphere Out of Range
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-1">404 - Coordinate Not Found</h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            The requested atmospheric telemetry or geospatial vector does not exist in the active Indian National Grid registry.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => handleReturn('aqi')}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/20 transition-all cursor-pointer"
          >
            Return to AQI Overview
          </button>
          <button
            onClick={() => handleReturn('hcho')}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            View HCHO Hotspots
          </button>
        </div>

        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
          Need assistance? Review our{' '}
          <button
            onClick={() => handleReturn('reports')}
            className="text-purple-400 hover:underline cursor-pointer"
          >
            Research Reports
          </button>{' '}
          or{' '}
          <button
            onClick={() => handleReturn('privacy')}
            className="text-purple-400 hover:underline cursor-pointer"
          >
            Data Privacy Policy
          </button>.
        </div>
      </div>
    </div>
  );
};

export default NotFound;
