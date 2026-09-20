import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Policy Card Wrapper with Clean High-Contrast Background */}
      <div className="p-6 md:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 text-slate-700 dark:text-slate-300">
        {/* Header Banner */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider mb-2">
            <span>Academic Student Research Project</span>
            <span>•</span>
            <span>Educational & Open Science Privacy Notice</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Project Lead: <strong>Aaryan Kasaudhan</strong> | Educational Student Research Project | Last Updated: September 2026
          </p>
        </div>

        {/* Quick Action Box */}
        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-purple-900 dark:text-purple-200">Student Project Privacy Commitment</h2>
            <p className="text-xs text-purple-800/80 dark:text-purple-300/80 mt-0.5">
              This is a non-commercial educational project. We do not sell, monetize, or track your personal information.
            </p>
          </div>
          <button
            onClick={handleOpenCookieSettings}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            ⚙️ Manage Cookie Preferences
          </button>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>1. Overview & Nature of the Project</span>
            </h2>
            <p>
              Project AeroVision is an independent, non-commercial educational research initiative created and developed by <strong>Aaryan Kasaudhan</strong> as a student academic research and portfolio project. The project explores the intersection of satellite remote sensing, machine learning, and geospatial visualization for atmospheric air quality (AQI) and formaldehyde (HCHO) hotspot analysis over India.
            </p>
            <p>
              This platform is not an official government entity, commercial enterprise, or institutional data broker. We adhere to transparent, student-level data minimization and respect user privacy in accordance with general data protection standards and the Digital Personal Data Protection Act (DPDP), 2023.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>2. Information We Collect</span>
            </h2>
            <p>
              As an academic student prototype, our data collection is strictly minimal:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>Voluntary Email for Air Alerts:</strong> If you voluntarily subscribe to air quality alert notifications, your email address and chosen alert threshold are stored solely to send you requested email updates. We never share or sell this address.</li>
              <li><strong>Visual Dashboard Selections:</strong> Filtering options (e.g. Selected State, City, Date) are handled client-side in your browser for rendering telemetry.</li>
              <li><strong>Temporary Diagnostic Logs:</strong> Basic HTTP access logs (IP address, user agent) are handled by standard web server hosting software for basic crash reporting and server uptime monitoring.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>3. Public Scientific Data Attribution</span>
            </h2>
            <p>
              All environmental telemetry, satellite products, and meteorological fields displayed on AeroVision originate from open scientific and governmental datasets:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>Central Pollution Control Board (CPCB):</strong> Real-time CAAQMS ground monitoring observations via Data.gov.in.</li>
              <li><strong>European Space Agency (ESA) & Copernicus:</strong> Sentinel-5P TROPOMI tropospheric vertical column measurements.</li>
              <li><strong>NASA FIRMS:</strong> MODIS and VIIRS satellite active fire thermal anomaly datasets.</li>
              <li><strong>ECMWF ERA5 / ISRO SAC:</strong> Public meteorological parameters and synoptic surface wind vectors.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>4. Browser Cookies & Local Storage</span>
            </h2>
            <p>
              AeroVision uses lightweight local storage items only to remember your UI display settings:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                  <tr>
                    <th className="p-3">Storage Key</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                  <tr>
                    <td className="p-3 font-mono text-purple-700 dark:text-purple-300 font-semibold">aerovision_cookie_consent_status</td>
                    <td className="p-3">Remembers your banner acknowledgment choice</td>
                    <td className="p-3">Persistent (Browser Local Storage)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-purple-700 dark:text-purple-300 font-semibold">aerovision_cookie_preferences</td>
                    <td className="p-3">Remembers UI display preferences</td>
                    <td className="p-3">Persistent (Browser Local Storage)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>5. Your Rights & Data Removal</span>
            </h2>
            <p>
              You have full rights over any information you provide:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>Instant Unsubscribe / Removal:</strong> If you signed up for email alerts and wish to remove your email address, simply contact the student project developer and your record will be immediately deleted from the database.</li>
              <li><strong>No Third-Party Sharing:</strong> We do not integrate commercial ad trackers, advertising pixels, or data brokers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>6. Contact Information & Student Developer</span>
            </h2>
            <p>
              If you have any questions, suggestions, feedback, or data removal requests regarding this student project, please reach out directly:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-950 dark:text-white text-sm">Project AeroVision — Student Research Project</p>
              <p>Lead Developer & Student Researcher: <strong>Aaryan Kasaudhan</strong></p>
              <p>
                Email: <a href="mailto:aaryankasaudhan91@gmail.com" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">aaryankasaudhan91@gmail.com</a>
              </p>
              <p>Nature: Academic & Non-Commercial Student Project, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
