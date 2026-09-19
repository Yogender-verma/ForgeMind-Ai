import React from 'react';
import { Recommendation } from '../../types/forgemind';

interface RecommendationsTabProps {
  recommendations: Recommendation[];
}

export const RecommendationsTab: React.FC<RecommendationsTabProps> = ({ recommendations }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Prioritized Operational Recommendations</h2>
          <p className="text-xs text-slate-400">
            Synthesized from bottleneck analysis, root-cause correlations, economic impact, and simulation results.
          </p>
        </div>
        <span className="tag-estimated">[ESTIMATED]</span>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => {
          const isP1 = rec.priority === 1;
          const isP2 = rec.priority === 2;

          return (
            <div
              key={rec.id}
              className={`glass-card space-y-4 border ${
                isP1
                  ? 'border-rose-500/40 hover:border-rose-500/60'
                  : isP2
                  ? 'border-amber-500/40 hover:border-amber-500/60'
                  : 'border-blue-500/30 hover:border-blue-500/50'
              }`}
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded ${
                      isP1
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isP2
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    PRIORITY {rec.priority} &bull; {rec.id}
                  </span>
                  <span className="tag-estimated">{rec.evidence_tag}</span>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  Confidence: <strong className="text-white">{(rec.confidence * 100).toFixed(0)}%</strong>
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold font-heading text-white">{rec.problem}</h3>

              {/* Grid of Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Evidence Base */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Observed Evidence & Telemetry
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {rec.evidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold">&bull;</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Intervention */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Recommended Operational Intervention
                  </span>
                  <p className="text-xs font-semibold text-white leading-relaxed">{rec.intervention}</p>
                </div>

                {/* Simulated Effect */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Simulated Operational Effect [SIMULATED]
                  </span>
                  <p className="text-xs text-slate-300">{rec.simulated_effect}</p>
                </div>

                {/* Economic Impact */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Estimated Financial Benefit [ESTIMATED]
                  </span>
                  <p className="text-xs font-bold text-cyan-300">{rec.economic_impact}</p>
                </div>
              </div>

              {/* Limitations & Prerequisites */}
              {rec.limitations && rec.limitations.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Limitations & Implementation Caveats
                  </span>
                  <ul className="space-y-0.5 text-xs text-slate-400">
                    {rec.limitations.map((lim, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">⚠️</span>
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
