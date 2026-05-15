import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/utils/auth';
import { Radio, Eye, EyeOff, Loader, Check } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const pwStrength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0;
  const pwMatch = confirm.length > 0 && password === confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await register(email, username, password);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(128,0,32,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(201,175,55,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-burgundy/20 border border-burgundy/40 rounded-2xl mb-4">
            <Radio className="w-8 h-8 text-burgundy-light" />
          </div>
          <h1 className="font-display text-5xl tracking-widest text-white">
            SEEWHY<span className="text-gold"> LIVE</span>
          </h1>
          <p className="text-white/40 font-mono text-sm mt-2">Join the Creator Network</p>
        </div>

        <div className="bg-obsidian-50 border border-white/8 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
          <p className="text-white/40 text-sm font-mono mb-6">Start earning 90% on every tip</p>

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
                Creator Handle
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="input"
                placeholder="yourhandle"
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
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
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 h-1 rounded-full transition-colors ${
                        pwStrength >= lvl
                          ? lvl === 3 ? 'bg-green-500' : lvl === 2 ? 'bg-gold' : 'bg-red-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-mono text-white/50 uppercase tracking-widest mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                {confirm.length > 0 && (
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${pwMatch ? 'text-green-400' : 'text-red-400'}`}>
                    {pwMatch ? <Check className="w-4 h-4" /> : <span className="text-xs font-mono">✗</span>}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <><Loader className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/8 text-center">
            <p className="text-white/40 text-sm">
              Already a creator?{' '}
              <Link to="/login" className="text-gold hover:text-gold-light transition font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs font-mono mt-6">
          SeeWhy LIVE v9.6 · SwanyThree EntTech
        </p>
      </div>
    </div>
  );
}
