import React, { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import { ModelKey, PipelineFullData } from './types/forgemind';
import { getPipelineData } from './services/api';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage, UserProfile } from './components/auth/AuthPage';
import { subscribeToAuthChanges, logoutUser } from './services/firebase';
import { AppLayout } from './components/dashboard/AppLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { UploadView } from './components/upload/UploadView';
import { AnalysisResultView } from './components/analysis/AnalysisResultView';
import { HistoryView } from './components/history/HistoryView';
import { ReportsView } from './components/reports/ReportsView';
import { ProfileView } from './components/profile/ProfileView';
import { MainNavRoute } from './components/dashboard/Sidebar';
import { getInspectionById } from './services/inspectionStore';
import { InspectionRecord } from './types/inspection';
import { UploadProvider } from './context/UploadContext';
import { UploadErrorBoundary } from './components/common/UploadErrorBoundary';

// Default guest quality engineer user for instant offline and direct-route testing
const DEFAULT_USER: UserProfile = {
  uid: 'engineer_lead_01',
  name: 'Lead Quality Engineer',
  email: 'engineer@forgemind.ai',
  facility: 'Plant Alpha (Line 1)',
  role: 'Quality Lead',
  department: 'Non-Destructive Testing',
  authProvider: 'email',
};

const AnalysisRouteWrapper: React.FC<{
  pipelineData: PipelineFullData | null;
}> = ({ pipelineData }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<InspectionRecord | null>(() =>
    id ? getInspectionById(id) : null
  );

  useEffect(() => {
    if (id) {
      const rec = getInspectionById(id);
      setRecord(rec);
    } else {
      setRecord(null);
    }
  }, [id]);

  return (
    <AnalysisResultView
      record={record}
      pipelineData={pipelineData}
      onBackToDashboard={() => navigate('/dashboard')}
      onNavigateToUpload={() => navigate('/upload')}
    />
  );
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // User state initialized with cached or default user for resilience
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const cached = localStorage.getItem('forgemind_active_user');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_USER;
  });

  // Active Line Model & Process Telemetry
  const [currentModel, setCurrentModel] = useState<ModelKey>('Model_1');
  const [pipelineData, setPipelineData] = useState<PipelineFullData | null>(null);

  // 1. Subscribe to Firebase Auth and manage session persistence
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authenticatedUser) => {
      if (authenticatedUser) {
        setCurrentUser(authenticatedUser);
        try {
          localStorage.setItem('forgemind_active_user', JSON.stringify(authenticatedUser));
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch pipeline telemetry data
  useEffect(() => {
    getPipelineData(currentModel)
      .then((data) => setPipelineData(data))
      .catch((err) => console.warn('Pipeline fetch notice:', err));
  }, [currentModel]);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    localStorage.removeItem('forgemind_active_user');
    setCurrentUser(DEFAULT_USER);
    navigate('/login');
  };

  // Derive active module from path
  const getActiveModule = (): MainNavRoute => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/upload')) return 'upload';
    if (p.includes('/analysis')) return 'upload';
    if (p.includes('/history')) return 'history';
    if (p.includes('/reports')) return 'reports';
    if (p.includes('/profile')) return 'profile';
    return 'dashboard';
  };

  const activeModule = getActiveModule();

  // Layout wrapper component for protected shell
  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AppLayout
      currentRoute={activeModule}
      onNavigate={(route) => navigate('/' + route)}
      user={currentUser}
      onSignOut={handleSignOut}
      currentModel={currentModel}
      onModelChange={setCurrentModel}
    >
      {children}
    </AppLayout>
  );

  return (
    <UploadProvider>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <LandingPage
              onNavigateToAuth={(mode) => navigate('/' + mode)}
            />
          }
        />
        <Route
          path="/login"
          element={
            <AuthPage
              initialMode="signin"
              onAuthSuccess={(user) => {
                setCurrentUser(user);
                try {
                  localStorage.setItem('forgemind_active_user', JSON.stringify(user));
                } catch {}
                navigate('/dashboard');
              }}
              onBackToLanding={() => navigate('/')}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <AuthPage
              initialMode="signup"
              onAuthSuccess={(user) => {
                setCurrentUser(user);
                try {
                  localStorage.setItem('forgemind_active_user', JSON.stringify(user));
                } catch {}
                navigate('/dashboard');
              }}
              onBackToLanding={() => navigate('/')}
            />
          }
        />

        {/* Authenticated Dashboard & Decision Platform Routes */}
        <Route
          path="/dashboard"
          element={
            <Shell>
              <DashboardView
                user={currentUser}
                onNavigateToUpload={() => navigate('/upload')}
                onNavigateToHistory={() => navigate('/history')}
                onNavigateToAssistant={() => window.dispatchEvent(new CustomEvent('forgemind:open-chat'))}
                onViewAnalysis={(id) => navigate(`/analysis/${id}`)}
              />
            </Shell>
          }
        />

        <Route
          path="/upload"
          element={
            <Shell>
              <UploadErrorBoundary fallbackTitle="Upload section could not be loaded.">
                <UploadView
                  currentModel={currentModel}
                  onAnalysisComplete={(id) => navigate(`/analysis/${id}`)}
                  onBackToDashboard={() => navigate('/dashboard')}
                />
              </UploadErrorBoundary>
            </Shell>
          }
        />

        <Route
          path="/analysis/:id"
          element={
            <Shell>
              <AnalysisRouteWrapper pipelineData={pipelineData} />
            </Shell>
          }
        />

        <Route
          path="/production"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/history"
          element={
            <Shell>
              <HistoryView
                onViewAnalysis={(id) => navigate(`/analysis/${id}`)}
                onNavigateToUpload={() => navigate('/upload')}
              />
            </Shell>
          }
        />

        <Route
          path="/assistant"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/reports"
          element={
            <Shell>
              <ReportsView />
            </Shell>
          }
        />

        <Route
          path="/profile"
          element={
            <Shell>
              <ProfileView
                user={currentUser}
                onUpdateUser={(updated) => {
                  setCurrentUser(updated);
                  try {
                    localStorage.setItem('forgemind_active_user', JSON.stringify(updated));
                  } catch {}
                }}
              />
            </Shell>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </UploadProvider>
  );
};

export default App;
