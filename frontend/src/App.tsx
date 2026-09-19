import React, { useState, useEffect } from 'react';
import { ModelKey, PipelineFullData } from './types/forgemind';
import { getPipelineData, getSystemStatus } from './services/api';
import { Header } from './components/Header';
import { ProvenanceBanner } from './components/ProvenanceBanner';
import { PipelineNav, TabId } from './components/PipelineNav';
import { OverviewTab } from './components/tabs/OverviewTab';
import { ProcessHealthTab } from './components/tabs/ProcessHealthTab';
import { BottlenecksTab } from './components/tabs/BottlenecksTab';
import { RootCauseTab } from './components/tabs/RootCauseTab';
import { EconomicsTab } from './components/tabs/EconomicsTab';
import { SimulationTab } from './components/tabs/SimulationTab';
import { RecommendationsTab } from './components/tabs/RecommendationsTab';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage, AuthMode, UserProfile } from './components/auth/AuthPage';

export type AppView = 'landing' | 'auth' | 'dashboard';

export const App: React.FC = () => {
  // Read initial route from URL hash
  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#dashboard') return 'dashboard';
      if (window.location.hash === '#signin' || window.location.hash === '#signup') return 'auth';
    }
    return 'landing';
  });

  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#signup') {
      return 'signup';
    }
    return 'signin';
  });

  // Stored authenticated user profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('forgemind_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentModel, setCurrentModel] = useState<ModelKey>('Model_1');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [pipelineData, setPipelineData] = useState<PipelineFullData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Initializing...');
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

  // Sync state with browser URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#dashboard') {
        setView('dashboard');
      } else if (hash === '#signin') {
        setAuthMode('signin');
        setView('auth');
      } else if (hash === '#signup') {
        setAuthMode('signup');
        setView('auth');
      } else if (hash === '#home' || hash.startsWith('#') || !hash) {
        if (hash === '#home' || !hash) {
          setView('landing');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check system status when viewing dashboard
  useEffect(() => {
    if (view !== 'dashboard') return;

    getSystemStatus()
      .then((st) => {
        setStatusText(st.status === 'healthy' ? 'Pipeline Active' : 'Standby');
        setIsDbConnected(st.database.includes('Connected'));
      })
      .catch(() => {
        setStatusText('API Standby');
        setIsDbConnected(false);
      });
  }, [view]);

  // Fetch pipeline data when in dashboard and model changes
  useEffect(() => {
    if (view !== 'dashboard') return;

    setLoading(true);
    setError(null);
    getPipelineData(currentModel)
      .then((data) => {
        setPipelineData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Pipeline data fetch error:', err);
        setError('Could not connect to the FastAPI backend. Ensure uvicorn is running on http://127.0.0.1:8000.');
        setLoading(false);
      });
  }, [view, currentModel]);

  // 1. Landing Page View
  if (view === 'landing') {
    return (
      <LandingPage
        onNavigateToAuth={(mode) => {
          setAuthMode(mode);
          setView('auth');
          window.location.hash = `#${mode}`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  // 2. Dedicated Auth Page View (Real Sign In & Sign Up with Email / Google)
  if (view === 'auth') {
    return (
      <AuthPage
        initialMode={authMode}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setView('dashboard');
          window.location.hash = '#dashboard';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onBackToLanding={() => {
          setView('landing');
          window.location.hash = '#home';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  // 3. Analytics Dashboard View (Preserves all existing ForgeMind AI platform functionality)
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Brand Header with User Profile, Sign Out, and Landing Page Navigation */}
      <Header
        currentModel={currentModel}
        onModelChange={setCurrentModel}
        statusText={statusText}
        isDbConnected={isDbConnected}
        user={currentUser}
        onNavigateToLanding={() => {
          setView('landing');
          window.location.hash = '#home';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSignOut={() => {
          setCurrentUser(null);
          localStorage.removeItem('forgemind_user');
          setView('landing');
          window.location.hash = '#home';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Provenance & Evidence Taxonomy Banner */}
      <ProvenanceBanner />

      {/* 7-Step Pipeline Navigation */}
      <PipelineNav activeTab={activeTab} onTabSelect={setActiveTab} />

      {/* Main Content Pane */}
      <main className="min-h-[500px]">
        {loading && (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-cyan-400">Executing ForgeMind Pipeline &bull; Scikit-Learn Modeling...</p>
          </div>
        )}

        {error && !loading && (
          <div className="glass-card border-rose-500/40 p-6 text-center space-y-3">
            <div className="text-2xl">⚠️</div>
            <h3 className="text-lg font-bold text-white">Backend Connection Notice</h3>
            <p className="text-xs text-slate-300 max-w-lg mx-auto">{error}</p>
            <p className="text-[11px] font-mono text-slate-400">
              Run: <code className="bg-slate-950 px-2 py-1 rounded text-cyan-300">python backend/server.py</code>
            </p>
          </div>
        )}

        {!loading && pipelineData && (
          <>
            {activeTab === 'overview' && <OverviewTab data={pipelineData} />}
            {activeTab === 'health' && <ProcessHealthTab data={pipelineData.process_health} />}
            {activeTab === 'bottlenecks' && <BottlenecksTab data={pipelineData.bottleneck} />}
            {activeTab === 'root-cause' && (
              <RootCauseTab
                rootCauseData={pipelineData.root_cause}
                mlData={pipelineData.ml_feature_importance}
              />
            )}
            {activeTab === 'economics' && (
              <EconomicsTab
                data={pipelineData.economics}
                isDbConnected={isDbConnected}
              />
            )}
            {activeTab === 'simulation' && (
              <SimulationTab
                data={pipelineData.simulation}
                model={currentModel}
              />
            )}
            {activeTab === 'recommendations' && (
              <RecommendationsTab recommendations={pipelineData.recommendations} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row justify-between items-center gap-2 p-4 text-xs text-slate-500 border-t border-white/5">
        <div>
          <strong className="text-slate-300">ForgeMind AI</strong> &bull; Production Architecture: React + TypeScript + Tailwind CSS &bull; FastAPI &bull; Scikit-Learn &bull; PostgreSQL
        </div>
        <div className="font-mono text-[10px]">
          Target Deployments: Vercel (Frontend) + Render (Backend/PostgreSQL)
        </div>
      </footer>
    </div>
  );
};

export default App;
