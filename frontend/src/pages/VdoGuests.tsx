import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Plus, Copy, ExternalLink, UserX } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

export default function VdoGuests() {
  const { streamId } = useParams();
  const [room, setRoom] = useState<any>(null);
  const [participantName, setParticipantName] = useState('');

  useEffect(() => { if (streamId) fetchOrCreateRoom(); }, [streamId]);

  const fetchOrCreateRoom = async () => {
    try {
      const res = await api.get(`/vdo/rooms/stream/${streamId}`);
      setRoom(res.data.room);
    } catch {
      try {
        const res = await api.post('/vdo/rooms', { streamId });
        setRoom(res.data.room);
        toast.success('Room created!');
      } catch { toast.error('Failed to create room'); }
    }
  };

  const addParticipant = async () => {
    if (!participantName.trim()) return;
    try {
      await api.post(`/vdo/rooms/${room.id}/participants`, { name: participantName, role: 'guest' });
      toast.success('Participant added!');
      setParticipantName('');
      fetchOrCreateRoom();
    } catch {}
  };

  const copy = (url: string) => { navigator.clipboard.writeText(url); toast.success('Copied!'); };

  if (!room) return <div className="text-gray-500 text-center py-20">Setting up room...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-4xl font-bold">Guest Management</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">VDO.Ninja Room Links</h2>
        <div className="space-y-4">
          {[
            { label: 'Director URL (You)', value: room.directorUrl },
            { label: 'Guest URL (Share with guests)', value: room.guestUrl },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
              <div className="flex gap-2">
                <input value={value} readOnly className="input flex-1 text-xs" />
                <button onClick={() => copy(value)} className="btn-secondary flex-shrink-0"><Copy className="w-4 h-4" /></button>
                <a href={value} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-shrink-0"><ExternalLink className="w-4 h-4" /></a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Participants ({room.participants?.length || 0})</h2>
        <div className="flex gap-2 mb-4">
          <input placeholder="Enter participant name" value={participantName} onChange={e => setParticipantName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addParticipant()} className="input flex-1" />
          <button onClick={addParticipant} className="btn-primary"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="space-y-2">
          {room.participants?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {p.name[0].toUpperCase()}
                </div>
                <div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500 capitalize">{p.role}</p></div>
              </div>
              <div className="flex items-center gap-2">
                {p.isActive && <span className="badge badge-success">Active</span>}
              </div>
            </div>
          ))}
          {!room.participants?.length && <p className="text-gray-500 text-center py-4">No participants yet</p>}
        </div>
      </div>
    </div>
  );
}
