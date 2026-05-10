import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Video, BarChart3, Settings, LogOut,
  Menu, ChevronLeft, Radio, Tv2, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '@/utils/auth';
import { useWebSocket } from '@/hooks/useWebSocket';

const NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Streams', href: '/streams', icon: Video },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();

  const handleGoLive = () => navigate('/go-live');
  const handleWatchParty = () => navigate(`/watch-party/party-${Date.now()}`);

  return (
    <div className="min-h-screen flex bg-obsidian">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-64'} flex-shrink-0 bg-obsidian-50 border-r border-white/8
                    flex flex-col fixed h-full z-40 transition-all duration-300`}
      >
        {/* Brand */}
        <div className={`flex items-center border-b border-white/8 h-16 ${collapsed ? 'justify-center px-4' : 'px-5 gap-3'}`}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-display text-gold text-2xl tracking-widest">SEEWHY</span>
              <span className="font-display text-white/60 text-2xl tracking-widest"> LIVE</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-burgundy rounded-lg flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-white/40 hover:text-white"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Actions */}
        <div className={`p-3 border-b border-white/8 space-y-2`}>
          {!collapsed && (
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest px-2 mb-2">
              Broadcast
            </p>
          )}
          <button
            onClick={handleGoLive}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark
                       transition text-white font-semibold text-sm ${collapsed ? 'justify-center' : ''}`}
            title="Go Live"
          >
            <Radio className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Go Live</span>}
            {!collapsed && (
              <span className="ml-auto">
                <span className="live-dot" />
              </span>
            )}
          </button>
          <button
            onClick={handleWatchParty}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10
                       border border-white/10 transition text-white/70 hover:text-white font-medium text-sm
                       ${collapsed ? 'justify-center' : ''}`}
            title="Watch Party"
          >
            <Tv2 className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Watch Party</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest px-2 mb-2">
              Navigate
            </p>
          )}
          {NAV.map((item) => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                title={item.name}
                className={`${active ? 'nav-link-active' : 'nav-link'} ${collapsed ? 'justify-center px-3' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Connection status */}
        {!collapsed && (
          <div className="px-4 py-2 flex items-center gap-2 text-xs font-mono text-white/30">
            {isConnected ? (
              <><Wifi className="w-3 h-3 text-green-500" /> Live updates active</>
            ) : (
              <><WifiOff className="w-3 h-3 text-red-500/60" /> Disconnected</>
            )}
          </div>
        )}

        {/* User section */}
        <div className="p-3 border-t border-white/8">
          <div className={`flex items-center gap-3 mb-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 bg-gradient-to-br from-burgundy to-gold/60 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'S'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.username || 'Creator'}</p>
                <p className="text-xs text-white/40 font-mono truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => logout()}
            title="Logout"
            className={`w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-red-900/30
                       text-white/50 hover:text-red-400 rounded-xl transition text-sm font-medium
                       ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 ${collapsed ? 'ml-[72px]' : 'ml-64'} transition-all duration-300 min-h-screen`}>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
