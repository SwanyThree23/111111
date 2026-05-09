'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, LogOut, BarChart2, Settings, Archive, Sword,
  Menu, X, Wrench, User as UserIcon, ChevronDown,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/studio', label: 'Studio', icon: Zap },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { href: '/vault', label: 'Vault', icon: Archive },
  { href: '/tools', label: 'Tools', icon: Wrench },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <nav className="sticky top-0 z-50 bg-[#0C0806]/90 backdrop-blur-md border-b border-[#1E1E1E]">
      <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display text-2xl tracking-wider text-[#C8FF00] shrink-0">
          SEEWHY<span className="text-white">LIVE</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 ml-8">
          {user && NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-ui transition-all ${
                  active
                    ? 'bg-[#C8FF00]/10 text-[#C8FF00]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Go Live CTA */}
              <Link href="/studio" className="hidden sm:flex btn-volt py-1.5 px-4 text-sm items-center gap-1.5">
                <Zap size={14} />Go Live
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C8FF00] to-[#A855F7] flex items-center justify-center text-[#0C0806] text-xs font-bold">
                    {(user.displayName ?? user.username)?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="hidden sm:inline text-sm text-gray-300 max-w-[100px] truncate">{user.displayName ?? user.username}</span>
                  <ChevronDown size={12} className="text-gray-500" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-[#161616] border border-[#242424] rounded-xl p-1.5 z-50 shadow-2xl"
                      >
                        <div className="px-3 py-2 border-b border-[#1E1E1E] mb-1">
                          <p className="text-sm font-semibold text-white truncate">{user.displayName ?? user.username}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                          <BarChart2 size={14} /> Dashboard
                        </Link>
                        <Link href="/vault" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                          <Archive size={14} /> Vault
                        </Link>
                        <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                          <Settings size={14} /> Settings
                        </Link>
                        <div className="border-t border-[#1E1E1E] mt-1 pt-1">
                          <button
                            onClick={() => { logout(); setUserMenuOpen(false); }}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#FF3B3B] hover:bg-[#FF3B3B]/10 rounded-lg transition-colors w-full text-left"
                          >
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu toggle */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-gray-400 hover:text-white p-1.5">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost py-1.5 px-4 text-sm">Sign In</Link>
              <Link href="/auth/register" className="btn-volt py-1.5 px-4 text-sm">Join Free</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && user && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[#1E1E1E]"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-ui transition-all ${
                      active ? 'bg-[#C8FF00]/10 text-[#C8FF00]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon size={16} /> {link.label}
                  </Link>
                );
              })}
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-ui text-gray-400 hover:text-white transition-all"
              >
                <Settings size={16} /> Settings
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
