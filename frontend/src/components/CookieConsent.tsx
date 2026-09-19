import React, { useState, useEffect } from 'react';
import { getStoredConsent, getStoredPreferences, saveConsent } from '../services/analytics';
import type { CookiePreferences } from '../services/analytics';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    preferences: true,
  });

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      // Show banner after brief delay
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setPrefs(getStoredPreferences());
    }

    // Listen to manual triggers from footer or privacy policy
    const handleReopen = () => {
      setPrefs(getStoredPreferences());
      setShowModal(true);
    };

    window.addEventListener('open-cookie-settings', handleReopen);
    return () => window.removeEventListener('open-cookie-settings', handleReopen);
  }, []);

  const handleAcceptAll = () => {
    saveConsent('accepted', { necessary: true, analytics: true, preferences: true });
    setVisible(false);
    setShowModal(false);
  };

  const handleDecline = () => {
    saveConsent('declined', { necessary: true, analytics: false, preferences: false });
    setVisible(false);
    setShowModal(false);
  };

  const handleSaveCustom = () => {
    saveConsent('custom', prefs);
    setVisible(false);
    setShowModal(false);
  };

  if (!visible && !showModal) return null;

  return (
    <>
      {/* Floating Bottom-Right Consent Banner (Light-Themed, High-Contrast, z-[99990]) */}
      {visible && !showModal && (
        <div
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[99990] p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-slate-900/15 text-slate-800 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">🍪</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Privacy &amp; Cookie Preferences
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                AeroVision uses essential cookies for platform security, and optional analytics to enhance national satellite telemetry visualisations. We adhere to India's DPDP Act and GDPR.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3.5 bg-purple-600 hover:bg-purple-700 !text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Accept All
            </button>
            <button
              onClick={handleDecline}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Decline Optional
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="py-2 px-2.5 text-purple-600 hover:text-purple-800 text-xs font-semibold underline underline-offset-4 transition-colors cursor-pointer"
            >
              Customize
            </button>
          </div>
        </div>
      )}

      {/* Preferences Modal (Light-Themed, High-Contrast, z-[99999]) */}
      {showModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 id="cookie-modal-title" className="text-base font-bold text-slate-900">
                  Cookie &amp; Privacy Control Center
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Configure how AeroVision stores telemetry state and uses analytics. Essential cookies are strictly necessary for core application stability and security.
            </p>

            <div className="space-y-3">
              {/* Essential Cookies */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Essential &amp; Security Cookies</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Always Required
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enables spatial caching, API latency telemetry, and DDoS mitigation.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="w-4 h-4 accent-purple-600 rounded cursor-not-allowed opacity-75"
                />
              </div>

              {/* Analytics Cookies */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Anonymous Analytics</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                      Optional
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Helps researchers measure platform usage, report generation, and regional queries without collecting PII.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="cookie-analytics"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Preferences Cookies */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Functional Preferences</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      Optional
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Remembers your selected states, map zoom levels, and auto-refresh intervals.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="cookie-preferences"
                  checked={prefs.preferences}
                  onChange={(e) => setPrefs({ ...prefs, preferences: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={handleDecline}
                className="py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={handleSaveCustom}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-700 !text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;
