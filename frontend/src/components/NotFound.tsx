import React from 'react';

interface NotFoundProps {
  onNavigateHome?: (tab?: string) => void;
  attemptedRoute?: string;
}

export const NotFound: React.FC<NotFoundProps> = ({ onNavigateHome, attemptedRoute }) => {
  const currentPath = attemptedRoute || (typeof window !== 'undefined' ? window.location.hash.replace(/^#\/?/, '') || window.location.pathname : '');

  const handleReturn = (tab: string = 'aqi') => {
    if (onNavigateHome) {
      onNavigateHome(tab);
    } else {
      window.location.hash = tab;
    }
  };

  const recommendedDestinations = [
    { id: 'aqi', title: 'AQI Overview', icon: '🌍', desc: 'Real-time air quality index & monitoring' },
    { id: 'transport', title: 'Wind & Transport', icon: '💨', desc: 'Real-time ERA5 wind streamlines & vectors' },
    { id: 'weather', title: 'Weather Dynamics', icon: '🌦️', desc: 'Atmospheric boundary layer & forecast' },
    { id: 'hcho', title: 'HCHO Hotspots', icon: '🔥', desc: 'Sentinel-5P formaldehyde plume detection' },
    { id: 'fire', title: 'Fire Correlation', icon: '🛰️', desc: 'Thermal anomalies & stubble burn tracking' },
    { id: 'insights', title: 'AI Insights', icon: '🧠', desc: 'Atmospheric summary & synoptic intel' },
  ];

  return (
    <div className="flex-1 flex items-center justify-center min-h-[78vh] p-4 sm:p-6 lg:p-8 text-center">
      <div className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl glass-card border border-slate-200/90 shadow-lg space-y-6">
        {/* Radar / Satellite Beacon Anomaly Graphic */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-sky-500/15 animate-ping"></div>
          <div className="absolute inset-2 rounded-full border border-sky-400/40 border-dashed animate-spin"></div>
          <div className="w-20 h-20 rounded-full bg-sky-50/90 border border-sky-200 flex items-center justify-center text-3xl shadow-xs">
            🛰️
          </div>
          <div className="absolute -top-1 -right-2 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold shadow-xs">
            SIGNAL 404
          </div>
        </div>

        {/* Status & Diagnostic Information */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-sky-700 font-semibold px-3 py-1 rounded-full bg-sky-50 border border-sky-200 inline-block mb-2">
            Telemetry Anomaly • Subcontinent Grid Vector Missing
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 mt-1">
            404 - Coordinate Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            The requested atmospheric telemetry or geospatial vector{' '}
            {currentPath && (
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-800 text-[11px] border border-slate-200">
                /{currentPath.replace(/^\/+/, '')}
              </code>
            )}{' '}
            does not exist in the active Indian National Grid registry.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => handleReturn('aqi')}
            className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🌍</span>
            <span>Return to AQI Overview</span>
          </button>
          <button
            onClick={() => handleReturn('transport')}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium transition-all hover:border-slate-300 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>💨</span>
            <span>View Wind Streamlines</span>
          </button>
        </div>

        {/* Quick Route Directory Grid */}
        <div className="pt-4 border-t border-slate-100 text-left">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading mb-3 text-center sm:text-left">
            Available Atmospheric Modules
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {recommendedDestinations.map((dest) => (
              <button
                key={dest.id}
                onClick={() => handleReturn(dest.id)}
                className="p-3 rounded-xl bg-white hover:bg-sky-50/60 border border-slate-200/80 hover:border-sky-200 text-left transition-all group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition-transform">{dest.icon}</span>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-sky-800">
                    {dest.title}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                  {dest.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Support & Privacy footer */}
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          Need technical documentation? Access our{' '}
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
            Privacy Policy
          </button>.
        </div>
      </div>
    </div>
  );
};

export default NotFound;
