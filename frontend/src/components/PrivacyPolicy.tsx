import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto space-y-8 text-slate-200">
      {/* Header Banner */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs text-purple-400 font-semibold uppercase tracking-wider mb-2">
          <span>Compliance & Data Governance</span>
          <span>•</span>
          <span>DPDP Act 2023 & GDPR Compliant</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Effective Date: September 19, 2026 | Last Updated: September 19, 2026
        </p>
      </div>

      {/* Quick Action Box */}
      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-purple-200">Your Privacy, Your Control</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            You can modify your consent settings for analytics, cookies, and local caching at any time.
          </p>
        </div>
        <button
          onClick={handleOpenCookieSettings}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
        >
          ⚙️ Manage Cookie Preferences
        </button>
      </div>

      {/* Policy Sections */}
      <div className="space-y-6 text-sm leading-relaxed text-slate-300">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>1. Overview & Scope</span>
          </h2>
          <p>
            Project AeroVision (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is dedicated to open atmospheric science, geospatial observation, and surface air quality telemetry over the Indian Subcontinent. This Privacy Policy sets forth our principles and practices concerning data governance, telemetry logs, and the rights of visitors under the <strong>Digital Personal Data Protection Act, 2023 (India)</strong>, the <strong>General Data Protection Regulation (GDPR)</strong>, and applicable international privacy frameworks.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>2. Information We Collect</span>
          </h2>
          <p>
            AeroVision is architected around data minimization. We do not require account registration, national identity numbers, or sensitive financial data to access public air quality telemetry. We collect only:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-slate-300">
            <li><strong>Public Query Telemetry:</strong> State, district, or date ranges selected when visualizing CPCB ground stations or TROPOMI HCHO column densities.</li>
            <li><strong>Server Diagnostic Logs:</strong> Transient IP addresses, browser user-agent strings, and request timestamps, retained exclusively for DDoS defense, anomaly detection, and rate limiting (maximum retention: 14 days).</li>
            <li><strong>Alert Notification Coordinates:</strong> When you voluntarily register for Early Warning Air Alerts, we securely store your email address, target geographical region, and alert threshold.</li>
            <li><strong>Performance & Latency Telemetry:</strong> Real-time API response duration dispatched via custom browser events to monitor server network health.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>3. Scientific & Satellite Data Sources</span>
          </h2>
          <p>
            The atmospheric observations, active fires, and meteorological fields presented on this portal are ingested from authorized public, research, and governmental providers:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-slate-300">
            <li><strong>Central Pollution Control Board (CPCB):</strong> Real-time ground monitoring station indices (PM2.5, PM10, NO2, SO2, CO, Ozone).</li>
            <li><strong>European Space Agency (ESA) & Copernicus CDS:</strong> Sentinel-5P TROPOMI tropospheric formaldehyde (HCHO) column density.</li>
            <li><strong>NASA FIRMS:</strong> Moderate Resolution Imaging Spectroradiometer (MODIS) and VIIRS thermal anomaly records.</li>
            <li><strong>ECMWF ERA5 & ISRO SAC:</strong> Boundary layer height, surface wind vectors, and meteorological transport trajectories.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>4. Cookies & Local Storage</span>
          </h2>
          <p>
            We use minimal cookies and browser local storage:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-800 rounded-xl overflow-hidden mt-2">
              <thead className="bg-slate-800/80 text-slate-200">
                <tr>
                  <th className="p-3">Key / Cookie Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                <tr>
                  <td className="p-3 font-mono text-purple-300">aerovision_cookie_consent_status</td>
                  <td className="p-3">Essential</td>
                  <td className="p-3">Remembers your cookie consent choice</td>
                  <td className="p-3">1 Year</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-purple-300">aerovision_cookie_preferences</td>
                  <td className="p-3">Functional</td>
                  <td className="p-3">Stores granular toggles for optional features</td>
                  <td className="p-3">1 Year</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-purple-300">_ga / _ga_* (Optional)</td>
                  <td className="p-3">Analytics</td>
                  <td className="p-3">Aggregated page interaction and report compilation counts (IP-anonymized)</td>
                  <td className="p-3">2 Years (if consented)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>5. Your Rights Under DPDP Act 2023 & GDPR</span>
          </h2>
          <p>
            As a data principal, you hold the following rights:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-slate-300">
            <li><strong>Right to Access:</strong> Inquire about what personal contact information or alert preferences are retained.</li>
            <li><strong>Right to Correction & Erasure:</strong> Request the instantaneous deletion of your email alert subscription.</li>
            <li><strong>Right to Grievance Redressal:</strong> Direct questions to our designated Data Protection Officer.</li>
            <li><strong>Right to Withdraw Consent:</strong> Revoke cookie or analytics consent anytime via the preference center button above.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>6. Contact Information & Data Protection Officer</span>
          </h2>
          <p>
            For privacy inquiries, audit inquiries, or exercising your statutory data rights, please contact:
          </p>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1 text-slate-300">
            <p className="font-semibold text-white">Project AeroVision Data Governance Team</p>
            <p>Email: <a href="mailto:privacy@aerovision.in" className="text-purple-400 hover:underline">privacy@aerovision.in</a></p>
            <p>Nodal Office: Space Applications Research Cluster, New Delhi, India</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
