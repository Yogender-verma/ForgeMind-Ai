import React from 'react';
import { getDashboardKPIs, getDefectDistribution, getAllInspections } from '../../services/inspectionStore';

export const ReportsView: React.FC = () => {
  const kpis = getDashboardKPIs();
  const distribution = getDefectDistribution();
  const allInspections = getAllInspections();

  const handleExportCSV = () => {
    if (allInspections.length === 0) return;

    const headers = ['ID,Specimen,Prediction,Confidence,Status,Severity,Date'];
    const rows = allInspections.map((i) => {
      const sev =
        typeof i.severity === 'object' && i.severity
          ? i.severity.level || 'Not determined'
          : i.severity || 'Not determined';
      return `"${i.id}","${i.imageName}","${i.prediction}",${i.confidence},"${i.status}","${sev}","${i.formattedDate}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `forgemind_quality_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-white tracking-tight">
            Quality Inspection & Compliance Reports
          </h2>
          <p className="text-xs text-slate-400">
            Export inspection audit logs and review defect Pareto analytics.
          </p>
        </div>

        <button
          type="button"
          disabled={!kpis.hasData}
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-white/10 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📥 Export CSV Audit Log
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
          <span className="text-xs font-mono text-slate-400 uppercase">Audit Status</span>
          <div className="text-lg font-bold text-white font-heading">
            {kpis.hasData ? 'Active Line Monitoring' : 'No Data Logged'}
          </div>
          <p className="text-[11px] text-slate-500">
            {kpis.hasData ? `${kpis.totalInspections} total records filed` : 'Perform inspections to generate audits'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
          <span className="text-xs font-mono text-slate-400 uppercase">First-Pass Yield</span>
          <div className="text-lg font-bold text-emerald-400 font-heading">
            {kpis.hasData ? `${(100 - kpis.defectRatePct).toFixed(1)}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-500">
            Compliant parts adhering to tolerance limits
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
          <span className="text-xs font-mono text-slate-400 uppercase">Inspection Compliance</span>
          <div className="text-lg font-bold text-cyan-400 font-heading">
            100% Traceable
          </div>
          <p className="text-[11px] text-slate-500">
            All records tagged with model and timestamp
          </p>
        </div>
      </div>

      {/* Defect Pareto Breakdown */}
      <div className="p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">
          Defect Pareto Distribution
        </h3>

        {!kpis.hasData ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            No inspection data recorded yet. Upload product specimens to build quality compliance reports.
          </div>
        ) : (
          <div className="space-y-3">
            {distribution.map((item) => (
              <div key={item.defectClass} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">{item.defectClass}</span>
                  <span className="font-mono text-slate-400">
                    {item.count} occurrences ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
