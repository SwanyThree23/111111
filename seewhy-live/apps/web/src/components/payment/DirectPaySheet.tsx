'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, DollarSign } from 'lucide-react';

interface DirectPayLink {
  id: string;
  platform: string;
  handle: string;
  url: string | null;
  isActive: boolean;
}

const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  paypal:  { label: 'PayPal',   color: '#003087', icon: '💙' },
  cashapp: { label: 'Cash App', color: '#00D632', icon: '💵' },
  venmo:   { label: 'Venmo',    color: '#3D95CE', icon: '🔵' },
  zelle:   { label: 'Zelle',    color: '#6D1ED4', icon: '💜' },
  chime:   { label: 'Chime',    color: '#2EC4B6', icon: '🟢' },
};

interface Props {
  creatorId: string;
  creatorName: string;
  apiUrl: string;
  onClose: () => void;
}

export default function DirectPaySheet({ creatorId, creatorName, apiUrl, onClose }: Props) {
  const [links, setLinks] = useState<DirectPayLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/directpay/creator/${creatorId}`)
      .then((r) => r.json())
      .then((data: DirectPayLink[]) => setLinks(data.filter((l) => l.isActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [creatorId, apiUrl]);

  function openLink(link: DirectPayLink) {
    const href = link.url ?? link.handle;
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-900 rounded-t-2xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base">Send Direct</h2>
            <p className="text-xs text-gray-400">Support {creatorName} — 100% goes to them</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-green-900/30 border border-green-700/40 rounded-xl px-3 py-2">
          <DollarSign size={14} className="text-green-400" />
          <p className="text-xs text-green-300">No platform fees. Every dollar goes straight to the creator.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            {creatorName} hasn&apos;t set up direct payment links yet.
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => {
              const meta = PLATFORM_META[link.platform] ?? { label: link.platform, color: '#555', icon: '💳' };
              return (
                <button
                  key={link.id}
                  onClick={() => openLink(link)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-white transition hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: meta.color }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{meta.label}</p>
                      <p className="text-xs opacity-75">@{link.handle}</p>
                    </div>
                  </div>
                  <ExternalLink size={16} className="opacity-70" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
