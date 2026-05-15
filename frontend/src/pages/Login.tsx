import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/utils/auth';
import { Radio, Eye, EyeOff, Loader } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian p-4">
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(128,0,32,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(201,175,55,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-burgundy/20 border border-burgundy/40 rounded-2xl mb-4">
            <Radio className="w-8 h-8 text-burgundy-light" />
          </div>
          <h1 className="font-display text-5xl tracking-widest text-white">
            SEEWHY<span className="text-gold"> LIVE</span>
          </h1>
          <p className="text-white/40 font-mono text-sm mt-2">Broadcast Control Suite</p>
        </div>

        {/* Card */}
        <div className="bg-obsidian-50 border border-white/8 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
          <p className="text-white/40 text-sm font-mono mb-6">Access your creator dashboard</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-xl text-red-400 text-sm font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-white/50 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="creator@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-white/50 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <><Loader className="w-4 h-4 animate-spin" /> Authenticating...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/8 text-center">
            <p className="text-white/40 text-sm">
              No account?{' '}
              <Link to="/register" className="text-gold hover:text-gold-light transition font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs font-mono mt-6">
          SeeWhy LIVE v9.6 · SwanyThree EntTech
        </p>
      </div>
    </div>
  );
}
