import React from 'react';

export const TrustSection: React.FC = () => {
  const provenanceBadges = [
    {
      tag: '[MEASURED]',
      badgeClass: 'tag-measured text-sm px-3 py-1',
      title: 'Directly Observed Data',
      definition: 'Directly observed data.',
      description: 'Raw sensor readings, PLC outputs, inspection camera classifications, and timestamped cycle logs captured on the active line without model transformation.',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      glow: 'hover:shadow-[0_0_20px_rgba(0,230,118,0.15)]'
    },
    {
      tag: '[CALCULATED]',
      badgeClass: 'tag-calculated text-sm px-3 py-1',
      title: 'Deterministic Mathematics',
      definition: 'Derived mathematically from available data.',
      description: 'Strict algebraic formulas including utilization ratios, cycle-time variance, queue delta, Little’s Law WIP, and statistical imbalances derived deterministically.',
      borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
      glow: 'hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]'
    },
    {
      tag: '[ESTIMATED]',
      badgeClass: 'tag-estimated text-sm px-3 py-1',
      title: 'Model-Based Estimation',
      definition: 'Model-based estimation.',
      description: 'Machine learning regressions, random forest feature rankings, financial scrap projections, and economic loss allocations conditioned on historical distributions.',
      borderColor: 'border-amber-500/30 hover:border-amber-500/60',
      glow: 'hover:shadow-[0_0_20px_rgba(255,171,0,0.15)]'
    },
    {
      tag: '[SIMULATED]',
      badgeClass: 'tag-simulated text-sm px-3 py-1',
      title: 'Hypothetical Scenario Output',
      definition: 'What-if scenario output.',
      description: 'Synthetic scenario runs testing hypothetical parameter shifts. Completely separated from live production pipelines and labelled advisory at all times.',
      borderColor: 'border-purple-500/30 hover:border-purple-500/60',
      glow: 'hover:shadow-[0_0_20px_rgba(179,136,255,0.15)]'
    }
  ];

  return (
    <section className="py-20 lg:py-28 relative border-t border-white/5 bg-[#0a101d]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs font-mono text-cyan-400">
            <span>DATA PROVENANCE & RESPONSIBLE AI</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            Every Insight Comes With Context.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Industrial engineering demands radical clarity. ForgeMind AI tags every metric, alert, and prediction with its mathematical origin so engineers always know what is proven and what is modeled.
          </p>
        </div>

        {/* 4 Provenance Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {provenanceBadges.map((item, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl bg-slate-950/80 backdrop-blur-md border ${item.borderColor} ${item.glow} transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between`}
            >
              <div>
                <div className="mb-4">
                  <span className={item.badgeClass}>{item.tag}</span>
                </div>
                <h3 className="text-lg font-bold font-heading text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-xs font-mono text-cyan-400 font-semibold mb-3">
                  {item.definition}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Key Causality & Governance Callout */}
        <div className="max-w-4xl mx-auto p-6 lg:p-8 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-[0_0_30px_rgba(0,229,255,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                Scientific Integrity Guarantee
              </span>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
              “Correlation is not presented as causation.”
            </h4>
            <p className="text-xs text-slate-400 max-w-xl">
              Statistical relationships indicate where to inspect, not automated dogma. ForgeMind AI displays confidence intervals and evidence trails, placing control firmly in the hands of plant personnel.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-300">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Full Audit Trail Active</span>
          </div>
        </div>

      </div>
    </section>
  );
};
