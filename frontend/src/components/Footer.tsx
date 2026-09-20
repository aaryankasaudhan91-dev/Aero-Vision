import React from 'react';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleOpenCookies = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <footer className="mt-16 border-t border-slate-200/90 bg-white/80 backdrop-blur-md text-slate-600 text-xs shadow-2xs">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛰️</span>
              <span className="text-sm font-heading font-bold text-slate-900 tracking-wide">Project AeroVision</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              National-Scale Geospatial Atmospheric Telemetry & Surface AQI Prediction Platform over India. Ingesting Sentinel-5P TROPOMI, CPCB CAAQMS sensors, and ERA5 weather dynamics.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-teal-700 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              All Telemetry Pipelines Operational
            </div>
          </div>

          {/* Col 2: Dashboards & Geospatial */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">Geospatial Intelligence</h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigate('aqi')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  CPCB Ground AQI Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('pollutants')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  Pollutant Maps (PM2.5 & PM10)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('hcho')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  Sentinel-5P HCHO Hotspots
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('fire')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  NASA FIRMS Active Fire Correlation
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('weather')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  FourCastNet Weather Forecasts
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Research & Partners */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">Data Providers & Attribution</h4>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://cpcb.nic.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>CPCB CAAQMS India</span>
                  <span className="text-[10px] opacity-70">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.isro.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>ISRO Space Applications Centre</span>
                  <span className="text-[10px] opacity-70">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://firms.modaps.eosdis.nasa.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>NASA FIRMS Fire Telemetry</span>
                  <span className="text-[10px] opacity-70">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://cds.climate.copernicus.eu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>Copernicus Climate Data Store</span>
                  <span className="text-[10px] opacity-70">↗</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Governance */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  Privacy Policy (DPDP & GDPR)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={handleOpenCookies}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <span>Cookie Preferences</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded font-semibold border border-sky-200">
                    Config
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('reports')}
                  className="hover:text-sky-600 transition-colors cursor-pointer text-left"
                >
                  Research Reports Archive
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Project AeroVision. Academic Student Research Project by Aaryan Kasaudhan.</p>
          <div className="flex items-center gap-3">
            <span>Academic Open Science</span>
            <span>•</span>
            <span className="text-sky-700 font-mono font-semibold">Student Portfolio Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
