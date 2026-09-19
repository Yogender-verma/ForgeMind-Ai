import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-white/10 bg-[#080c14] text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/60 flex items-center justify-center text-cyan-400 font-bold text-xs shadow-[0_0_12px_rgba(0,229,255,0.25)]">
              FM
            </div>
            <div>
              <span className="font-heading font-bold text-slate-200 text-sm tracking-tight">ForgeMind AI</span>
              <span className="block text-[11px] text-slate-400">“From Production Data to Smarter Decisions.”</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-400 font-mono text-[11px]">
            <a href="#home" className="hover:text-cyan-400 transition">Home</a>
            <a href="#how-it-works" className="hover:text-cyan-400 transition">How It Works</a>
            <a href="#capabilities" className="hover:text-cyan-400 transition">Capabilities</a>
            <a href="#simulator" className="hover:text-cyan-400 transition">What-If Simulator</a>
            <a href="#contact" className="hover:text-cyan-400 transition">Contact Us</a>
          </div>

          <div className="font-mono text-[10px] text-slate-500 text-center md:text-right">
            React &bull; TypeScript &bull; Tailwind CSS &bull; FastAPI &bull; PostgreSQL
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 gap-2">
          <span>&copy; {new Date().getFullYear()} ForgeMind AI Inc. All rights reserved. Industrial decision-support intelligence.</span>
          <span>Advisory simulation &bull; Zero physical actuation overrides</span>
        </div>
      </div>
    </footer>
  );
};
