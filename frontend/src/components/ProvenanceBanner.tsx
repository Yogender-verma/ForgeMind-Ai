import React from 'react';

export const ProvenanceBanner: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3 bg-slate-900/50 border border-white/10 rounded-xl text-xs text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px] tracking-wide">
          DATA PROVENANCE
        </span>
        <span>
          Rockwell Arena Discrete-Event Simulation &bull; Mendeley Data (DOI: 10.17632/3rw227zxt7.2) &bull; <strong className="text-white">Tabular Process Data Only (No Visual Images)</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="tag-measured" title="Directly observed in simulation data">[MEASURED]</span>
        <span className="tag-calculated" title="Derived deterministically through statistical formulas">[CALCULATED]</span>
        <span className="tag-estimated" title="Model-estimated under configurable assumptions">[ESTIMATED]</span>
        <span className="tag-simulated" title="Simulated what-if scenario projection">[SIMULATED]</span>
      </div>
    </div>
  );
};
