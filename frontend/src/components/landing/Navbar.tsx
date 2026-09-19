import React, { useState } from 'react';

interface NavbarProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignIn, onSignUp }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#080c14]/85 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: ForgeMind AI Logo & Industrial AI Icon */}
          <a href="#home" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.25)] group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold font-heading text-white tracking-tight flex items-center gap-1.5">
                ForgeMind <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Manufacturing Intelligence
              </span>
            </div>
          </a>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#home"
              className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Home
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#capabilities"
              className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#simulator"
              className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
            >
              <span>What-If Simulator</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Contact Us
            </a>
          </nav>

          {/* Right: Exactly TWO Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={onSignIn}
              type="button"
              className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white border border-white/20 hover:border-cyan-400/70 rounded-lg transition-all duration-200 hover:bg-white/5 active:scale-95"
            >
              Sign In
            </button>
            <button
              onClick={onSignUp}
              type="button"
              className="px-5 py-2 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-lg shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:shadow-[0_0_25px_rgba(0,229,255,0.55)] transition-all duration-200 active:scale-95"
            >
              Sign Up
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg border border-white/10"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#080c14]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
          <a
            href="#home"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-cyan-400 hover:bg-white/5"
          >
            Home
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-cyan-400 hover:bg-white/5"
          >
            How It Works
          </a>
          <a
            href="#capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-cyan-400 hover:bg-white/5"
          >
            Capabilities
          </a>
          <a
            href="#simulator"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-cyan-400 hover:bg-white/5"
          >
            What-If Simulator
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-cyan-400 hover:bg-white/5"
          >
            Contact Us
          </a>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignIn();
              }}
              type="button"
              className="w-full text-center py-2.5 text-sm font-medium text-slate-200 border border-white/20 rounded-lg hover:bg-white/5"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignUp();
              }}
              type="button"
              className="w-full text-center py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.4)]"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
