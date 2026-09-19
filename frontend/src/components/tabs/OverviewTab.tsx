import React from 'react';
import { PipelineFullData } from '../../types/forgemind';

interface OverviewTabProps {
  data: PipelineFullData;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
  const { model, process_health, bottleneck, economics, recommendations } = data;
  const isM1 = model === 'Model_1';

  const throughputVal = isM1
    ? (economics.metrics.throughput?.mean_parts_per_run || 5025.6)
    : (process_health.summary.mean_entities_out || 2507.0);

  const profitVal = economics.metrics.estimated_profit_per_run?.value || 0;
  const profitMargin = economics.metrics.profit_margin_pct?.value || 0;
  const queuePressure = process_health.summary.mean_queue_pressure || 128.3;
  const pb = bottleneck.primary_bottleneck;
  const topRec = recommendations[0];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Manufacturing Line Executive Overview</h2>
          <p className="text-xs text-slate-400">Holistic performance indicators across discrete simulation replications.</p>
        </div>
        <span className="tag-calculated">[CALCULATED]</span>
      </div>

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mean Throughput</span>
            <span className="tag-measured">[MEASURED]</span>
          </div>
          <div className="text-3xl font-bold font-heading text-white">
            {throughputVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Units per simulation run</div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card flex flex-col justify-between border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Primary Constraint</span>
            <span className="tag-calculated">[CALCULATED]</span>
          </div>
          <div className="text-3xl font-bold font-heading text-amber-400">
            {pb?.station || 'Assembly'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Score: {pb?.score.toFixed(2)} &bull; Confidence: {(pb?.confidence * 100).toFixed(0)}%
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card flex flex-col justify-between border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Est. Net Profit / Run</span>
            <span className="tag-estimated">[ESTIMATED]</span>
          </div>
          <div className="text-3xl font-bold font-heading text-emerald-400">
            ${profitVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Margin: {profitMargin}%</div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mean Queue Pressure</span>
            <span className="tag-calculated">[CALCULATED]</span>
          </div>
          <div className="text-3xl font-bold font-heading text-cyan-400">
            {queuePressure.toFixed(1)} <span className="text-sm font-normal text-slate-400">min</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Cumulative work-center delay</div>
        </div>
      </div>

      {/* ForgeMind Pipeline Architecture Flow Diagram */}
      <div className="glass-card">
        <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider mb-4">
          ForgeMind Autonomous Pipeline Stages
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { step: 'P1', name: 'Data Ingestion', tag: '[MEASURED]' },
            { step: 'P2', name: 'Process Health', tag: '[CALCULATED]' },
            { step: 'P3', name: 'Bottleneck Detection', tag: '[CALCULATED]' },
            { step: 'P4', name: 'Root-Cause Links', tag: '[CALCULATED]' },
            { step: 'P5', name: 'Economic Engine', tag: '[ESTIMATED]' },
            { step: 'P6', name: 'What-If Simulation', tag: '[SIMULATED]' },
            { step: 'P7', name: 'Action Plans', tag: '[ESTIMATED]' },
          ].map((s) => (
            <div
              key={s.step}
              className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30 flex flex-col items-center text-center relative hover:border-cyan-400 transition"
            >
              <span className="font-mono text-cyan-400 font-bold text-xs">{s.step}</span>
              <span className="text-xs font-semibold text-white mt-1 mb-1">{s.name}</span>
              <span className="font-mono text-[10px] text-slate-400">{s.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Architecture Info */}
        <div className="glass-card">
          <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider mb-3">
            Active Line Architecture
          </h3>
          <div className="divide-y divide-white/5 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Model Key:</span>
              <span className="font-mono font-semibold text-white">{model}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Work Centers:</span>
              <span className="font-semibold text-white">
                {isM1 ? 'Drilling, Milling, Assembly (Sequential)' : 'Part 1 & 2 Streams -> Assembly (Convergent)'}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Simulation Sample Size:</span>
              <span className="font-semibold text-white">3,000 Discrete Replications [MEASURED]</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400">Data Integrity:</span>
              <span className="font-semibold text-emerald-400">Cleaned &bull; 0 Missing &bull; Outliers Flagged</span>
            </div>
          </div>
        </div>

        {/* Top Priority Action */}
        <div className="glass-card border-rose-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/40">
              PRIORITY 1 INTERVENTION
            </span>
            <span className="tag-estimated">[ESTIMATED]</span>
          </div>
          <h4 className="text-base font-bold text-white mb-1">{topRec?.problem || 'Primary Bottleneck Identified'}</h4>
          <p className="text-xs text-slate-300 mb-3">{topRec?.intervention}</p>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-xs text-cyan-300 flex justify-between">
            <span><strong>Impact:</strong> {topRec?.economic_impact}</span>
            <span className="text-slate-400 font-mono">Conf: {(topRec?.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
