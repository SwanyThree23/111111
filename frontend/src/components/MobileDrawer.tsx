import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Video, BarChart3, Settings, LogOut,
  Radio, Tv2, X, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/utils/auth';

const NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Streams', href: '/streams', icon: Video },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close on route change
  useEffect(() => { onClose(); }, [location.pathname]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col"
        style={{ background: '#12121C', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="font-display text-2xl tracking-widest text-white">
            SEEWHY<span className="text-gold"> LIVE</span>
          </span>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="p-4 space-y-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => navigate('/go-live')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-burgundy hover:bg-burgundy-dark rounded-xl text-white font-semibold text-sm transition"
            style={{ border: '1px solid rgba(155,35,53,0.3)' }}
          >
            <Radio className="w-4 h-4" />
            <span>Go Live</span>
            <span className="ml-auto live-dot" />
          </button>
          <button
            onClick={() => navigate(`/watch-party/party-${Date.now()}`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white font-medium text-sm transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Tv2 className="w-4 h-4" />
            Watch Party
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${
                  active ? 'nav-link-active' : 'nav-link'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Fanbase links */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-2">Fanbase Network</p>
          {[
            { name: 'Memoirs of a Shy Girl', url: 'https://fanbase.app.link/aFLSLHFDe2b' },
            { name: 'AIVerse', url: 'https://fanbase.app.link/nR0eOqEDe2b' },
          ].map((ch) => (
            <a
              key={ch.name}
              href={ch.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-1.5 text-xs text-white/30 hover:text-white/60 font-mono transition"
            >
              <ExternalLink className="w-3 h-3" />
              {ch.name}
            </a>
          ))}
        </div>

        {/* User + logout */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-burgundy to-gold/60 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.username || 'Creator'}</p>
              <p className="text-xs text-white/40 font-mono truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/40 hover:text-red-400 text-sm font-medium transition"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
