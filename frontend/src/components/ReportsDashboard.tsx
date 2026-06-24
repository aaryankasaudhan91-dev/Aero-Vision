import React, { useEffect, useState } from 'react';
import { reportsApi } from '../services/api';

export const ReportsDashboard: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [title, setTitle] = useState('Surface AQI & HCHO Hotspot Analysis - India 2026');
  const [reportType, setReportType] = useState('research_paper'); // standardized backend values
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Interactive Checklist Sections
  const [sections, setSections] = useState({
    abstract: true,
    introduction: true,
    methodology: true,
    datasets: true,
    results: true,
    discussion: true,
    conclusion: true,
    references: true
  });

  // Client-side Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Selected Report for Interactive Document Reader
  const [viewingReport, setViewingReport] = useState<any | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.list();
      setReports(res.data || []);
    } catch (err) {
      console.error("Error listing reports:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    const includeSections = Object.entries(sections)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    try {
      await reportsApi.generate({
        title,
        report_type: reportType,
        include_sections: includeSections,
      });
      setTitle('');
      fetchReports();
    } catch (err) {
      console.error("Error generating report:", err);
      alert('Error compiling research report. Make sure backend is active.');
    } finally {
      setGenerating(false);
    }
  };

  // Real document Markdown downloader
  const handleDownloadMarkdown = (rep: any) => {
    let md = `# ${rep.title}\n\n`;
    md += `**Document Type:** ${rep.report_type.replace('_', ' ').toUpperCase()}\n`;
    md += `**Author:** India AeroVision Geospatial Network\n`;
    md += `**Date:** ${new Date(rep.created_at || rep.generated_at).toLocaleDateString('en-IN')}\n`;
    md += `**Affiliation:** Space Applications Centre (ISRO) & Central Pollution Control Board (CPCB)\n\n`;
    md += `---\n\n`;

    if (rep.abstract) {
      md += `## Abstract\n${rep.abstract}\n\n`;
    }

    const sectionsList = ['introduction', 'methodology', 'datasets', 'results', 'discussion', 'conclusion', 'references'];
    sectionsList.forEach(sec => {
      if (rep.content && rep.content[sec]) {
        const name = sec.charAt(0).toUpperCase() + sec.slice(1);
        md += `## ${name}\n${rep.content[sec]}\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${rep.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter compiled reports list
  const filteredReports = reports.filter(rep => {
    const matchesSearch = rep.title.toLowerCase().includes(filterSearch.toLowerCase());
    const matchesType = filterType === 'all' || rep.report_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Research Reports & Scientific Papers
            {loading && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
          </h2>
          <p className="text-slate-400 text-sm">
            Automated compilation of remote sensing studies, model evaluations, and pollutant transport analysis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Panel */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between h-fit border border-slate-200">
          <form onSubmit={handleGenerate} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Compile Research Document</h3>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500 w-full"
                placeholder="Enter report title..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Document Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500 w-full"
              >
                <option value="research_paper">Scientific Research Paper</option>
                <option value="technical_report">Comprehensive Regional Report</option>
                <option value="presentation">Policy Brief / Executive Summary</option>
              </select>
            </div>

            <div className="p-3 bg-slate-100/50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Select Sections to Include
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                {Object.entries(sections).map(([sec, enabled]) => (
                  <label key={sec} className="flex items-center gap-1.5 cursor-pointer capitalize">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setSections({ ...sections, [sec]: e.target.checked })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 bg-white"
                    />
                    {sec}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-slate-500 text-white text-sm font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition duration-150 shadow-md"
            >
              {generating ? '⚙️ Synthesizing AI Report...' : '🚀 Compile Document'}
            </button>
          </form>
        </div>

        {/* Existing Reports List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col h-[520px] border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Compiled Document Repository</h3>
            
            {/* Filter controls */}
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-purple-500 flex-1 md:w-44"
                placeholder="Search by title..."
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 outline-none focus:border-purple-500"
              >
                <option value="all">All Types</option>
                <option value="research_paper">Research Papers</option>
                <option value="technical_report">Technical Reports</option>
                <option value="presentation">Policy Briefs</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {filteredReports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 hover:border-purple-300 hover:bg-slate-50/80 flex items-center justify-between gap-4 transition duration-150 cursor-pointer"
                onClick={() => setViewingReport(rep)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <h4 className="text-sm font-bold text-slate-800">{rep.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium ml-7">
                    <span className="uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
                      {rep.report_type.replace('_', ' ')}
                    </span>
                    <span>•</span>
                    <span>Created: {new Date(rep.created_at || rep.generated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingReport(rep)}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-semibold rounded-lg px-3 py-1.5 border border-purple-200 transition duration-150 flex items-center gap-1"
                  >
                    📖 Read
                  </button>
                  <button
                    onClick={() => handleDownloadMarkdown(rep)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 border border-slate-200 transition duration-150 flex items-center gap-1"
                  >
                    📥 Download
                  </button>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <span className="text-3xl">📭</span>
                <p className="text-xs">No matching research documents found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Document Reader Modal */}
      {viewingReport && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative transition-all duration-300">
            {/* Viewer Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                  {viewingReport.report_type.replace('_', ' ')}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 leading-tight">{viewingReport.title}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadMarkdown(viewingReport)}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  📥 Download MD
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 transition flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Viewer Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-none text-slate-800 font-serif leading-relaxed text-sm select-text bg-[#fcfcfc]">
              <div className="text-center space-y-2 pb-6 border-b border-slate-200 font-sans">
                <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{viewingReport.title}</h2>
                <div className="text-xs text-slate-500 font-medium">
                  Compiled: {new Date(viewingReport.created_at || viewingReport.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">
                  India AeroVision Geospatial Network
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  Space Applications Centre (ISRO) & Central Pollution Control Board (CPCB)
                </div>
              </div>

              {/* Abstract */}
              {viewingReport.abstract && (
                <div className="bg-purple-50/50 border border-purple-100 p-5 rounded-2xl space-y-2">
                  <h4 className="text-[10px] font-bold text-purple-800 uppercase tracking-widest font-sans">Abstract</h4>
                  <p className="italic text-xs leading-relaxed text-slate-700">{viewingReport.abstract}</p>
                </div>
              )}

              {/* Other sections */}
              {Object.entries(viewingReport.content || {}).map(([secKey, secContent]) => {
                if (secKey === 'abstract') return null; // rendered above
                const sectionName = secKey.charAt(0).toUpperCase() + secKey.slice(1);
                return (
                  <div key={secKey} className="space-y-2.5">
                    <h4 className="text-sm font-bold text-slate-950 border-b border-slate-100 pb-1 font-sans uppercase tracking-wider">{sectionName}</h4>
                    <div className="whitespace-pre-line text-slate-700 text-xs md:text-sm font-serif">
                      {typeof secContent === 'string' ? secContent : JSON.stringify(secContent, null, 2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;
