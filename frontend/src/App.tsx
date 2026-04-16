import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './utils/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StreamManager from './pages/StreamManager';
import StreamView from './pages/StreamView';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import VdoGuests from './pages/VdoGuests';
import WatchParty from './pages/WatchParty';
import GoLive from './pages/GoLive';
import Onboarding from './pages/Onboarding';
import { Loader } from 'lucide-react';

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !localStorage.getItem('onboardingComplete')) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, navigate]);

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, isLoading, loadUser } = useAuth();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        {/* Animated logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl animate-pulse" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-white/20 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <p className="text-white text-2xl font-bold mb-2">SwanyThree</p>
        <p className="text-white/60 text-sm">Loading your platform...</p>
        <Loader className="w-6 h-6 text-white/40 animate-spin mt-4" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />

      {/* Onboarding (auth required) */}
      <Route path="/onboarding" element={isAuthenticated ? <Onboarding /> : <Navigate to="/login" />} />

      {/* Watch Party (standalone, full-screen) */}
      <Route
        path="/watch-party/:roomName"
        element={isAuthenticated ? <WatchParty /> : <Navigate to="/login" />}
      />

      {/* Go Live (standalone, full-screen) */}
      <Route
        path="/go-live"
        element={isAuthenticated ? <GoLive /> : <Navigate to="/login" />}
      />

      {/* Main app with layout */}
      <Route
        element={
          isAuthenticated
            ? <OnboardingGuard><Layout /></OnboardingGuard>
            : <Navigate to="/login" />
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/streams" element={<StreamManager />} />
        <Route path="/streams/:id" element={<StreamView />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/vdo-guests/:streamId" element={<VdoGuests />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
