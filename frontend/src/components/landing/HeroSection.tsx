import React from 'react';

interface HeroSectionProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSignIn, onSignUp }) => {
  return (
    <section id="home" className="relative pt-16 pb-24 lg:pt-24 lg:pb-36 overflow-hidden industrial-grid">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-purple-600/10 blur-[140px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-cyan-400/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        
        {/* Tagline Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs sm:text-sm font-mono font-medium text-cyan-300 tracking-wide">
            “From Production Data to Smarter Decisions.”
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-heading text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
          Turn Manufacturing Data{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
            Into Decisions.
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto font-sans font-normal">
          ForgeMind AI connects defect detection, process intelligence, root-cause evidence, economic impact, and what-if simulation into one intelligent manufacturing decision-support platform.
        </p>

        {/* Authentication CTAs (Strictly Sign Up & Sign In) */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={onSignUp}
            type="button"
            className="px-9 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-xl shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_40px_rgba(0,229,255,0.6)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5"
          >
            <span>Sign Up</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <button
            onClick={onSignIn}
            type="button"
            className="px-8 py-4 text-base font-medium text-slate-200 hover:text-white border border-white/20 hover:border-cyan-400/80 rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95"
          >
            Sign In
          </button>
        </div>

        {/* Key Provenance Pillars Bar */}
        <div className="pt-10 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-left hover:border-emerald-500/40 transition">
            <span className="tag-measured text-[10px] block w-fit mb-1.5">[MEASURED]</span>
            <p className="text-xs font-semibold text-white">Line Telemetry</p>
            <p className="text-[11px] text-slate-400">Sensor & PLC streams</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-left hover:border-cyan-500/40 transition">
            <span className="tag-calculated text-[10px] block w-fit mb-1.5">[CALCULATED]</span>
            <p className="text-xs font-semibold text-white">Imbalances</p>
            <p className="text-[11px] text-slate-400">Cycle-time & queues</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-left hover:border-amber-500/40 transition">
            <span className="tag-estimated text-[10px] block w-fit mb-1.5">[ESTIMATED]</span>
            <p className="text-xs font-semibold text-white">Economic Loss</p>
            <p className="text-[11px] text-slate-400">Scrap & downtime cost</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-left hover:border-purple-500/40 transition">
            <span className="tag-simulated text-[10px] block w-fit mb-1.5">[SIMULATED]</span>
            <p className="text-xs font-semibold text-white">What-If Models</p>
            <p className="text-[11px] text-slate-400">Pre-change scenarios</p>
          </div>
        </div>

      </div>
    </section>
  );
};
