'use client';

import { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface Props {
  streamId?: string;
  vodId?: string;
  title: string;
  thumbnailUrl?: string;
  isLive?: boolean;
  onClose: () => void;
}

const SHARE_PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    buildUrl: (url: string, text: string) =>
      `https://www.instagram.com/share?url=${encodeURIComponent(url)}&caption=${encodeURIComponent(text)}`,
    note: 'Opens Instagram — paste link in your story/bio',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    buildUrl: (url: string, text: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    note: null,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    color: '#010101',
    buildUrl: (url: string, _text: string) =>
      `https://www.tiktok.com/share?url=${encodeURIComponent(url)}`,
    note: 'Opens TikTok — paste link in your bio',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    icon: '👻',
    color: '#FFFC00',
    textColor: '#000',
    buildUrl: (url: string, _text: string) =>
      `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(url)}`,
    note: null,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    icon: '🐦',
    color: '#000',
    buildUrl: (url: string, text: string) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    note: null,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    buildUrl: (url: string, text: string) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`,
    note: null,
  },
];

export default function ShareSheet({ streamId, vodId, title, isLive, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://seewhylive.online';
  const shareUrl = streamId
    ? `${base}/watch/${streamId}`
    : vodId
    ? `${base}/vods/${vodId}`
    : base;

  const shareText = isLive
    ? `🔴 LIVE now: ${title} — watch on SeeWhy LIVE`
    : `Check out: ${title} — on SeeWhy LIVE`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({ title, text: shareText, url: shareUrl }).catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-900 rounded-t-2xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <Share2 size={16} /> Share
            {isLive && <span className="ml-1 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full">LIVE</span>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Copy link bar */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400 truncate">
            {shareUrl}
          </div>
          <button
            onClick={copyLink}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Native share (mobile) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={shareNative}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Share via...
          </button>
        )}

        {/* Platform grid */}
        <div className="grid grid-cols-3 gap-2">
          {SHARE_PLATFORMS.map((p) => (
            <a
              key={p.id}
              href={p.buildUrl(shareUrl, shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition hover:opacity-90 active:scale-95"
              style={{ backgroundColor: p.color }}
            >
              <span className="text-2xl">{p.icon}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: (p as { textColor?: string }).textColor ?? '#fff' }}
              >
                {p.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
