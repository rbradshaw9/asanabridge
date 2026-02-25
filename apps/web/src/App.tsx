import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import OnboardingWizard from './components/OnboardingWizard';
import AccountSettingsPage from './components/AccountSettingsPage';
import AdminDashboard from './components/AdminDashboard';
import SupportForm from './components/SupportForm';

// ─── Protected Route ──────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

// ─── Admin Route ──────────────────────────────────────────────────────────────

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user?.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage mode="login" />} />
          <Route path="/register" element={<LoginPage mode="register" />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={<RequireAuth><Dashboard /></RequireAuth>}
          />
          <Route
            path="/onboarding"
            element={<RequireAuth><OnboardingWizard /></RequireAuth>}
          />
          <Route
            path="/account"
            element={<RequireAuth><AccountSettingsPage /></RequireAuth>}
          />
          <Route
            path="/support"
            element={<RequireAuth><SupportForm /></RequireAuth>}
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              </RequireAuth>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
