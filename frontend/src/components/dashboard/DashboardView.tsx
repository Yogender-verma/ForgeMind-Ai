import React, { useState, useEffect } from 'react';
import { UserProfile } from '../auth/AuthPage';
import {
  getDashboardKPIs,
  getDefectDistribution,
  getRecentInspections,
} from '../../services/inspectionStore';
import {
  DashboardKPIs,
  DefectDistributionItem,
  InspectionRecord,
  DefectType,
} from '../../types/inspection';

interface DashboardViewProps {
  user: UserProfile;
  onNavigateToUpload: () => void;
  onNavigateToHistory: () => void;
  onNavigateToAssistant: () => void;
  onViewAnalysis: (analysisId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onNavigateToUpload,
  onNavigateToHistory,
  onNavigateToAssistant,
  onViewAnalysis,
}) => {
  const [kpis, setKpis] = useState<DashboardKPIs>(getDashboardKPIs());
  const [distribution, setDistribution] = useState<DefectDistributionItem[]>(getDefectDistribution());
  const [recentAnalyses, setRecentAnalyses] = useState<InspectionRecord[]>(getRecentInspections(6));
  const [selectedFilter, setSelectedFilter] = useState<DefectType | null>(null);

  // Refresh dashboard data when mounting
  useEffect(() => {
    setKpis(getDashboardKPIs());
    setDistribution(getDefectDistribution());
    setRecentAnalyses(getRecentInspections(6));
  }, []);

  // Compute dynamic greeting based on local time
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user.name || user.email.split('@')[0] || 'Engineer';

  const filteredAnalyses = selectedFilter
    ? recentAnalyses.filter((item) => item.prediction === selectedFilter)
    : recentAnalyses;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. Header & Welcome Section */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/20 shadow-[0_15px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>INDUSTRIAL INTELLIGENCE &bull; ROOT-CAUSE & BULL; PRODUCTION OPTIMIZATION</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{displayName}</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              Welcome back to <strong className="text-white">ForgeMind AI</strong>. Analyze inspection images, investigate defects, understand potential contributing factors and simulate improvement scenarios.
            </p>
          </div>

          {/* Primary Action Card: What would you like to analyze today? */}
          <div className="w-full md:w-auto p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(0,229,255,0.15)] flex flex-col items-center text-center space-y-3 shrink-0">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              What would you like to analyze today?
            </span>
            <button
              type="button"
              id="dashboard-primary-upload-btn"
              onClick={onNavigateToUpload}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer font-heading"
            >
              <span className="text-base">📤</span>
              <span>Upload & Analyze</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Key Metrics (KPI Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
            <span>KEY METRICS</span>
            <span className="text-[10px] text-slate-500 font-normal">
              {kpis.hasData ? '[MEASURED FROM REAL ANALYSES]' : '[STANDBY]'}
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* Card 1: Total Inspections */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1 hover:border-cyan-500/40 transition">
            <span className="text-[11px] font-mono text-slate-400 block truncate">Total Inspections</span>
            <div className="text-2xl font-bold font-heading text-white">
              {kpis.hasData ? kpis.totalInspections : '—'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 block truncate">
              {kpis.hasData ? 'Processed parts' : 'No analysis data yet'}
            </span>
          </div>

          {/* Card 2: Defective Units */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1 hover:border-rose-500/40 transition">
            <span className="text-[11px] font-mono text-slate-400 block truncate">Defective Units</span>
            <div className="text-2xl font-bold font-heading text-rose-400">
              {kpis.hasData ? kpis.defectiveUnits : '—'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 block truncate">
              {kpis.hasData ? 'Crack, Hole, Rust, Scratch' : 'No analysis data yet'}
            </span>
          </div>

          {/* Card 3: Normal Units */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1 hover:border-emerald-500/40 transition">
            <span className="text-[11px] font-mono text-slate-400 block truncate">Normal Units</span>
            <div className="text-2xl font-bold font-heading text-emerald-400">
              {kpis.hasData ? kpis.normalUnits : '—'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 block truncate">
              {kpis.hasData ? 'Passed tolerance' : 'No analysis data yet'}
            </span>
          </div>

          {/* Card 4: Defect Rate */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1 hover:border-amber-500/40 transition">
            <span className="text-[11px] font-mono text-slate-400 block truncate">Defect Rate</span>
            <div className="text-2xl font-bold font-heading text-amber-300">
              {kpis.hasData ? `${kpis.defectRatePct}%` : '—'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 block truncate">
              {kpis.hasData ? 'Actual defect ratio' : 'No analysis data yet'}
            </span>
          </div>

          {/* Card 5: Average Confidence */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1 hover:border-cyan-500/40 transition">
            <span className="text-[11px] font-mono text-slate-400 block truncate">Avg. Confidence</span>
            <div className="text-2xl font-bold font-heading text-cyan-400">
              {kpis.hasData ? `${kpis.averageConfidencePct}%` : '—'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 block truncate">
              {kpis.hasData ? 'Model mean score' : 'No analysis data yet'}
            </span>
          </div>

          {/* Card 6: Uncertain / Novel Cases */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1 hover:border-purple-500/40 transition">
            <span className="text-[11px] font-mono text-slate-400 block truncate">Uncertain Cases</span>
            <div className="text-2xl font-bold font-heading text-purple-300">
              {kpis.hasData ? kpis.uncertainCases : '—'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 block truncate">
              {kpis.hasData ? 'Below 80% threshold' : 'No analysis data yet'}
            </span>
          </div>

        </div>
      </section>

      {/* 3. Empty State vs. Populated Data State */}
      {!kpis.hasData ? (
        /* Empty Dashboard State (Default for new users who have not uploaded anything yet) */
        <section className="rounded-3xl border border-dashed border-cyan-500/30 bg-slate-950/60 p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-3xl mx-auto shadow-[0_0_25px_rgba(0,229,255,0.2)]">
            📤
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-white">
              No inspections yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload your first product image to begin your ForgeMind AI quality analysis.
            </p>
          </div>

          <button
            type="button"
            id="empty-state-upload-btn"
            onClick={onNavigateToUpload}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.3)] transition font-heading cursor-pointer inline-flex items-center gap-2"
          >
            <span>📤</span>
            <span>Upload Your First Image</span>
          </button>

          {/* How ForgeMind works explanation */}
          <div className="pt-8 border-t border-white/10 max-w-4xl mx-auto text-left">
            <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold mb-4 text-center">
              How ForgeMind works
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-bold">1. Upload</span>
                <p className="text-[11px] text-slate-400">Capture or drop product inspection image</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-bold">2. Detect</span>
                <p className="text-[11px] text-slate-400">YOLO defect detection & bounding boxes</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-bold">3. Explain</span>
                <p className="text-[11px] text-slate-400">Physical severity & defect coordinates</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-bold">4. Investigate</span>
                <p className="text-[11px] text-slate-400">Link to station & process parameters</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-bold">5. Quantify</span>
                <p className="text-[11px] text-slate-400">Calculate scrap & downtime financial loss</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-bold">6. Simulate</span>
                <p className="text-[11px] text-slate-400">What-if scenario modeling before intervention</p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Populated Data State: Defect Distribution & Recent Analyses */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Defect Distribution Breakdown */}
          <div className="lg:col-span-4 rounded-3xl p-6 bg-slate-950/80 border border-white/10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">
                Defect Distribution
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                {kpis.totalInspections} Recorded
              </span>
            </div>

            <div className="space-y-3">
              {distribution.map((item) => {
                const isSelected = selectedFilter === item.defectClass;
                return (
                  <button
                    key={item.defectClass}
                    type="button"
                    onClick={() =>
                      setSelectedFilter(isSelected ? null : item.defectClass)
                    }
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                        : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-white">{item.defectClass}</span>
                      </div>
                      <div className="font-mono text-slate-300 text-xs">
                        <span>{item.count} units</span>
                        <span className="text-slate-500 ml-1.5">({item.percentage}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedFilter && (
              <button
                type="button"
                onClick={() => setSelectedFilter(null)}
                className="w-full py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition text-center"
              >
                Clear Filter ({selectedFilter})
              </button>
            )}
          </div>

          {/* Right: Recent Analyses Table */}
          <div className="lg:col-span-8 rounded-3xl p-6 bg-slate-950/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">
                  Recent Analyses
                </h4>
                {selectedFilter && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Filtered: {selectedFilter}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-xs font-mono text-cyan-400 hover:underline"
              >
                View All &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-500 border-b border-white/5">
                    <th className="pb-3">Image</th>
                    <th className="pb-3">Analysis ID</th>
                    <th className="pb-3">Prediction</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAnalyses.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition">
                      <td className="py-3">
                        <img
                          src={item.imageUrl}
                          alt={item.imageName}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 bg-slate-900"
                        />
                      </td>
                      <td className="py-3 font-mono font-bold text-white">
                        #{item.id}
                      </td>
                      <td className="py-3 font-semibold text-slate-200">
                        {item.prediction}
                      </td>
                      <td className="py-3 font-mono text-cyan-400">
                        {item.confidence.toFixed(1)}%
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            item.status === 'Defective'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-400 text-[11px]">
                        {item.formattedDate}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onViewAnalysis(item.id)}
                          className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 transition cursor-pointer"
                        >
                          View Analysis
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 4. Quick Actions */}
      <section className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
          QUICK ACTIONS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Action 1: Upload New Image */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-cyan-500/40 transition space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm font-heading">
                <span>📤</span>
                <span>Upload & Analyze</span>
              </div>
              <p className="text-xs text-slate-400">
                Analyze a new inspection image for cracks, holes, rust, or scratch defects.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToUpload}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold font-mono transition cursor-pointer"
            >
              Upload Image &rarr;
            </button>
          </div>

          {/* Action 2: View Past Searches */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-cyan-500/40 transition space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm font-heading">
                <span>🕘</span>
                <span>Past Searches</span>
              </div>
              <p className="text-xs text-slate-400">
                Review previous inspections, defect frequencies, and historical trends.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-semibold font-mono transition cursor-pointer"
            >
              View History &rarr;
            </button>
          </div>

          {/* Action 3: AI Assistant */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-cyan-500/40 transition space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm font-heading">
                <span>🤖</span>
                <span>AI Assistant</span>
              </div>
              <p className="text-xs text-slate-400">
                Ask ForgeMind about your analyses, process parameters, or mitigation plans.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToAssistant}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold font-mono transition cursor-pointer"
            >
              Ask AI &rarr;
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
