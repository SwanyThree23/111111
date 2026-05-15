import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Plus, Copy, ExternalLink, UserX, ArrowLeft } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

const MAX_GUESTS = 20;

export default function VdoGuests() {
  const { streamId } = useParams<{ streamId: string }>();
  const [room, setRoom] = useState<any>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (streamId) fetchOrCreate(); }, [streamId]);

  const fetchOrCreate = async () => {
    try {
      const res = await api.get(`/vdo/rooms/stream/${streamId}`);
      setRoom(res.data.room);
    } catch {
      try {
        const res = await api.post('/vdo/rooms', { streamId });
        setRoom(res.data.room);
        toast.success('VDO room created');
      } catch { toast.error('Failed to create room'); }
    } finally { setLoading(false); }
  };

  const addGuest = async () => {
    if (!name.trim()) return;
    if ((room?.participants?.length || 0) >= MAX_GUESTS) {
      toast.error(`Max ${MAX_GUESTS} guests`);
      return;
    }
    try {
      await api.post(`/vdo/rooms/${room.id}/participants`, { name: name.trim(), role: 'guest' });
      setName('');
      fetchOrCreate();
      toast.success('Guest added');
    } catch {}
  };

  const removeGuest = async (participantId: string) => {
    try {
      await api.delete(`/vdo/rooms/${room.id}/participants/${participantId}`);
      fetchOrCreate();
      toast.success('Guest removed');
    } catch {}
  };

  const copy = (url: string) => { navigator.clipboard.writeText(url); toast.success('Copied!'); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/30 font-mono animate-pulse">Setting up VDO room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 font-mono">Failed to load room.</p>
      </div>
    );
  }

  const participants = room.participants || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to={`/streams/${streamId}`} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">PANEL GUESTS</h1>
          <p className="text-white/40 font-mono text-sm">
            VDO.Ninja · {participants.length}/{MAX_GUESTS} guests
          </p>
        </div>
      </div>

      {/* Room links */}
      <div className="card space-y-4">
        <h2 className="font-display text-xl tracking-wider text-white">ROOM LINKS</h2>
        {[
          { label: 'Director URL (your control panel)', url: room.directorUrl, accent: 'text-gold' },
          { label: 'Guest URL (share with panelists)', url: room.guestUrl, accent: 'text-white/70' },
        ].map(({ label, url, accent }) => (
          <div key={label}>
            <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${accent}`}>{label}</p>
            <div className="flex gap-2">
              <input value={url || '—'} readOnly className="input flex-1 text-xs" />
              <button onClick={() => url && copy(url)} className="btn-ghost p-2.5">
                <Copy className="w-4 h-4" />
              </button>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2.5">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* VDO embed preview */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest">Director View</span>
          <span className="badge badge-gold">Up to 20 guests</span>
        </div>
        {room.directorUrl ? (
          <iframe
            src={`${room.directorUrl}&isSim=true`}
            className="w-full"
            style={{ height: '300px' }}
            allow="camera; microphone; display-capture"
            title="VDO.Ninja Director"
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-white/20 font-mono text-sm">
            No director URL available
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-wider text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-white/40" />
            GUESTS ({participants.length}/{MAX_GUESTS})
          </h2>
        </div>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGuest()}
            placeholder="Guest display name"
            className="input flex-1"
          />
          <button onClick={addGuest} disabled={participants.length >= MAX_GUESTS} className="btn-primary p-3 disabled:opacity-40">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {participants.length === 0 ? (
          <p className="text-white/20 font-mono text-sm text-center py-4">
            No guests yet. Add one or share the guest URL.
          </p>
        ) : (
          <div className="space-y-2">
            {participants.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-obsidian-100 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-burgundy to-gold/60 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{p.name}</p>
                    <p className="text-xs font-mono text-white/30 capitalize">{p.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.isActive && <span className="badge badge-success">Active</span>}
                  <button onClick={() => removeGuest(p.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg transition text-white/30 hover:text-red-400">
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
