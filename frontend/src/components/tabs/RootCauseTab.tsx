import React from 'react';
import { RootCauseData, MLFeatureData } from '../../types/forgemind';

interface RootCauseTabProps {
  rootCauseData: RootCauseData;
  mlData?: MLFeatureData;
}

export const RootCauseTab: React.FC<RootCauseTabProps> = ({ rootCauseData, mlData }) => {
  const { correlation_evidence, demand_impact_evidence } = rootCauseData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Root-Cause Evidence & ML Feature Modeling</h2>
          <p className="text-xs text-slate-400">
            Spearman correlations & Scikit-Learn non-linear feature importances.
          </p>
        </div>
        <span className="tag-calculated">[CALCULATED]</span>
      </div>

      {/* Scientific Rigor Disclaimer */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-3">
        <span className="text-base">ℹ️</span>
        <div>
          <strong className="text-white">Scientific Rigor Disclaimer:</strong> All associations below represent
          <em> observed statistical correlations and ML regression feature importances</em>, NOT confirmed real-world causal mechanisms.
          This dataset contains discrete-event process telemetry; no visual defect inspections are present.
        </div>
      </div>

      {/* Scikit-Learn ML Feature Importance Banner */}
      {mlData && (
        <div className="glass-card border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">
                {mlData.algorithm} (R² = {mlData.r2_score.toFixed(3)})
              </span>
              <h3 className="text-base font-bold font-heading text-white mt-0.5">
                Non-Linear Feature Drivers for Target: <span className="text-cyan-400">{mlData.target_variable}</span>
              </h3>
            </div>
            <span className="tag-calculated">[CALCULATED]</span>
          </div>
          <p className="text-xs text-slate-300 mb-4">{mlData.summary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {mlData.ranked_features.slice(0, 4).map((f) => (
              <div key={f.feature} className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                <div className="text-xs font-semibold text-white truncate">{f.feature}</div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Importance:</span>
                  <span className="font-mono text-xs font-bold text-purple-400">{f.importance_pct}%</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(f.importance_pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Grid: Pairwise Correlations vs Demand Impacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pairwise Correlations */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
              Pairwise Correlations (|r| &ge; 0.3)
            </h3>
            <span className="tag-calculated">[CALCULATED]</span>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {correlation_evidence.slice(0, 8).map((ev, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1 hover:border-cyan-500/30 transition">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">{ev.source} &rarr; {ev.target}</span>
                  <span className="font-mono font-bold text-cyan-400">|r| = {ev.strength.toFixed(3)}</span>
                </div>
                <p className="text-[11px] text-slate-400">{ev.detail}</p>
                <div className="pt-1">
                  <span className="tag-calculated text-[9px]">{ev.evidence_tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demand Sensitivity (Cohen's d) */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
              Demand Surge Sensitivity (Cohen's d)
            </h3>
            <span className="tag-calculated">[CALCULATED]</span>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {demand_impact_evidence.slice(0, 8).map((ev, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1 hover:border-cyan-500/30 transition">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">{ev.source} &rarr; {ev.target}</span>
                  <span className="font-mono font-bold text-amber-400">Impact = {ev.strength.toFixed(3)}</span>
                </div>
                <p className="text-[11px] text-slate-400">{ev.detail}</p>
                <div className="pt-1">
                  <span className="tag-calculated text-[9px]">{ev.evidence_tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
