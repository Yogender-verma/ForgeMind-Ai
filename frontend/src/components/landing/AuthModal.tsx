import React, { useState } from 'react';

export type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('engineer@forgemind.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [fullName, setFullName] = useState('Lead Process Engineer');
  const [plantLocation, setPlantLocation] = useState('Plant Alpha (Assembly Line 1)');

  // Keep mode in sync when modal opens
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside to close backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-slate-950 border border-cyan-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(0,229,255,0.15)] overflow-hidden z-10">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div>
              <span className="font-heading font-bold text-white text-base">ForgeMind AI</span>
              <span className="block text-[10px] font-mono text-cyan-400">Industrial Gateway</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switch between Sign In and Sign Up */}
        <div className="flex border-b border-white/10 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              mode === 'signin'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              mode === 'signup'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  placeholder="Alex Morgan"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plant Facility / Role</label>
                <input
                  type="text"
                  value={plantLocation}
                  onChange={(e) => setPlantLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  placeholder="Plant Alpha, Continuous Line 2"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition font-mono"
              placeholder="engineer@plant.forgemind.ai"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Access Token / Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
              placeholder="••••••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all font-heading"
            >
              {mode === 'signup' ? 'Create Account & Access Platform' : 'Sign In to Manufacturing Platform'}
            </button>
          </div>

          {/* Quick Demo Access Option */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onSuccess}
              className="w-full py-2.5 text-xs font-mono text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>⚡ Enter Live Dashboard (Demo Access)</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-500 pt-2">
            {mode === 'signup' ? (
              <>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-cyan-400 hover:underline"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                New to ForgeMind?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-cyan-400 hover:underline"
                >
                  Sign Up
                </button>
              </>
            )}
          </p>
        </form>

      </div>
    </div>
  );
};
