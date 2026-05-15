import { useState } from 'react';
import { Mic, MicOff, Pin, UserX, Plus, Tv2, Crown, Volume2, X, Play } from 'lucide-react';

export type SlotType = 'camera' | 'youtube' | 'screen' | 'empty';

export interface PanelSlot {
  id: string;
  type: SlotType;
  label?: string;
  videoId?: string;
  participantId?: string;
  isMuted?: boolean;
  isPinned?: boolean;
  isSpeaking?: boolean;
  isHost?: boolean;
}

interface ParticipantTileProps {
  slot: PanelSlot;
  isCurrentUserHost: boolean;
  isSpotlight?: boolean;
  isYtPlaying?: boolean;
  onAddContent: (slotId: string) => void;
  onMute: (slotId: string) => void;
  onKick: (slotId: string) => void;
  onPin: (slotId: string) => void;
  onClear: (slotId: string) => void;
  onYtTogglePlay?: () => void;
}

export default function ParticipantTile({
  slot, isCurrentUserHost, isSpotlight = false, isYtPlaying = false,
  onAddContent, onMute, onKick, onPin, onClear, onYtTogglePlay,
}: ParticipantTileProps) {
  const [hovered, setHovered] = useState(false);

  const border = slot.isSpeaking
    ? '2px solid rgba(34,197,94,0.65)'
    : slot.isPinned
    ? '2px solid rgba(201,175,55,0.55)'
    : '1px solid rgba(255,255,255,0.07)';

  const glow = slot.isSpeaking ? '0 0 14px rgba(34,197,94,0.22)' : undefined;

  // ── EMPTY SLOT ────────────────────────────────────────────────
  if (slot.type === 'empty') {
    return (
      <div
        className="relative flex flex-col items-center justify-center rounded-xl group transition-all"
        style={{ background: 'rgba(18,18,28,0.45)', border: '1px dashed rgba(255,255,255,0.09)', aspectRatio: '16/9', cursor: isCurrentUserHost ? 'pointer' : 'default' }}
        onClick={() => isCurrentUserHost && onAddContent(slot.id)}
      >
        {isCurrentUserHost && (
          <>
            <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition mb-1.5">
              <Plus className="w-4 h-4 text-white/20 group-hover:text-white/50" />
            </div>
            <span className="text-[9px] font-mono text-white/15 group-hover:text-white/30 transition uppercase tracking-widest">
              Add to Panel
            </span>
          </>
        )}
      </div>
    );
  }

  // ── YOUTUBE SLOT ─────────────────────────────────────────────
  if (slot.type === 'youtube') {
    return (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ border, boxShadow: glow, aspectRatio: '16/9', background: '#0A0A0F' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {slot.videoId ? (
          <iframe
            key={`${slot.videoId}-${isYtPlaying ? 1 : 0}`}
            src={`https://www.youtube.com/embed/${slot.videoId}?autoplay=${isYtPlaying ? 1 : 0}&controls=0&rel=0&modestbranding=1&enablejsapi=1`}
            className="w-full h-full"
            allow="autoplay; fullscreen; encrypted-media"
            title={slot.label || 'Watch Together'}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Tv2 className="w-8 h-8 text-white/10" />
            <span className="text-xs font-mono text-white/20">No video loaded</span>
          </div>
        )}

        {/* YT badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/85 backdrop-blur-sm pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[9px] font-mono text-white font-bold">YOUTUBE</span>
        </div>

        {/* Host play/pause overlay */}
        {isCurrentUserHost && hovered && onYtTogglePlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <button
              onClick={(e) => { e.stopPropagation(); onYtTogglePlay(); }}
              className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-burgundy/80 transition"
            >
              {isYtPlaying
                ? <div className="flex gap-1 items-center"><div className="w-1.5 h-5 bg-white rounded-sm" /><div className="w-1.5 h-5 bg-white rounded-sm" /></div>
                : <Play className="w-5 h-5 text-white ml-0.5" />
              }
            </button>
          </div>
        )}

        {/* Label */}
        {slot.label && !(isCurrentUserHost && hovered) && (
          <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5 pointer-events-none"
               style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}>
            <p className="text-[10px] font-mono text-white/75 truncate">{slot.label}</p>
          </div>
        )}

        {isCurrentUserHost && hovered && (
          <TileControls slot={slot} showMute={false} onPin={onPin} onRemove={onClear} onMute={onMute} />
        )}
      </div>
    );
  }

  // ── CAMERA / SCREEN SLOT ─────────────────────────────────────
  const initials = (slot.label || '?')[0].toUpperCase();

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ background: 'rgba(12,12,20,1)', border, boxShadow: glow, aspectRatio: '16/9' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <div
          className={`rounded-full bg-gradient-to-br from-burgundy to-gold/60 flex items-center justify-center text-white font-bold flex-shrink-0 ${isSpotlight ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm'}`}
        >
          {initials}
        </div>
        {isSpotlight && slot.label && (
          <p className="text-sm font-mono text-white/70 truncate max-w-[80%]">{slot.label}</p>
        )}
      </div>

      {/* Top badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {slot.isHost && (
          <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-gold/20 backdrop-blur-sm">
            <Crown className="w-2.5 h-2.5 text-gold" />
            <span className="text-[8px] font-mono text-gold">HOST</span>
          </div>
        )}
        {slot.isPinned && (
          <div className="px-1 py-0.5 rounded bg-gold/20 backdrop-blur-sm">
            <Pin className="w-2.5 h-2.5 text-gold" />
          </div>
        )}
      </div>

      {/* Mute indicator */}
      {slot.isMuted && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-600/80 flex items-center justify-center">
          <MicOff className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {/* Name bar */}
      {slot.label && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 pointer-events-none"
             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }}>
          <div className="flex items-center gap-1.5">
            {slot.isSpeaking && <Volume2 className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />}
            <span className="text-[10px] font-mono text-white/75 truncate">{slot.label}</span>
          </div>
        </div>
      )}

      {isCurrentUserHost && hovered && (
        <TileControls slot={slot} showMute onPin={onPin} onRemove={onKick} onMute={onMute} />
      )}
    </div>
  );
}

// ── SHARED HOST CONTROLS OVERLAY ──────────────────────────────
function TileControls({
  slot, showMute, onPin, onRemove, onMute,
}: {
  slot: PanelSlot;
  showMute: boolean;
  onPin: (id: string) => void;
  onRemove: (id: string) => void;
  onMute: (id: string) => void;
}) {
  return (
    <div
      className="absolute top-2 right-2 flex flex-col gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => onPin(slot.id)}
        title={slot.isPinned ? 'Unpin' : 'Pin / Spotlight'}
        className="w-6 h-6 rounded-md bg-black/75 backdrop-blur-sm flex items-center justify-center hover:bg-gold/50 transition"
      >
        <Pin className={`w-3 h-3 ${slot.isPinned ? 'text-gold' : 'text-white/60'}`} />
      </button>
      {showMute && (
        <button
          onClick={() => onMute(slot.id)}
          title="Mute"
          className="w-6 h-6 rounded-md bg-black/75 backdrop-blur-sm flex items-center justify-center hover:bg-red-600/60 transition"
        >
          <Mic className="w-3 h-3 text-white/60" />
        </button>
      )}
      <button
        onClick={() => onRemove(slot.id)}
        title={slot.type === 'camera' ? 'Remove participant' : 'Remove tile'}
        className="w-6 h-6 rounded-md bg-black/75 backdrop-blur-sm flex items-center justify-center hover:bg-red-700/70 transition"
      >
        <X className="w-3 h-3 text-white/60" />
      </button>
    </div>
  );
}
