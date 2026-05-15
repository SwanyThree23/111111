import { useState } from 'react';
import { X, Grid3X3, Maximize2, Film, Columns2, Lock, Unlock, Users, Link2, Check, Palette } from 'lucide-react';

export type LayoutMode = 'auto' | 'spotlight' | 'cinema' | 'split';
export type AccentColor = 'burgundy' | 'gold' | 'teal' | 'violet';

export interface RoomMeta {
  name: string;
  maxParticipants: number;
  accent: AccentColor;
  layout: LayoutMode;
  isLocked: boolean;
}

interface RoomCustomizerProps {
  open: boolean;
  onClose: () => void;
  meta: RoomMeta;
  onChange: (partial: Partial<RoomMeta>) => void;
  roomUrl: string;
}

const ACCENT_COLORS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'burgundy', label: 'Burgundy', hex: '#800020' },
  { id: 'gold',     label: 'Gold',     hex: '#C9AF37' },
  { id: 'teal',     label: 'Teal',     hex: '#14B8A6' },
  { id: 'violet',   label: 'Violet',   hex: '#7C3AED' },
];

const LAYOUTS: { id: LayoutMode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'auto',      label: 'Auto Grid',  icon: Grid3X3,   desc: 'Fills by participant count' },
  { id: 'spotlight', label: 'Spotlight',  icon: Maximize2, desc: 'One pinned tile is featured' },
  { id: 'cinema',    label: 'Cinema',     icon: Film,      desc: 'Video top, panel strip below' },
  { id: 'split',     label: 'Split',      icon: Columns2,  desc: '2 equal-width columns' },
];

import React from 'react';

export default function RoomCustomizer({ open, onClose, meta, onChange, roomUrl }: RoomCustomizerProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-80 flex flex-col"
        style={{ background: '#0D0D18', borderLeft: '1px solid rgba(255,255,255,0.10)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-display text-xl tracking-wider text-white">ROOM SETTINGS</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition text-white/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Room Name */}
          <section>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Room Name</label>
            <input
              value={meta.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="input w-full"
              placeholder="My Watch Party Room"
              maxLength={60}
            />
          </section>

          {/* Layout Mode */}
          <section>
            <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Layout Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map((l) => {
                const active = meta.layout === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => onChange({ layout: l.id })}
                    className="flex flex-col items-start p-3 rounded-xl text-left transition"
                    style={{
                      background: active ? 'rgba(128,0,32,0.22)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid rgba(128,0,32,0.50)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <l.icon className={`w-4 h-4 mb-1.5 ${active ? 'text-gold' : 'text-white/35'}`} />
                    <p className={`text-xs font-mono font-semibold ${active ? 'text-white' : 'text-white/45'}`}>{l.label}</p>
                    <p className="text-[10px] text-white/22 mt-0.5 leading-tight">{l.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Accent Color */}
          <section>
            <label className="flex items-center gap-1.5 text-xs font-mono text-white/40 uppercase tracking-widest mb-3">
              <Palette className="w-3 h-3" /> Accent Color
            </label>
            <div className="flex items-center gap-3">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onChange({ accent: c.id })}
                  title={c.label}
                  className="relative w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{
                    background: c.hex,
                    outline: meta.accent === c.id ? '2px solid white' : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                >
                  {meta.accent === c.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
              <span className="text-xs font-mono text-white/30 capitalize ml-1">{meta.accent}</span>
            </div>
          </section>

          {/* Max Participants */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-mono text-white/40 uppercase tracking-widest">
                <Users className="w-3 h-3" /> Max Guests
              </label>
              <span className="text-sm font-mono text-gold font-bold">{meta.maxParticipants}</span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={meta.maxParticipants}
              onChange={(e) => onChange({ maxParticipants: Number(e.target.value) })}
              className="w-full accent-gold h-1.5"
            />
            <div className="flex justify-between text-[10px] font-mono text-white/20 mt-1">
              <span>2</span><span>10</span><span>20</span>
            </div>
          </section>

          {/* Room Lock */}
          <section>
            <div className="flex items-center justify-between p-3 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                {meta.isLocked
                  ? <Lock className="w-4 h-4 text-gold flex-shrink-0" />
                  : <Unlock className="w-4 h-4 text-white/30 flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-mono text-white/70">{meta.isLocked ? 'Room Locked' : 'Room Open'}</p>
                  <p className="text-[10px] font-mono text-white/25">
                    {meta.isLocked ? 'Host approves all joins' : 'Anyone with link can join'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onChange({ isLocked: !meta.isLocked })}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${meta.isLocked ? 'bg-gold' : 'bg-white/20'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${meta.isLocked ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </section>

          {/* Invite Link */}
          <section>
            <label className="flex items-center gap-1.5 text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
              <Link2 className="w-3 h-3" /> Invite Link
            </label>
            <div className="flex gap-2">
              <input
                value={roomUrl}
                readOnly
                className="input flex-1 text-xs text-white/40 cursor-default"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 transition"
                style={{
                  background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)',
                  border: copied ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.10)',
                  color: copied ? 'rgb(134,239,172)' : 'rgba(255,255,255,0.45)',
                }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={onClose} className="w-full btn-primary py-2.5 text-sm font-mono tracking-wider">
            CLOSE SETTINGS
          </button>
        </div>
      </div>
    </>
  );
}
