import React from 'react';

export const TermsAndConditions: React.FC = () => {
  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Terms Card Wrapper with Clean High-Contrast Background */}
      <div className="p-6 md:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 text-slate-700 dark:text-slate-300">
        {/* Header Banner */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider mb-2">
            <span>Academic Research Project</span>
            <span>•</span>
            <span>Educational & Open Science Terms of Use</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Terms & Conditions of Use
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Project Lead: <strong>Aaryan Kasaudhan</strong> | Non-Commercial Student Academic Project | Effective: September 2026
          </p>
        </div>

        {/* Advisory Alert for Student Academic Project */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-3 shadow-xs">
          <span className="text-xl shrink-0" aria-hidden="true">🎓</span>
          <div>
            <strong className="font-bold block text-amber-950 dark:text-amber-100 text-sm mb-0.5">
              Academic Student Project Disclaimer
            </strong>
            Project AeroVision is an independent, non-commercial student research project developed by <strong>Aaryan Kasaudhan & its team</strong> for academic learning, environmental data exploration, and machine learning research demonstration. The values, predictions, and hotspots displayed are intended strictly for educational and scientific research purposes, and do not constitute official statutory directives or emergency declarations from national disaster management agencies.
          </div>
        </div>

        {/* Terms Content */}
        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">1. Nature of the Project</h2>
            <p>
              Project AeroVision is built as an academic portfolio demonstration that synthesizes public satellite observations, ground monitoring networks, and spatial machine learning algorithms. By accessing this student prototype, you acknowledge that you are viewing educational research output created for non-commercial academic evaluation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">2. Open Educational & Research Use</h2>
            <p>
              AeroVision encourages open science and learning:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li><strong>Free Academic Use:</strong> Students, educators, researchers, and citizens are freely welcome to explore, analyze, and cite the visual analytics and machine learning methodologies.</li>
              <li><strong>Academic Attribution:</strong> If citing or presenting this project in academic coursework, presentations, or research papers, please reference: <em>&quot;Project AeroVision: Student Atmospheric Telemetry & Surface AQI Research by Aaryan Kasaudhan (2026)&quot;</em>.</li>
              <li><strong>Public Data Credits:</strong> Respect and acknowledge the underlying open data sources that make this research possible: CPCB India, ESA Copernicus Sentinel-5P, NASA FIRMS, and ECMWF ERA5.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">3. Acceptable Use Guidelines</h2>
            <p>
              Because this platform is hosted on student/educational project infrastructure, please interact with the website responsibly:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li>Do not run aggressive automated scrapers, denial-of-service tests, or high-concurrency bots that overwhelm the project backend server.</li>
              <li>Do not attempt to penetrate or disrupt the project database or server endpoints.</li>
              <li>Do not misrepresent AeroVision research visualizations as official government environmental health orders.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">4. Academic Prototype &quot;As Is&quot; Disclaimer</h2>
            <p>
              This portal is an educational prototype developed as part of academic studies. All maps, predicted values, trajectory paths, and hotspot estimates are provided on an <strong>&quot;AS IS&quot; and &quot;AS AVAILABLE&quot;</strong> basis without commercial warranties, uptime guarantees, or commercial service-level agreements. Satellite observations may be subject to cloud masking, sensor passes, or orbital revisit schedules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">5. Limitation of Liability</h2>
            <p>
              As a non-profit, student academic demonstration, the developer shall not be liable for any direct or indirect decisions, reliance, or actions taken based on the experimental models or visual outputs displayed on this website. For official, statutory air quality alerts, please consult the Central Pollution Control Board (CPCB) or local environmental ministries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">6. Feedback & Developer Contact</h2>
            <p>
              Feedback, academic collaboration inquiries, questions, or bug reports are welcomed:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-950 dark:text-white text-sm">Project AeroVision — Student Research Project</p>
              <p>Lead Developers: <strong>Aaryan Kasaudhan, Jitendra Choudhary, Akshay Paswan</strong></p>
              <p>
                Email: <a href="mailto:aaryankasaudhan91@gmail.com" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">aaryankasaudhan91@gmail.com</a>
              </p>
              <p>Location: India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
