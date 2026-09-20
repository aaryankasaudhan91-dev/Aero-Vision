import React, { useEffect, useState } from 'react';
import { insightsApi } from '../services/api';

export const InsightsDashboard: React.FC = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [summary, setSummary] = useState('');

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      default:
        return 'bg-sky-50 text-sky-700 border border-sky-200';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'aqi_trend':
        return '📈';
      case 'hotspot':
        return '🔥';
      case 'fire_impact':
        return '🍂';
      case 'transport':
        return '🌬️';
      default:
        return '🧠';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const summaryRes = await insightsApi.getExecutiveSummary();
      setSummary(summaryRes.data?.summary || 'No overall executive summary available.');

      const insightsRes = await insightsApi.getAll();
      setInsights(insightsRes.data || []);
    } catch (err) {
      console.error("Error fetching insights data:", err);
      setSummary('No active insights or alerts generated.');
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await insightsApi.generate();
      await fetchData();
    } catch (err) {
      console.error("Error regenerating insights:", err);
      alert("Error regenerating insights. Check backend is active.");
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener('refresh-active-dashboard', handleGlobalRefresh);
    return () => {
      window.removeEventListener('refresh-active-dashboard', handleGlobalRefresh);
    };
  }, []);

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            AI-Generated Scientific Insights
            {(loading || regenerating) && (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent"></span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Domain-specific atmospheric alerts, automated anomaly detection, and scientific summaries.
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading || regenerating}
          className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition duration-150 flex items-center gap-2 cursor-pointer shadow-xs"
        >
          {regenerating ? '⚙️ Synthesizing Insights...' : '🔄 Regenerate AI Insights'}
        </button>
      </div>

      {/* Executive Summary Card */}
      <div className="glass-card card-3d p-6 rounded-2xl border-l-4 border-l-sky-500 border-slate-200/90 shadow-xs bg-gradient-to-r from-sky-50/50 via-white to-white">
        <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-sky-800 mb-2 flex items-center gap-1.5">
          <span>🧠</span> Executive Atmospheric Summary
        </h3>
        <p className="text-slate-700 text-xs md:text-sm leading-relaxed whitespace-pre-line">{summary}</p>
      </div>

      {/* List of Alerts */}
      <div className="space-y-4">
        <h3 className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">
          Active Environmental Telemetry Briefings
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          {insights.map((ins) => (
            <div
              key={ins.id || ins.insight_type}
              className="glass-card card-3d p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start border border-slate-200/90 shadow-xs"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">{getInsightIcon(ins.insight_type)}</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getSeverityBadge(ins.severity)}`}>
                    {ins.severity}
                  </span>
                  <span className="text-xs text-sky-800 font-bold uppercase tracking-wider font-heading">
                    {ins.insight_type.replace('_', ' ')}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium">Region: {ins.region}</span>
                </div>
                
                <h4 className="text-sm font-heading font-bold text-slate-900">{ins.title}</h4>
                <p className="text-slate-600 text-xs leading-relaxed">{ins.insight_text || ins.summary}</p>
                
                {(ins.recommended_action || ins.detailed_text) && (
                  <div className="mt-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-1 font-heading">
                      🛡️ Scientific Action Recommendation
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">{ins.recommended_action || ins.detailed_text}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {insights.length === 0 && !loading && (
          <div className="h-44 flex flex-col items-center justify-center text-slate-400 gap-2 glass-card rounded-2xl border border-slate-200">
            <span className="text-3xl">📭</span>
            <p className="text-xs text-slate-500">No active scientific insights available. Click Regenerate to compile fresh alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsDashboard;
