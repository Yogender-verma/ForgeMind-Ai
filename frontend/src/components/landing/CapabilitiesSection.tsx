import React from 'react';

export const CapabilitiesSection: React.FC = () => {
  const capabilities = [
    {
      title: 'Visual Inspection Intelligence',
      description: 'Classify acceptable and defective units and support defect localization where inspection data is available.',
      tag: '[MEASURED]',
      tagClass: 'tag-measured',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      advisoryNote: 'Directly linked to machine vision camera streams.'
    },
    {
      title: 'Anomaly Detection',
      description: 'Detect unusual process behavior and flag conditions requiring investigation.',
      tag: '[MEASURED]',
      tagClass: 'tag-measured',
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      advisoryNote: 'Flags statistical deviations from healthy baseline.'
    },
    {
      title: 'Bottleneck Intelligence',
      description: 'Identify constrained stations and process-flow limitations.',
      tag: '[CALCULATED]',
      tagClass: 'tag-calculated',
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7h16M4 7l2-4h12l2 4" />
        </svg>
      ),
      advisoryNote: 'Computed from station cycle times, utilization & queue sizes.'
    },
    {
      title: 'Root-Cause Evidence',
      description: 'Analyze relationships between process variables and observed outcomes.',
      tag: '[CALCULATED]',
      tagClass: 'tag-calculated',
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      advisoryNote: 'Correlation analysis. Does not assert untested physical causality.'
    },
    {
      title: 'Economic Impact',
      description: 'Connect production behavior to scrap, rework, throughput, and profitability estimates.',
      tag: '[ESTIMATED]',
      tagClass: 'tag-estimated',
      icon: (
        <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      advisoryNote: 'Economic models based on user-configured unit revenue and scrap costs.'
    },
    {
      title: 'What-If Simulation',
      description: 'Explore hypothetical process changes and their simulated operational and economic effects.',
      tag: '[SIMULATED]',
      tagClass: 'tag-simulated',
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      advisoryNote: 'Advisory simulation only. Does not directly actuate physical plant hardware.'
    }
  ];

  return (
    <section id="capabilities" className="py-20 lg:py-28 relative border-t border-white/5 bg-[#0a101d]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs font-mono text-cyan-400">
            <span>FULL SPECTRUM CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            Built for Industrial Intelligence.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Purpose-engineered for plant managers, quality engineers, and operational leadership to make rapid, evidenced-backed manufacturing choices.
          </p>
        </div>

        {/* 6 Capabilities Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => (
            <div
              key={idx}
              className="p-7 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 hover:border-cyan-500/40 shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center group-hover:border-cyan-400/50 group-hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all">
                    {cap.icon}
                  </div>
                  <span className={cap.tagClass}>{cap.tag}</span>
                </div>

                <h3 className="text-xl font-bold font-heading text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {cap.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {cap.description}
                </p>
              </div>

              {/* Advisory & Context Label */}
              <div className="mt-6 pt-4 border-t border-white/5 flex items-start gap-2">
                <span className="text-[10px] text-cyan-400 mt-0.5">ℹ</span>
                <span className="text-[11px] font-mono text-slate-400 leading-normal">
                  {cap.advisoryNote}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
