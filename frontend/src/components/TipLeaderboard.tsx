import { useEffect, useState } from 'react';
import { Trophy, Crown, Medal } from 'lucide-react';
import api from '@/utils/api';

interface LeaderEntry {
  from_username: string;
  sum: number;
}

const RANK_ICONS = [
  { icon: Crown, color: 'text-yellow-400' },
  { icon: Trophy, color: 'text-gray-300' },
  { icon: Medal, color: 'text-amber-600' },
];

export default function TipLeaderboard({ roomId }: { roomId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [roomId]);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/payments/leaderboard/${roomId}`);
      setLeaderboard(res.data.leaderboard || []);
    } catch { /* Silently fail */ }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        Top Supporters
      </h3>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">
          No tips yet. Be the first!
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, idx) => {
            const RankIcon = RANK_ICONS[idx]?.icon || Medal;
            const rankColor = RANK_ICONS[idx]?.color || 'text-gray-500';

            return (
              <div
                key={entry.from_username}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  idx === 0 ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RankIcon className={`w-5 h-5 ${rankColor}`} />
                  <span className={`font-medium text-sm ${idx === 0 ? 'text-yellow-300' : 'text-gray-200'}`}>
                    {entry.from_username}
                  </span>
                </div>
                <span className="font-bold text-green-400 text-sm">
                  ${(entry.sum / 100).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
