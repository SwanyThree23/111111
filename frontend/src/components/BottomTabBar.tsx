import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Video, BarChart3, Settings, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Streams', href: '/streams', icon: Video },
  { name: 'Live', href: '/go-live', icon: Radio, special: true },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end"
      style={{ background: '#12121C', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => {
        const active = location.pathname === tab.href || location.pathname.startsWith(tab.href + '/');

        if (tab.special) {
          return (
            <button
              key={tab.name}
              onClick={() => navigate('/go-live')}
              className="flex-1 flex flex-col items-center justify-center py-2 relative"
            >
              <div className="w-12 h-12 -mt-5 mb-0.5 bg-burgundy rounded-full flex items-center justify-center shadow-lg"
                   style={{ boxShadow: '0 0 20px rgba(128,0,32,0.5), 0 4px 12px rgba(0,0,0,0.4)' }}>
                <tab.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-mono text-white/40 mt-0.5">{tab.name}</span>
            </button>
          );
        }

        return (
          <Link
            key={tab.name}
            to={tab.href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
          >
            <tab.icon
              className={`w-5 h-5 transition-colors ${active ? 'text-gold' : 'text-white/30'}`}
            />
            <span
              className={`text-[10px] font-mono transition-colors ${active ? 'text-gold' : 'text-white/30'}`}
            >
              {tab.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
