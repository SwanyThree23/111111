'use client';
import { useState } from 'react';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form);
      router.push('/onboarding');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0806] flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <h1 className="font-display text-4xl text-[#C8FF00] mb-2">JOIN SEEWHY LIVE</h1>
        <p className="text-gray-500 text-sm mb-6">Creator-first platform. 90% of every dollar goes to you.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input" placeholder="Display Name" value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} />
          <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required pattern="[a-zA-Z0-9_]+" title="Letters, numbers, underscores only" />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          <input className="input" type="password" placeholder="Password (8+ chars)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required minLength={8} />
          <button type="submit" className="btn-volt w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Have an account? <Link href="/auth/login" className="text-[#C8FF00] hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
