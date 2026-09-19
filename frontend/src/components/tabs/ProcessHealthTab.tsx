import React from 'react';
import { ProcessHealthData } from '../../types/forgemind';

interface ProcessHealthTabProps {
  data: ProcessHealthData;
}

export const ProcessHealthTab: React.FC<ProcessHealthTabProps> = ({ data }) => {
  const { station_metrics } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Work Center Process Health & Capacity</h2>
          <p className="text-xs text-slate-400">Station-level utilization distributions, queue delays, and variance metrics.</p>
        </div>
        <span className="tag-calculated">[CALCULATED]</span>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {station_metrics.map((s) => {
          const utilPct = Math.min(Math.round((s.utilization_mean || 0) * 100), 100);
          const isHighLoad = utilPct > 70;

          return (
            <div key={s.name} className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold font-heading text-white">{s.name} Work Center</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isHighLoad
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isHighLoad ? 'HIGH LOAD' : 'NOMINAL'}
                  </span>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>Capacity Utilization [MEASURED]</span>
                    <span className="font-mono font-bold text-white">{utilPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        utilPct > 75
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                          : utilPct > 60
                          ? 'bg-gradient-to-r from-amber-500 to-cyan-400'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>

                {/* Station Stats Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Mean Queue Delay</div>
                    <div className="font-mono font-bold text-white">
                      {s.waiting_time_mean !== undefined ? `${s.waiting_time_mean.toFixed(1)} min` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Max Queue Delay</div>
                    <div className="font-mono font-bold text-slate-200">
                      {s.waiting_time_max !== undefined ? `${s.waiting_time_max.toFixed(1)} min` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Utilization StdDev</div>
                    <div className="font-mono text-slate-300">
                      {s.utilization_std.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Status</div>
                    <div className="font-semibold text-emerald-400">Active [CALCULATED]</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Table */}
      <div className="glass-card">
        <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider mb-3">
          Process Line Metrics Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Work Center</th>
                <th className="py-2.5 px-3">Mean Util (%)</th>
                <th className="py-2.5 px-3">Median Util (%)</th>
                <th className="py-2.5 px-3">StdDev (σ)</th>
                <th className="py-2.5 px-3">Mean Queue (min)</th>
                <th className="py-2.5 px-3">Evidence Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {station_metrics.map((st) => (
                <tr key={st.name} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-semibold text-white">{st.name}</td>
                  <td className="py-2.5 px-3 font-mono">{(st.utilization_mean * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-3 font-mono">{(st.utilization_median * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-3 font-mono">{st.utilization_std.toFixed(3)}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {st.waiting_time_mean !== undefined ? `${st.waiting_time_mean.toFixed(1)} min` : '0.0 min'}
                  </td>
                  <td className="py-2.5 px-3"><span className="tag-measured">[MEASURED]</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
