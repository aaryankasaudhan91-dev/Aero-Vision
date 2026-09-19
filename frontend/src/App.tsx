import { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import AlertSubscriptionModal from './components/AlertSubscriptionModal';
import { trackTabChange, trackPageView, initAnalytics } from './services/analytics';
import './App.css';

// Lazy-load dashboard modules for sub-second First Contentful Paint (FCP)
const AqiDashboard = lazy(() => import('./components/AqiDashboard'));
const PollutantDashboard = lazy(() => import('./components/PollutantDashboard'));
const HealthDashboard = lazy(() => import('./components/HealthDashboard'));
const HchoDashboard = lazy(() => import('./components/HchoDashboard'));
const FireDashboard = lazy(() => import('./components/FireDashboard'));
const TransportDashboard = lazy(() => import('./components/TransportDashboard'));
const WeatherDashboard = lazy(() => import('./components/WeatherDashboard'));
const InsightsDashboard = lazy(() => import('./components/InsightsDashboard'));
const ReportsDashboard = lazy(() => import('./components/ReportsDashboard'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const NotFound = lazy(() => import('./components/NotFound'));

const VALID_TABS = [
  'aqi',
  'pollutants',
  'health',
  'hcho',
  'fire',
  'transport',
  'weather',
  'insights',
  'reports',
  'privacy',
  'terms',
];

// Atmospheric loading fallback component
const DashboardLoadingSkeleton = () => (
  <div className="flex-1 p-6 md:p-8 space-y-6 animate-pulse">
    <div className="h-8 bg-slate-800/60 rounded-xl w-1/3"></div>
    <div className="h-4 bg-slate-800/40 rounded-lg w-1/2"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-slate-800/50 rounded-2xl border border-slate-700/40"></div>
      ))}
    </div>
    <div className="h-96 bg-slate-800/40 rounded-2xl border border-slate-700/40 flex items-center justify-center text-slate-500 text-xs">
      <span className="inline-block animate-spin mr-2">🛰️</span> Loading atmospheric geospatial telemetry...
    </div>
  </div>
);

function App() {
  // Read initial route from URL hash if present
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
    if (!hash) return 'aqi';
    return hash;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [latency, setLatency] = useState(12);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncText, setSyncText] = useState('Just Now');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
    // Default open on desktop screens
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  // Synchronize activeTab with URL hash for clean deep-linking & SEO indexing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
      if (hash) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabId: string = 'aqi') => {
    setActiveTab(tabId);
    window.location.hash = tabId;
    trackTabChange(tabId, tabId);
    trackPageView(`/${tabId}`, `AeroVision — ${tabId.toUpperCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen for global api latency telemetry
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
    }, 15000);
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
      case 'privacy':
        return <PrivacyPolicy />;
      case 'terms':
        return <TermsAndConditions />;
      default:
        // Render custom 404 page if unknown route
        if (!VALID_TABS.includes(activeTab)) {
          return <NotFound onNavigateHome={handleTabChange} />;
        }
        return <AqiDashboard />;
    }
  };

  return (
    <div className="flex bg-[#0b0f19] min-h-screen text-slate-100 font-sans relative selection:bg-purple-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAlertModal={() => setAlertModalOpen(true)}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 min-h-screen overflow-x-hidden flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between bg-[#0f172a]/60 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger / Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title={sidebarOpen ? "Collapse Navigation" : "Expand Navigation"}
              aria-label={sidebarOpen ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
            >
              <span className="text-sm font-bold leading-none">{sidebarOpen ? '◀' : '☰'}</span>
            </button>

            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/25 hidden sm:inline-flex items-center gap-1">
              <span>🇮🇳</span>
              <span>India National Grid</span>
            </span>

            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/25 hidden md:inline-flex">
              V1.2.0-Production
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 text-xs text-slate-300 font-medium">
            {/* High-Converting Primary Call To Action (CTA) */}
            <button
              onClick={() => setAlertModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 border border-purple-400/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
              title="Activate Real-Time Air Quality & Hotspot Notifications"
            >
              <span className="animate-pulse">🔔</span>
              <span className="hidden sm:inline">Get Real-Time Alerts</span>
              <span className="sm:hidden">Alerts</span>
            </button>

            {/* Auto Refresh Toggler */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-700/40">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Auto Sync</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-7 h-4 rounded-full relative transition-colors duration-200 focus:outline-none cursor-pointer ${
                  autoRefresh ? 'bg-purple-600' : 'bg-slate-700'
                }`}
                title={autoRefresh ? "Disable Real-Time Auto Sync" : "Enable Real-Time Auto Sync"}
                aria-label="Toggle real-time auto sync"
              >
                <span
                  className={`block w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${
                    autoRefresh ? 'left-4' : 'left-0.5'
                  }`}
                ></span>
              </button>
              {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>}
            </div>

            {/* Telemetry Status Metrics */}
            <div className="hidden lg:flex items-center gap-3 text-slate-400 text-[11px]">
              <span>Latency: <strong className="text-emerald-400 font-semibold">{latency}ms</strong></span>
              <span>•</span>
              <span>Sync: <strong className="text-emerald-400 font-semibold">{syncText}</strong></span>
            </div>
          </div>
        </header>

        {/* Dashboard / View Panels with Suspense Code-Splitting */}
        <div className="flex-1">
          <Suspense fallback={<DashboardLoadingSkeleton />}>
            {renderContent()}
          </Suspense>
        </div>

        {/* Global Footer */}
        <Footer onNavigate={handleTabChange} />
      </main>

      {/* Global Modals & Banners */}
      <CookieConsent />
      <AlertSubscriptionModal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
      />
    </div>
  );
}

export default App;
