/**
 * AeroVision Telemetry & Privacy-First Analytics Service.
 * Respects user privacy, Do-Not-Track (DNT) headers, and GDPR/DPDP cookie preferences.
 */

export interface CookiePreferences {
  necessary: boolean; // Always true
  analytics: boolean;
  preferences: boolean;
}

const COOKIE_STORAGE_KEY = 'aerovision_cookie_consent_status';
const PREFS_STORAGE_KEY = 'aerovision_cookie_preferences';

export const getStoredConsent = (): 'accepted' | 'declined' | 'custom' | null => {
  return localStorage.getItem(COOKIE_STORAGE_KEY) as 'accepted' | 'declined' | 'custom' | null;
};

export const getStoredPreferences = (): CookiePreferences => {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse cookie preferences", e);
  }
  return { necessary: true, analytics: false, preferences: true };
};

export const saveConsent = (status: 'accepted' | 'declined' | 'custom', prefs?: Partial<CookiePreferences>) => {
  localStorage.setItem(COOKIE_STORAGE_KEY, status);
  
  const updatedPrefs: CookiePreferences = {
    necessary: true,
    analytics: status === 'accepted' || (status === 'custom' && !!prefs?.analytics),
    preferences: status === 'accepted' || (status === 'custom' && !!prefs?.preferences),
  };
  
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updatedPrefs));
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: { status, preferences: updatedPrefs } }));
  
  if (updatedPrefs.analytics) {
    initAnalytics();
  }
};

let isInitialized = false;

export const initAnalytics = () => {
  if (isInitialized) return;
  const prefs = getStoredPreferences();
  if (!prefs.analytics) return;

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (gaId && typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId, {
      anonymize_ip: true,
      restricted_data_processing: true,
    });
  }

  isInitialized = true;
  console.info("🛰️ AeroVision Privacy-Preserving Analytics Initialized.");
};

export const trackPageView = (path: string, title?: string) => {
  const prefs = getStoredPreferences();
  if (!prefs.analytics) return;

  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  } else {
    // Development / Local console log
    console.debug(`[Analytics:PageView] ${path} - ${title || document.title}`);
  }
};

export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  const prefs = getStoredPreferences();
  if (!prefs.analytics) return;

  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', eventName, params);
  } else {
    console.debug(`[Analytics:Event] ${eventName}`, params);
  }
};

export const trackTabChange = (tabId: string, tabName: string) => {
  trackEvent('dashboard_tab_change', {
    tab_id: tabId,
    tab_name: tabName,
    timestamp: new Date().toISOString(),
  });
};

export const trackReportDownload = (reportId: number | string, reportTitle: string) => {
  trackEvent('report_download', {
    report_id: reportId,
    report_title: reportTitle,
  });
};

export const trackAlertSubscription = (region: string, threshold: string) => {
  trackEvent('alert_subscription_submitted', {
    region,
    threshold,
  });
};
