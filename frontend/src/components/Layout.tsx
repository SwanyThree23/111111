import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Video, BarChart3, Settings, LogOut, Menu, X,
  Users, Radio, Tv2, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/utils/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Streams', href: '/streams', icon: Video },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const quickActions = [
  { name: 'Go Live', href: '/go-live', icon: Radio, external: true },
  { name: 'Watch Party', href: '/watch-party/new', icon: Tv2, external: true },
];

const FANBASE_CHANNELS = [
  { name: 'Memoirs of a Shy Girl', url: 'https://fanbase.app.link/aFLSLHFDe2b' },
  { name: 'AIVerse', url: 'https://fanbase.app.link/nR0eOqEDe2b' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleQuickAction = (href: string) => {
    if (href === '/watch-party/new') {
      // Create a new watch party room
      const roomName = `party-${Date.now()}`;
      navigate(`/watch-party/${roomName}`);
    } else {
      navigate(href);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-purple-900 via-indigo-900 to-blue-900 text-white transition-all duration-300 flex flex-col fixed h-full z-50`}
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-white">SwanyThree</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition ml-auto"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-1 border-b border-white/10">
          {sidebarOpen && <p className="text-xs text-white/40 font-medium mb-2">QUICK ACTIONS</p>}
          {quickActions.map((action) => (
            <button
              key={action.name}
              onClick={() => handleQuickAction(action.href)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              <action.icon className="w-5 h-5 text-pink-300" />
              {sidebarOpen && <span className="font-semibold text-sm text-white">{action.name}</span>}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarOpen && <p className="text-xs text-white/40 font-medium mb-2">NAVIGATION</p>}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Fanbase Links */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-white/40 font-medium mb-2">FANBASE NETWORK</p>
            {FANBASE_CHANNELS.map(ch => (
              <a
                key={ch.name}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white py-1.5 transition"
              >
                <ExternalLink className="w-3 h-3" />
                {ch.name}
              </a>
            ))}
          </div>
        )}

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} mb-3`}>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-xs text-white/60 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`w-full flex items-center ${
              sidebarOpen ? 'gap-3' : 'justify-center'
            } px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
