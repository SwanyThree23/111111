import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './utils/auth';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import StreamManager from './pages/StreamManager';
import StreamView from './pages/StreamView';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import VdoGuests from './pages/VdoGuests';
import WatchParty from './pages/WatchParty';
import GoLive from './pages/GoLive';
import Onboarding from './pages/Onboarding';
import UserProfile from './pages/UserProfile';

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useAuth.setState({ user: null, token: null, isAuthenticated: false });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        localStorage.setItem('token', session.access_token);
        useAuth.setState({ token: session.access_token });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-obsidian">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl border-2 border-gold/30 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-burgundy to-gold/60 rounded-2xl animate-pulse" />
          </div>
          <div
            className="absolute -inset-2 rounded-3xl border border-gold/20 animate-spin"
            style={{ animationDuration: '4s' }}
          />
        </div>
        <p className="text-gold font-display text-3xl tracking-widest mb-1">SEEWHY LIVE</p>
        <p className="text-white/40 text-sm font-mono">Loading your broadcast suite...</p>
        <div className="mt-6 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gold/60 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/onboarding" element={isAuthenticated ? <Onboarding /> : <Navigate to="/login" />} />

      <Route
        path="/watch-party/:roomName"
        element={isAuthenticated ? <WatchParty /> : <Navigate to="/login" />}
      />
      <Route
        path="/go-live"
        element={isAuthenticated ? <GoLive /> : <Navigate to="/login" />}
      />

      {/* Public profile and discover — accessible without login when inside layout */}
      <Route
        element={
          isAuthenticated
            ? <OnboardingGuard><Layout /></OnboardingGuard>
            : <Navigate to="/login" />
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/streams" element={<StreamManager />} />
        <Route path="/streams/:id" element={<StreamView />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/vdo-guests/:streamId" element={<VdoGuests />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile/:username" element={<UserProfile />} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
