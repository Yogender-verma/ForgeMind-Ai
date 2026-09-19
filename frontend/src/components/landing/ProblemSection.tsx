import React from 'react';

export const ProblemSection: React.FC = () => {
  const problems = [
    {
      id: 'defects',
      step: '01',
      title: 'Defects',
      description: 'Subtle defects can pass through high-speed production.',
      icon: (
        <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      accentBorder: 'hover:border-rose-500/50',
      badge: 'Upstream Anomaly',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      linkText: 'Cascades into cycle delays'
    },
    {
      id: 'bottlenecks',
      step: '02',
      title: 'Bottlenecks',
      description: 'Cycle-time imbalance and constrained stations reduce throughput.',
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      accentBorder: 'hover:border-amber-500/50',
      badge: 'Throughput Constraint',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      linkText: 'Multiplies buffer starvation'
    },
    {
      id: 'root-causes',
      step: '03',
      title: 'Root Causes',
      description: 'Multiple process variables can interact, making causes difficult to identify.',
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      accentBorder: 'hover:border-purple-500/50',
      badge: 'Multivariate Interaction',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      linkText: 'Drives compound financial loss'
    },
    {
      id: 'economic-impact',
      step: '04',
      title: 'Economic Impact',
      description: 'Scrap, rework, downtime, and lost throughput affect profitability.',
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accentBorder: 'hover:border-cyan-500/50',
      badge: 'Financial Quantification',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      linkText: 'Requires unified intelligence'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative border-t border-white/5 bg-[#0a101d]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs font-mono text-cyan-400">
            <span>THE REALITY OF THE FACTORY FLOOR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            Manufacturing Problems Don't Exist in Isolation.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Siloed tools treat defects, machine constraints, process variability, and economic costs separately. ForgeMind AI maps the real-world linkages connecting them.
          </p>
        </div>

        {/* Interconnected Problem Cards with Flow Vectors */}
        <div className="relative">
          
          {/* Connecting Line along Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-rose-500/40 via-amber-500/40 via-purple-500/40 to-cyan-500/40 -translate-y-6 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {problems.map((item, idx) => (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl bg-slate-950/70 backdrop-blur-md border border-white/10 ${item.accentBorder} shadow-xl transition-all duration-300 hover:-translate-y-1.5 group`}
              >
                {/* Step pill & Icon */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  {/* Title & Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold font-heading text-white">{item.title}</h3>
                    </div>
                    <div className={`inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.badge}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed pt-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Connection conduit indicator */}
                <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{item.linkText}</span>
                  {idx < problems.length - 1 ? (
                    <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};
