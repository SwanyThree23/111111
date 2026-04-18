'use client';
import { useState } from 'react';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0806] flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <h1 className="font-display text-4xl text-[#C8FF00] mb-6">SIGN IN</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-ui uppercase px-1">Username or Email</label>
            <input 
              className="input transition-all focus:border-[#C8FF00]" 
              placeholder="e.g. aura_stream or aura@example.com" 
              value={form.email} 
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} 
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-ui uppercase px-1">Password</label>
            <input 
              className="input transition-all focus:border-[#C8FF00]" 
              type="password" 
              placeholder="••••••••" 
              value={form.password} 
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} 
              required 
            />
          </div>
          <button type="submit" className="btn-volt w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          No account? <Link href="/auth/register" className="text-[#C8FF00] hover:underline">Join Free</Link>
        </p>
      </div>
    </div>
  );
}
