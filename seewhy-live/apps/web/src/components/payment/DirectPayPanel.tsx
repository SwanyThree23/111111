'use client';
import { ExternalLink } from 'lucide-react';

const PLATFORMS = [
  { name: 'CashApp', url: (u: string) => `https://cash.app/$${u}`, color: '#00D632', emoji: '💸' },
  { name: 'PayPal', url: (u: string) => `https://paypal.me/${u}`, color: '#003087', emoji: '🅿️' },
  { name: 'Venmo', url: (u: string) => `https://venmo.com/${u}`, color: '#3D95CE', emoji: '💙' },
  { name: 'Zelle', url: (_: string) => '#', color: '#6B21A8', emoji: '⚡' },
  { name: 'Chime', url: (_: string) => '#', color: '#00CC66', emoji: '🏦' },
];

export function DirectPayPanel({ creatorUsername }: { creatorUsername: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 font-ui uppercase tracking-wider mb-3">Direct Pay</p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <a
            key={p.name}
            href={p.url(creatorUsername)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#242424] hover:border-[#C8FF00]/40 transition-all text-sm hover:scale-105"
          >
            <span>{p.emoji}</span>
            <span className="text-gray-400">{p.name}</span>
            <ExternalLink size={10} className="text-gray-600" />
          </a>
        ))}
      </div>
    </div>
  );
}
