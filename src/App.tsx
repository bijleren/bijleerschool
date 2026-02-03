import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { PublicWebWijzerAccess } from './components/webwijzer/PublicWebWijzerAccess';
import { PublicTechniqueView } from './components/teaching/PublicTechniqueView';
import { PublicFAQView } from './components/teaching/PublicFAQView';
import { LandingPage } from './components/landing/LandingPage';
import { GraduationCap, ArrowLeft } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">BijleerSchool wordt geladen...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RootRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Check for password reset parameters in both query string and hash
    const queryParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));

    // Check if this is a password reset link
    const isRecoveryInQuery = queryParams.get('type') === 'recovery';
    const isRecoveryInHash = hashParams.get('type') === 'recovery';
    const hasAccessTokenInQuery = queryParams.has('access_token');
    const hasAccessTokenInHash = hashParams.has('access_token');

    if (isRecoveryInQuery || isRecoveryInHash || hasAccessTokenInQuery || hasAccessTokenInHash) {
      // Redirect to reset-password page with all parameters preserved
      if (location.hash) {
        navigate(`/reset-password${location.hash}`, { replace: true });
      } else if (location.search) {
        navigate(`/reset-password${location.search}`, { replace: true });
      }
      return;
    }

    // Check for other special parameters
    const hash = queryParams.get('h');
    const techniqueId = queryParams.get('technique');
    const faqId = queryParams.get('faq');

    if (hash) {
      navigate(`/webwijzer?h=${hash}`, { replace: true });
    } else if (techniqueId) {
      if (user && !loading) {
        // User is logged in, navigate to dashboard
        sessionStorage.setItem('selectedTechniqueId', techniqueId);
        navigate('/dashboard', { replace: true });
      } else if (!loading) {
        // User is not logged in, show public view
        navigate(`/technique?technique=${techniqueId}`, { replace: true });
      }
    } else if (faqId) {
      if (user && !loading) {
        // User is logged in, navigate to dashboard FAQ section
        navigate('/dashboard?tab=teaching&subtab=faq', { replace: true });
      } else if (!loading) {
        // User is not logged in, show public FAQ view
        navigate(`/faq?faq=${faqId}`, { replace: true });
      }
    }
  }, [location.search, location.hash, navigate, user, loading]);

  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.substring(1));
  const hash = params.get('h');
  const techniqueId = params.get('technique');
  const faqId = params.get('faq');
  const isPasswordReset = params.get('type') === 'recovery' || hashParams.get('type') === 'recovery' || params.has('access_token') || hashParams.has('access_token');

  if (hash || techniqueId || faqId || isPasswordReset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">BijleerSchool wordt geladen...</p>
        </div>
      </div>
    );
  }

  return <LandingPage />;
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <a
        href="/"
        className="fixed top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Terug naar home</span>
      </a>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">BijleerSchool</h1>
          <p className="text-lg text-gray-600">Didactische toolkit voor leerkracht en leerling</p>
        </div>

        {children}

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2025 BijleerSchool. Alle rechten voorbehouden.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/webwijzer" element={<PublicWebWijzerAccess />} />
          <Route path="/technique" element={<PublicTechniqueView />} />
          <Route path="/faq" element={<PublicFAQView />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route
            path="/forgot-password"
            element={
              <AuthLayout>
                <ForgotPasswordForm />
              </AuthLayout>
            }
          />
          <Route
            path="/reset-password"
            element={
              <AuthLayout>
                <ResetPasswordForm />
              </AuthLayout>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
