import React from 'react';
import { BottleneckData } from '../../types/forgemind';

interface BottlenecksTabProps {
  data: BottleneckData;
}

export const BottlenecksTab: React.FC<BottlenecksTabProps> = ({ data }) => {
  const { primary_bottleneck, all_stations } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Multi-Factor Bottleneck Intelligence</h2>
          <p className="text-xs text-slate-400">
            Identifies line constraints by weighting utilization load, queue delays, and starvation risks.
          </p>
        </div>
        <span className="tag-calculated">[CALCULATED]</span>
      </div>

      {/* Primary Bottleneck Hero Alert */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-rose-500/15 via-slate-900/80 to-slate-900 border border-rose-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-block px-3 py-1 rounded bg-rose-500/25 text-rose-300 font-mono text-xs font-bold tracking-wider">
            CRITICAL CONSTRAINT IDENTIFIED
          </div>
          <h3 className="text-3xl font-extrabold font-heading text-white">
            {primary_bottleneck?.station} Work Center
          </h3>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            {primary_bottleneck?.explanation}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 rounded-full border-4 border-rose-500 bg-rose-500/10 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(255,61,113,0.3)]">
            <span className="text-2xl font-bold font-heading text-white">
              {primary_bottleneck?.score.toFixed(2)}
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-400">Constraint</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">
            Confidence: {(primary_bottleneck?.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Constraint Ranking Table */}
      <div className="glass-card">
        <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider mb-3">
          Work Center Constraint Hierarchy
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Work Center</th>
                <th className="py-2.5 px-3">Score</th>
                <th className="py-2.5 px-3">Primary Driver</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {all_stations.map((st, idx) => {
                const isPrimary = idx === 0;
                const isSecondary = st.score > 0.4 && !isPrimary;
                const topDriver = st.factors && st.factors[0] ? st.factors[0].factor : 'Utilization';

                return (
                  <tr key={st.station} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-white">{st.station}</td>
                    <td className="py-3 px-3">
                      <span className="tag-calculated">{st.score.toFixed(3)}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{topDriver}</td>
                    <td className="py-3 px-3 font-mono">{(st.confidence * 100).toFixed(0)}%</td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold text-xs ${
                          isPrimary
                            ? 'text-rose-400 font-bold'
                            : isSecondary
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400'
                        }`}
                      >
                        {isPrimary ? 'PRIMARY BOTTLENECK' : isSecondary ? 'SECONDARY CONSTRAINT' : 'ADEQUATE CAPACITY'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
