import React from 'react';
import { ModelKey } from '../types/forgemind';

interface HeaderProps {
  currentModel: ModelKey;
  onModelChange: (model: ModelKey) => void;
  statusText: string;
  isDbConnected: boolean;
  onNavigateToLanding?: () => void;
  user?: { name: string; email: string; facility?: string; authProvider?: string } | null;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  onModelChange,
  statusText,
  isDbConnected,
  onNavigateToLanding,
  user,
  onSignOut,
}) => {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
            ForgeMind <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Autonomous Manufacturing Intelligence &bull; React + FastAPI + Scikit-Learn + PostgreSQL</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Model Selector */}
        <div className="flex flex-col">
          <label htmlFor="model-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Active Line Model
          </label>
          <select
            id="model-select"
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value as ModelKey)}
            className="bg-slate-950/80 border border-white/15 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 outline-none focus:border-cyan-400 transition cursor-pointer"
          >
            <option value="Model_1">Model 1: 3-Station Sequential Line</option>
            <option value="Model_2">Model 2: Dual-Part Convergent Assembly</option>
          </select>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{statusText}</span>
          </div>
          <div className={`px-2.5 py-1.5 rounded-full text-[11px] font-mono font-medium border ${
            isDbConnected 
              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' 
              : 'bg-slate-800/60 text-slate-400 border-white/10'
          }`}>
            PostgreSQL: {isDbConnected ? 'Connected' : 'Standby'}
          </div>

          {user && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/70 border border-cyan-500/30 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="text-white font-medium truncate max-w-[130px]" title={user.email}>
                {user.name}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase">
                [{user.authProvider || 'USER'}]
              </span>
            </div>
          )}

          {onNavigateToLanding && (
            <button
              onClick={onNavigateToLanding}
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-300 border border-white/15 hover:border-cyan-400/50 hover:bg-white/5 transition flex items-center gap-1.5 ml-1"
              title="Return to ForgeMind AI Landing Page"
            >
              <span>←</span>
              <span>Landing Page</span>
            </button>
          )}

          {onSignOut && (
            <button
              onClick={onSignOut}
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-400/60 hover:bg-rose-500/10 transition flex items-center gap-1 ml-1"
              title="Sign Out from ForgeMind AI"
            >
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
