import React, { useState } from 'react';
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  formatAuthError,
  UserAccountData,
} from '../../services/firebase';

export type AuthMode = 'signin' | 'signup';
export type UserProfile = UserAccountData;
export type { UserAccountData };

interface AuthPageProps {
  initialMode?: AuthMode;
  onAuthSuccess: (user: UserAccountData) => void;
  onBackToLanding: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  onAuthSuccess,
  onBackToLanding,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [facility, setFacility] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'email' | 'google' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Real Firebase Google Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);
    setLoadingAction('google');

    try {
      const user = await signInWithGoogle();
      setIsLoading(false);
      setLoadingAction(null);
      // Real authentication succeeded, pass user to parent app router
      onAuthSuccess(user);
    } catch (err: any) {
      setIsLoading(false);
      setLoadingAction(null);
      console.error('Google Sign-In Error:', err);
      const friendlyMessage = formatAuthError(err);
      setErrorMessage(friendlyMessage);
    }
  };

  // Handle Real Firebase Email Login or Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setLoadingAction('email');

    try {
      let user: UserAccountData;
      if (mode === 'signup') {
        user = await registerWithEmail(fullName, email, password, facility);
      } else {
        user = await loginWithEmail(email, password);
      }

      setIsLoading(false);
      setLoadingAction(null);
      // Real authentication confirmed, redirect to dashboard
      onAuthSuccess(user);
    } catch (err: any) {
      setIsLoading(false);
      setLoadingAction(null);
      console.error('Authentication Error:', err);
      const friendlyMessage = formatAuthError(err);
      setErrorMessage(friendlyMessage);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 industrial-grid flex flex-col justify-between relative overflow-hidden py-6 px-4 sm:px-6 lg:px-8">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-indigo-600/10 blur-[130px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-500/5 blur-[100px] pointer-events-none -z-10 rounded-full" />

      {/* Top Header Bar */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between z-10 pb-4 border-b border-white/5">
        <button
          onClick={onBackToLanding}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-400/50 hover:bg-white/5 transition"
        >
          <span>←</span>
          <span>Back to Landing</span>
        </button>

        <a href="#home" onClick={onBackToLanding} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <span className="font-heading font-bold text-white text-lg tracking-tight">
            ForgeMind <span className="text-cyan-400">AI</span>
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Production Security</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="max-w-md mx-auto w-full py-6 z-10">
        <div className="rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(0,229,255,0.1)] overflow-hidden">
          
          {/* Card Header */}
          <div className="px-8 pt-8 pb-4 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>ENTERPRISE INDUSTRIAL GATEWAY</span>
            </div>

            <h1 className="text-3xl font-extrabold font-heading text-white tracking-tight">
              ForgeMind AI
            </h1>

            <h2 className="text-lg font-semibold text-slate-200">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            
            <p className="text-xs text-slate-400">
              {mode === 'signin'
                ? 'Sign in to access industrial decision support & manufacturing analytics.'
                : 'Register your engineer credentials to access the ForgeMind dashboard.'}
            </p>
          </div>

          {/* Tab Selector: Sign In / Create Account */}
          <div className="flex border-b border-white/10 mx-8 bg-slate-900/60 rounded-xl p-1 mb-5">
            <button
              type="button"
              id="auth-tab-signin"
              onClick={() => {
                setMode('signin');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="auth-tab-signup"
              onClick={() => {
                setMode('signup');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Card Body */}
          <div className="px-8 pb-8 space-y-4">
            
            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                id="auth-error-alert"
                className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <span>⚠️</span>
                  <span>Authentication Failed</span>
                </div>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="auth-fullname" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="auth-fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-facility" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Plant Facility / Department
                    </label>
                    <input
                      id="auth-facility"
                      type="text"
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      placeholder="e.g. Plant Alpha (Assembly Line 1)"
                      className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                  autoComplete="email"
                />
              </div>

              {/* Password Input with Eye Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition pr-10"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    id="auth-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition text-sm p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <span role="img" aria-label="hide">👁️</span>
                    ) : (
                      <span role="img" aria-label="show">👁</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={isLoading}
                className="w-full py-3 px-4 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all font-heading disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && loadingAction === 'email' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-slate-950 px-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest relative z-10">
                OR
              </span>
            </div>

            {/* Real Google OAuth Button */}
            <button
              type="button"
              id="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 hover:border-cyan-400/50 text-sm font-medium text-white flex items-center justify-center gap-3 transition shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && loadingAction === 'google' ? (
                <>
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-cyan-300 font-mono text-xs">Opening Google OAuth...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Mode Switch Footer */}
            <p className="text-center text-xs text-slate-400 pt-2">
              {mode === 'signin' ? (
                <>
                  Need an account?{' '}
                  <button
                    type="button"
                    id="switch-to-signup"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage('');
                    }}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    Create one here
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    id="switch-to-signin"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage('');
                    }}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>

          </div>
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 pt-4 border-t border-white/5 z-10 font-mono text-[11px]">
        &copy; {new Date().getFullYear()} ForgeMind AI &bull; Google Firebase Production Authentication
      </footer>
    </div>
  );
};

export default AuthPage;
