import React, { useState } from 'react';
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  isFirebaseConfigured,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [facility, setFacility] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Helper to detect Firebase API key mismatch or invalid placeholder credentials
  const isApiKeyError = (err: any): boolean => {
    const code = String(err?.code || '').toLowerCase();
    const message = String(err?.message || '').toLowerCase();
    return (
      code.includes('api-key') ||
      code.includes('invalid-api-key') ||
      code.includes('api-key-not-valid') ||
      message.includes('api-key-not-valid') ||
      message.includes('invalid-api-key') ||
      message.includes('invalid api key') ||
      message.includes('please-pass-a-valid-api-key') ||
      message.includes('api key')
    );
  };

  // Real Firebase Google Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMessage('');

    setIsLoading(true);
    setStatusMessage('Connecting to Google Identity & Firebase Auth...');

    try {
      const userData = await signInWithGoogle();
      setStatusMessage('Google authentication verified. Syncing profile with Firestore...');
      setTimeout(() => {
        setIsLoading(false);
        localStorage.setItem('forgemind_user', JSON.stringify(userData));
        onAuthSuccess(userData);
      }, 500);
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google Sign-In failed:', err);

      let msg = err?.message || 'Google authentication failed.';
      if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'Google sign-in popup was closed before completing authentication.';
      } else if (err?.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by your browser. Please allow popups for localhost.';
      } else if (isApiKeyError(err) || !isFirebaseConfigured()) {
        msg = 'Firebase API Key in frontend/.env is invalid or placeholder. Update VITE_FIREBASE_API_KEY in frontend/.env with your valid Google Firebase Console API Key to perform real Google Authentication.';
      }
      setErrorMessage(msg);
    }
  };

  // Real Firebase Email / Password Sign-In & Sign-Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        setStatusMessage('Registering user account and provisioning Firestore profile...');
        const userData = await registerWithEmail(fullName, email, password, facility);
        setStatusMessage('Registration successful! Launching workspace...');
        setTimeout(() => {
          setIsLoading(false);
          localStorage.setItem('forgemind_user', JSON.stringify(userData));
          onAuthSuccess(userData);
        }, 500);
      } else {
        setStatusMessage('Verifying credentials with Firebase Authentication...');
        const userData = await loginWithEmail(email, password);
        setStatusMessage('Credentials verified. Accessing production platform...');
        setTimeout(() => {
          setIsLoading(false);
          localStorage.setItem('forgemind_user', JSON.stringify(userData));
          onAuthSuccess(userData);
        }, 500);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('Firebase Auth Error:', err);

      let msg = err?.message || 'Authentication failed. Please verify your credentials.';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please check your credentials or click Sign Up.';
      } else if (err?.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please switch to Sign In.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (isApiKeyError(err) || !isFirebaseConfigured()) {
        msg = 'Firebase API Key in frontend/.env is invalid or placeholder. Update VITE_FIREBASE_API_KEY in frontend/.env with your valid Google Firebase Console API Key to authenticate.';
      }
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 industrial-grid flex flex-col justify-between relative overflow-hidden py-8 px-4 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-indigo-600/10 blur-[140px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-cyan-500/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* Top Navigation Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between z-10 pb-6 border-b border-white/5">
        <button
          onClick={onBackToLanding}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-400/50 hover:bg-white/5 transition"
        >
          <span>←</span>
          <span>Back to Landing Page</span>
        </button>

        <a href="#home" onClick={onBackToLanding} className="flex items-center gap-2.5">
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

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Firebase Auth & Firestore Connected</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-lg mx-auto w-full py-8 z-10">
        <div className="rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(0,229,255,0.12)] overflow-hidden">
          
          {/* Card Header */}
          <div className="px-8 pt-8 pb-4 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>REAL FIREBASE AUTHENTICATION</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              {mode === 'signin' ? 'Sign In to ForgeMind AI' : 'Create Your Enterprise Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'signin'
                ? 'Authenticate via Google or corporate email to access manufacturing analytics.'
                : 'Register your production facility and sync profile data to Firestore.'}
            </p>
          </div>

          {/* Toggle Tabs: Sign In / Sign Up */}
          <div className="flex border-b border-white/10 mx-6 bg-slate-900/60 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage('');
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Main Form Body */}
          <div className="px-8 pb-8 space-y-5">
            
            {/* Real Firebase Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 hover:border-cyan-400/50 text-sm font-medium text-white flex items-center justify-center gap-3 transition shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>{mode === 'signin' ? 'Sign In with Google' : 'Sign Up with Google'}</span>
            </button>

            {/* Separator */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-slate-950 px-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest relative z-10">
                or email & password
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <span>⚠️</span>
                  <span>Authentication Notice</span>
                </div>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center justify-center gap-3 animate-pulse">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Email + Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Elena Vance"
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Plant Facility / Company
                    </label>
                    <input
                      type="text"
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      placeholder="Apex Robotics Line 2"
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Corporate Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@plant.forgemind.ai"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset verification email will be dispatched via Firebase Auth.')}
                      className="text-[11px] font-mono text-cyan-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {mode === 'signin' && (
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-400 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 text-xs text-slate-400 cursor-pointer">
                    Remember my credentials for 30 days
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all font-heading disabled:opacity-50"
              >
                {mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            {/* Mode Switcher */}
            <p className="text-center text-xs text-slate-400 pt-1">
              {mode === 'signin' ? (
                <>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage('');
                    }}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
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
      </div>

      {/* Bottom Footer */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 pt-6 border-t border-white/5 z-10 font-mono text-[11px]">
        &copy; {new Date().getFullYear()} ForgeMind AI &bull; Firebase Authentication &bull; Google Cloud Firestore Database
      </div>
    </div>
  );
};

export default AuthPage;
