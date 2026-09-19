import React, { useState } from 'react';

export const PipelineSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(0);

  const stages = [
    {
      id: 'detect',
      name: 'DETECT',
      subtitle: 'Anomaly & Defect Identification',
      points: [
        'Identify defects and anomalies',
        'Flag uncertain or novel conditions'
      ],
      tag: '[MEASURED]',
      tagClass: 'tag-measured',
      color: 'from-emerald-500/20 to-teal-500/10',
      borderColor: 'border-emerald-500/40',
      activeText: 'text-emerald-400',
      activeBg: 'bg-emerald-500/10',
      badge: 'Step 01',
      metricExample: 'Continuous line telemetry & image defect screening'
    },
    {
      id: 'investigate',
      name: 'INVESTIGATE',
      subtitle: 'Process Context & Evidence Gathering',
      points: [
        'Examine process conditions',
        'Find relevant evidence'
      ],
      tag: '[MEASURED]',
      tagClass: 'tag-measured',
      color: 'from-cyan-500/20 to-blue-500/10',
      borderColor: 'border-cyan-500/40',
      activeText: 'text-cyan-400',
      activeBg: 'bg-cyan-500/10',
      badge: 'Step 02',
      metricExample: 'Cross-station sensor correlations & buffer state audit'
    },
    {
      id: 'explain',
      name: 'EXPLAIN',
      subtitle: 'Root-Cause & Multivariate Attribution',
      points: [
        'Surface possible root-cause relationships',
        'Show confidence and evidence'
      ],
      tag: '[CALCULATED]',
      tagClass: 'tag-calculated',
      color: 'from-blue-500/20 to-indigo-500/10',
      borderColor: 'border-blue-500/40',
      activeText: 'text-blue-400',
      activeBg: 'bg-blue-500/10',
      badge: 'Step 03',
      metricExample: 'Scikit-learn random forest feature ranking & Pearson r'
    },
    {
      id: 'quantify',
      name: 'QUANTIFY',
      subtitle: 'Operational & Economic Loss Model',
      points: [
        'Estimate throughput and production losses',
        'Connect operational effects to economic impact'
      ],
      tag: '[ESTIMATED]',
      tagClass: 'tag-estimated',
      color: 'from-amber-500/20 to-orange-500/10',
      borderColor: 'border-amber-500/40',
      activeText: 'text-amber-400',
      activeBg: 'bg-amber-500/10',
      badge: 'Step 04',
      metricExample: 'Direct translation of scrap & bottlenecks into $ margin'
    },
    {
      id: 'simulate',
      name: 'SIMULATE',
      subtitle: 'Risk-Free Factory What-If Engine',
      points: [
        'Test hypothetical process changes',
        'Compare expected outcomes before intervention'
      ],
      tag: '[SIMULATED]',
      tagClass: 'tag-simulated',
      color: 'from-purple-500/20 to-pink-500/10',
      borderColor: 'border-purple-500/40',
      activeText: 'text-purple-400',
      activeBg: 'bg-purple-500/10',
      badge: 'Step 05',
      metricExample: 'Mathematical Monte Carlo / cycle time scenario bounds'
    }
  ];

  return (
    <section className="py-20 lg:py-28 relative border-t border-white/5 bg-[#080c14] industrial-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-cyan-500/30 text-xs font-mono text-cyan-400">
            <span>FORGEMIND CORE PIPELINE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            One Intelligence Layer. The Entire Production Story.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            From raw factory floor signals to economic quantification and proactive what-if simulation, experience a closed-loop intelligence architecture.
          </p>
        </div>

        {/* Pipeline Navigation Pill Tracker (Horizontal on desktop) */}
        <div className="mb-12 overflow-x-auto pb-4">
          <div className="flex items-center justify-between min-w-[700px] border border-white/10 rounded-2xl bg-slate-950/80 p-2 backdrop-blur-md">
            {stages.map((stage, idx) => {
              const isSelected = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(idx)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                    isSelected
                      ? `${stage.activeBg} border ${stage.borderColor} shadow-[0_0_15px_rgba(0,229,255,0.15)]`
                      : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                    isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold font-heading tracking-wider ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                      {stage.name}
                    </span>
                  </div>
                  {idx < stages.length - 1 && (
                    <span className="hidden sm:inline-block ml-3 text-slate-600 font-mono">→</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed 5-Stage Connected Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative">
          {stages.map((stage, idx) => {
            const isSelected = activeStage === idx;
            return (
              <div
                key={stage.id}
                onClick={() => setActiveStage(idx)}
                className={`relative cursor-pointer p-5 rounded-2xl bg-slate-950/80 backdrop-blur-md border transition-all duration-300 flex flex-col justify-between ${
                  isSelected
                    ? `${stage.borderColor} shadow-[0_0_25px_rgba(0,229,255,0.2)] bg-gradient-to-b ${stage.color} -translate-y-2`
                    : 'border-white/10 hover:border-white/20 hover:-translate-y-1'
                }`}
              >
                {/* Header info */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-slate-400">{stage.badge}</span>
                    <span className={stage.tagClass}>{stage.tag}</span>
                  </div>

                  <h3 className={`text-lg font-bold font-heading tracking-tight mb-1 ${stage.activeText}`}>
                    {stage.name}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 mb-4">{stage.subtitle}</p>

                  {/* Bullet points as required */}
                  <ul className="space-y-2.5 text-xs text-slate-300 font-sans border-t border-white/5 pt-3">
                    {stage.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <span className={`text-sm leading-none mt-0.5 ${stage.activeText}`}>•</span>
                        <span className="leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sub-card metadata */}
                <div className="mt-5 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-400 leading-tight">
                  <span className="text-slate-400 block mb-0.5">Focus:</span>
                  <span className="text-slate-300">{stage.metricExample}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Visual Pipeline Flow Summary */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">
              Currently Highlighting: <span className="text-cyan-400 font-mono font-bold">{stages[activeStage].name}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 text-center md:text-right">
            Stage {activeStage + 1} of 5 &bull; Continuous closed-loop intelligence &bull; Zero manual spreadsheets
          </p>
        </div>

      </div>
    </section>
  );
};
