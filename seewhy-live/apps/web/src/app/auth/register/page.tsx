'use client';
import { useState } from 'react';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff, Check } from 'lucide-react';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '' });
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = (() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthColor = ['#FF3B3B', '#FF7A1A', '#D4AF37', '#C8FF00'][Math.max(0, passwordStrength - 1)] ?? '#242424';
  const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Strong'][Math.max(0, passwordStrength - 1)] ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be 8+ characters'); return; }
    try {
      await register(form);
      router.push('/onboarding');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0806] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#C8FF00]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass rounded-2xl p-8 w-full max-w-md relative"
      >
        {/* Logo */}
        <Link href="/" className="font-display text-3xl tracking-wider text-[#C8FF00] block mb-1">
          SEEWHY<span className="text-white">LIVE</span>
        </Link>
        <p className="text-gray-500 text-sm mb-2">Creator-first streaming. 90% of every dollar is yours.</p>

        {/* Value props */}
        <div className="flex flex-wrap gap-3 mb-6 mt-3">
          {['90/10 Split', 'AI Overlays', 'Multi-Platform'].map((v) => (
            <span key={v} className="inline-flex items-center gap-1 text-xs text-[#C8FF00]/80 bg-[#C8FF00]/5 px-2 py-1 rounded-full">
              <Check size={10} /> {v}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="register-display" className="text-xs text-gray-500 font-ui uppercase tracking-wider px-1">
              Display Name
            </label>
            <input
              id="register-display"
              className="input"
              placeholder="How viewers see you"
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-username" className="text-xs text-gray-500 font-ui uppercase tracking-wider px-1">
              Username
            </label>
            <input
              id="register-username"
              className="input"
              placeholder="Letters, numbers, underscores"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              required
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers, underscores only"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-email" className="text-xs text-gray-500 font-ui uppercase tracking-wider px-1">
              Email
            </label>
            <input
              id="register-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-password" className="text-xs text-gray-500 font-ui uppercase tracking-wider px-1">
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                className="input pr-10"
                type={showPassword ? 'text' : 'password'}
                placeholder="8+ characters"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{ background: i <= passwordStrength ? strengthColor : '#242424' }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-ui" style={{ color: strengthColor }}>
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="btn-volt w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0C0806] border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              <>Create Account <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#C8FF00] hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
