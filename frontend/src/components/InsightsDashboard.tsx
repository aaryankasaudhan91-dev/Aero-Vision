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
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
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

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            AI-Generated Scientific Insights
            {(loading || regenerating) && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></span>}
          </h2>
          <p className="text-slate-400 text-sm">
            Domain-specific atmospheric alerts, automated anomaly detection, and scientific summaries.
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading || regenerating}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl px-4 py-2 border border-purple-700 transition duration-150 flex items-center gap-1.5 cursor-pointer shadow"
        >
          {regenerating ? '⚙️ Rebuilding Insights...' : '🔄 Regenerate AI Insights'}
        </button>
      </div>

      {/* Executive Summary Card */}
      <div className="glass-card p-6 rounded-2xl border-l-4 border-purple-500 bg-gradient-to-r from-purple-950/20 to-indigo-950/10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 mb-2">🧠 Executive Summary</h3>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{summary}</p>
      </div>

      {/* List of Alerts */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Active Environmental Alerts</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {insights.map((ins) => (
            <div key={ins.id || ins.insight_type} className="glass-card p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start border border-slate-200">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">{getInsightIcon(ins.insight_type)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getSeverityBadge(ins.severity)}`}>
                    {ins.severity}
                  </span>
                  <span className="text-xs text-purple-300 font-bold uppercase tracking-widest">{ins.insight_type.replace('_', ' ')}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400 font-medium">Region: {ins.region}</span>
                </div>
                
                <h4 className="text-sm font-bold text-slate-200">{ins.title}</h4>
                <p className="text-slate-300 text-xs leading-relaxed">{ins.insight_text || ins.summary}</p>
                
                {(ins.recommended_action || ins.detailed_text) && (
                  <div className="mt-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      🛡️ Scientific Recommendation
                    </span>
                    <p className="text-xs text-slate-400">{ins.recommended_action || ins.detailed_text}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {insights.length === 0 && !loading && (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500 gap-2 glass-card rounded-2xl border border-slate-200">
            <span className="text-3xl">📭</span>
            <p className="text-xs">No active scientific insights available. Click Regenerate to compile fresh alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default InsightsDashboard;
