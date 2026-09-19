import React from 'react';

interface FinalCTASectionProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onSignIn, onSignUp }) => {
  return (
    <section className="relative py-24 lg:py-32 border-t border-white/5 bg-[#080c14] industrial-grid overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
        
        {/* Sub-pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-cyan-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-medium text-cyan-300 uppercase tracking-wider">
            DEPLOY ENTERPRISE INTELLIGENCE
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading text-white tracking-tight leading-tight">
          See Your Production Process Differently.
        </h2>

        {/* Supporting text */}
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
          Move from isolated production metrics to connected manufacturing intelligence.
        </p>

        {/* Buttons (Strictly Sign Up and Sign In) */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onSignUp}
            type="button"
            className="px-9 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-xl shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_40px_rgba(0,229,255,0.6)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
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

        {/* Secondary trust row */}
        <div className="pt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Decision-Support Only &bull; Non-Intrusive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SCADA / PLC / CSV Compatible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Fully Explainable Models
          </span>
        </div>

      </div>
    </section>
  );
};
