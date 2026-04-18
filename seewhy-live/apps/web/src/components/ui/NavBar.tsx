'use client';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { Zap, LogOut, BarChart2 } from 'lucide-react';

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-[#0C0806]/90 backdrop-blur-md border-b border-[#1E1E1E]">
      <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-wider text-[#C8FF00]">
          SEEWHY<span className="text-white">LIVE</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/studio" className="btn-volt py-2 px-4 text-sm flex items-center gap-2">
                <Zap size={14} /> Go Live
              </Link>
              <Link href="/dashboard" className="btn-ghost py-2 px-4 text-sm flex items-center gap-2">
                <BarChart2 size={14} /> Dashboard
              </Link>
              <button onClick={logout} className="text-gray-500 hover:text-white transition-colors p-2">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost py-2 px-4 text-sm">Sign In</Link>
              <Link href="/auth/register" className="btn-volt py-2 px-4 text-sm">Join Free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
