import React from 'react';

interface EvidenceGraphProps {
  inspectionId: string;
  defectClass: string;
  confidence: number;
  scenarioId?: string;
  primaryStation?: string;
  utilization?: number;
  sensitivityBeta?: number;
  hypothesisCount?: number;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({
  inspectionId,
  defectClass,
  confidence,
  scenarioId = 'SCN-1167',
  primaryStation = 'Assembly',
  utilization = 94.7,
  sensitivityBeta,
  hypothesisCount = 2,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Evidence & Linkage Graph
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Pipeline Lineage
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Explicit provenance tracking separating physical vision measurements, deterministic simulated mapping, and analytical hypotheses.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">[MEASURED]</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">[SIMULATED]</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">[SENSITIVITY]</span>
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">[HYPOTHESIS]</span>
        </div>
      </div>

      {/* Responsive Horizontal Flow Representation */}
      <div className="overflow-x-auto py-2">
        <div className="min-w-[760px] flex items-stretch gap-2">
          {/* Node 1: Visual Specimen [MEASURED] */}
          <div className="flex-1 p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1.5 shadow-sm relative group">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Specimen</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold">[MEASURED]</span>
            </div>
            <div className="text-xs font-bold text-white font-mono truncate">{inspectionId}</div>
            <p className="text-[10px] text-slate-400 leading-tight">Input optical inspection capture</p>
          </div>

          {/* Arrow */}
          <div className="flex items-center text-cyan-400/60 font-mono text-xs px-1">→</div>

          {/* Node 2: Classifier [MEASURED] */}
          <div className="flex-1 p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Classification</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold">[MEASURED]</span>
            </div>
            <div className="text-xs font-bold text-cyan-300 font-mono truncate">{defectClass}</div>
            <p className="text-[10px] text-slate-400 leading-tight">{confidence.toFixed(1)}% model confidence</p>
          </div>

          {/* Arrow with SHA-256 tag */}
          <div className="flex flex-col items-center justify-center px-1 text-[9px] font-mono text-slate-400">
            <span>SHA-256</span>
            <span className="text-blue-400">→</span>
          </div>

          {/* Node 3: Deterministic Link [SIMULATED] */}
          <div className="flex-1 p-3 rounded-xl bg-slate-950 border border-blue-500/30 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Sim Scenario</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">[SIMULATED]</span>
            </div>
            <div className="text-xs font-bold text-blue-300 font-mono truncate">{scenarioId}</div>
            <p className="text-[10px] text-slate-400 leading-tight">Rockwell Arena Discrete Run</p>
          </div>

          {/* Arrow */}
          <div className="flex items-center text-blue-400/60 font-mono text-xs px-1">→</div>

          {/* Node 4: Operating Profile [SIMULATED] */}
          <div className="flex-1 p-3 rounded-xl bg-slate-950 border border-blue-500/30 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Work Center</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">[SIMULATED]</span>
            </div>
            <div className="text-xs font-bold text-slate-200 font-mono truncate">{primaryStation}</div>
            <p className="text-[10px] text-slate-400 leading-tight">{utilization.toFixed(1)}% utilization load</p>
          </div>

          {/* Arrow */}
          <div className="flex items-center text-amber-400/60 font-mono text-xs px-1">→</div>

          {/* Node 5: Sensitivity Model [SENSITIVITY] */}
          <div className="flex-1 p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Sensitivity</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">[SENSITIVITY]</span>
            </div>
            <div className="text-xs font-bold text-amber-300 font-mono truncate">
              {sensitivityBeta !== undefined ? `β = ${sensitivityBeta.toFixed(1)}` : 'OLS Slope'}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Regression-based estimate</p>
          </div>

          {/* Arrow */}
          <div className="flex items-center text-purple-400/60 font-mono text-xs px-1">→</div>

          {/* Node 6: Hypotheses [HYPOTHESIS] */}
          <div className="flex-1 p-3 rounded-xl bg-slate-950 border border-purple-500/30 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Causes</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold">[HYPOTHESIS]</span>
            </div>
            <div className="text-xs font-bold text-purple-300 font-mono truncate">
              {hypothesisCount} Factors
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Engineering standards / FMEA</p>
          </div>
        </div>
      </div>

      {/* Strict Non-Causal Disclosure Banner */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 flex items-start gap-2 text-[11px] font-mono text-slate-300">
        <span className="text-amber-400 font-bold shrink-0">⚠️ Non-Causal Notice:</span>
        <p className="text-slate-400 leading-relaxed">
          Association between specimen visual features and discrete simulation scenario <strong className="text-slate-200 font-bold">{scenarioId}</strong> is generated via deterministic SHA-256 hashing for analytical scenario testing. The supplied datasets do not establish physical manufacturing causality.
        </p>
      </div>
    </div>
  );
};
