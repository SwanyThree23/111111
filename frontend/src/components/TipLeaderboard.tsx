import { useEffect, useState } from 'react';
import { Trophy, Crown, Medal } from 'lucide-react';
import api from '@/utils/api';

interface Entry {
  from_username: string;
  sum: number;
}

const ICONS = [
  { icon: Crown, color: 'text-gold' },
  { icon: Trophy, color: 'text-gray-300' },
  { icon: Medal, color: 'text-amber-600' },
];

export default function TipLeaderboard({ roomId }: { roomId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const fetch = () => {
      api.get(`/payments/leaderboard/${roomId}`)
        .then((r) => setEntries(r.data.leaderboard || []))
        .catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, [roomId]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-gold" /> Top Supporters
      </h3>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-white/20 font-mono text-sm">
          No tips yet. Be the first!
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => {
            const { icon: Icon, color } = ICONS[i] || { icon: Medal, color: 'text-white/40' };
            return (
              <div
                key={e.from_username}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  i === 0 ? 'bg-gold/10 border border-gold/20' : 'bg-white/5 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className={`font-mono text-sm ${i === 0 ? 'text-gold' : 'text-white/70'}`}>
                    {e.from_username}
                  </span>
                </div>
                <span className="font-mono font-bold text-green-400 text-sm">
                  ${(e.sum / 100).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
