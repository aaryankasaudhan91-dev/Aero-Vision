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
      <div className="max-w-md w-full p-8 rounded-3xl glass-card border border-slate-200/90 shadow-lg space-y-6">
        {/* Radar / Satellite Anomaly graphic */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-sky-500/10 animate-ping"></div>
          <div className="w-20 h-20 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-3xl shadow-xs">
            🛰️
          </div>
          <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold">
            SIGNAL 404
          </div>
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-sky-700 font-semibold">
            Telemetry Anomaly • Stratosphere Out of Range
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900 mt-1">
            404 - Coordinate Not Found
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The requested atmospheric telemetry or geospatial vector does not exist in the active Indian National Grid registry.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => handleReturn('aqi')}
            className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            Return to AQI Overview
          </button>
          <button
            onClick={() => handleReturn('hcho')}
            className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            View HCHO Hotspots
          </button>
        </div>

        <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-100">
          Need assistance? Review our{' '}
          <button
            onClick={() => handleReturn('reports')}
            className="text-sky-700 hover:underline cursor-pointer font-medium"
          >
            Research Reports
          </button>{' '}
          or{' '}
          <button
            onClick={() => handleReturn('privacy')}
            className="text-sky-700 hover:underline cursor-pointer font-medium"
          >
            Data Privacy Policy
          </button>.
        </div>
      </div>
    </div>
  );
};

export default NotFound;
