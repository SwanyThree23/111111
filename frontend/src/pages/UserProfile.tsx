import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users, Radio, Eye, Heart, HeartOff, ExternalLink,
  DollarSign, Calendar, Play,
} from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';

interface ProfileStream {
  id: string;
  title: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isLive: boolean;
  currentViewers: number;
  status: string;
  startedAt?: string;
  createdAt: string;
  stats?: { viewers: number }[];
}

interface TipEntry {
  username: string;
  userId: string | null;
  _sum: { amount: number | null };
}

interface ProfileUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isPublic: boolean;
  createdAt: string;
  _count: { followers: number; following: number; streams: number };
  streams: ProfileStream[];
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: me }  = useAuth();

  const [profile, setProfile]         = useState<ProfileUser | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [tipLeaderboard, setTipLeaderboard] = useState<TipEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [followBusy, setFollowBusy]   = useState(false);

  useEffect(() => {
    if (!username) return;
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${username}`);
      setProfile(res.data.user);
      setIsFollowing(res.data.isFollowing);
      setTipLeaderboard(res.data.tipLeaderboard || []);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await api.post(`/users/${profile.username}/follow`);
      setIsFollowing(res.data.following);
      setProfile((p) =>
        p
          ? {
              ...p,
              _count: {
                ...p._count,
                followers: p._count.followers + (res.data.following ? 1 : -1),
              },
            }
          : p
      );
    } catch { /* ignore */ } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto card text-center py-20">
        <Radio className="w-12 h-12 mx-auto mb-4 text-white/20" />
        <p className="text-white/40 font-mono">Creator not found or profile is private.</p>
        <Link to="/discover" className="btn-ghost mt-4 inline-flex items-center gap-2 text-sm">
          Browse Discover
        </Link>
      </div>
    );
  }

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username;
  const avatar = profile.avatar
    ? profile.avatar
    : `https://api.dicebear.com/8.x/initials/svg?seed=${profile.username}`;
  const liveStream = profile.streams.find((s) => s.isLive);
  const isOwnProfile = me?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile header */}
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 p-6"
        style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.12) 0%, rgba(7,7,13,0.95) 70%)' }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={avatar}
              alt={displayName}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-white/10"
            />
            {liveStream && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-obsidian" />
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl tracking-wider text-white">{displayName.toUpperCase()}</h1>
              {liveStream && (
                <Link
                  to={`/streams/${liveStream.id}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-mono hover:bg-red-600/30 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE NOW
                </Link>
              )}
            </div>
            <p className="text-white/40 font-mono text-sm mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="text-white/70 text-sm mt-2 max-w-lg">{profile.bio}</p>
            )}
            <p className="text-white/20 font-mono text-xs mt-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Follow / action */}
          <div className="shrink-0">
            {isOwnProfile ? (
              <Link to="/settings" className="btn-ghost text-sm flex items-center gap-2">
                Edit Profile
              </Link>
            ) : me ? (
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition ${
                  isFollowing
                    ? 'bg-white/10 hover:bg-white/15 text-white/70 border border-white/10'
                    : 'bg-burgundy hover:bg-burgundy-dark text-white'
                }`}
              >
                {isFollowing ? (
                  <><HeartOff className="w-4 h-4" /> Unfollow</>
                ) : (
                  <><Heart className="w-4 h-4" /> Follow</>
                )}
              </button>
            ) : (
              <Link to="/login" className="btn-primary text-sm flex items-center gap-2">
                <Heart className="w-4 h-4" /> Follow
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Followers', value: profile._count.followers.toLocaleString(), icon: Users },
          { label: 'Following', value: profile._count.following.toLocaleString(), icon: Heart },
          { label: 'Streams',   value: profile._count.streams.toLocaleString(),   icon: Radio },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <s.icon className="w-5 h-5 mx-auto mb-2 text-gold/60" />
            <p className="font-display text-2xl text-white tracking-wider">{s.value}</p>
            <p className="text-white/40 font-mono text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streams */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-xl tracking-wider text-white">STREAMS</h2>

          {profile.streams.length === 0 ? (
            <div className="card text-center py-12">
              <Radio className="w-8 h-8 mx-auto mb-2 text-white/20" />
              <p className="text-white/30 font-mono text-sm">No public streams yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.streams.map((s) => {
                const viewers = s.currentViewers || s.stats?.[0]?.viewers || 0;
                return (
                  <Link
                    key={s.id}
                    to={`/streams/${s.id}`}
                    className="flex items-center gap-4 card hover:border-white/20 transition group"
                  >
                    {/* Thumbnail placeholder */}
                    <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-obsidian flex items-center justify-center border border-white/8">
                      {s.thumbnailUrl ? (
                        <img src={s.thumbnailUrl} alt={s.title} className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-5 h-5 text-white/20" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate group-hover:text-gold transition">
                        {s.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {s.isLive ? (
                          <span className="flex items-center gap-1 text-xs text-red-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <span className="text-white/30 font-mono text-xs">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {viewers > 0 && (
                          <span className="flex items-center gap-1 text-white/30 font-mono text-xs">
                            <Eye className="w-3 h-3" /> {viewers}
                          </span>
                        )}
                        {s.category && (
                          <span className="text-gold/50 font-mono text-xs">{s.category}</span>
                        )}
                      </div>
                    </div>

                    <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-gold/60 transition shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar — tip leaderboard */}
        <div className="space-y-4">
          <h2 className="font-display text-xl tracking-wider text-white">TOP SUPPORTERS</h2>
          <div className="card space-y-3">
            {tipLeaderboard.length === 0 ? (
              <p className="text-white/30 font-mono text-sm text-center py-4">No tips yet</p>
            ) : (
              tipLeaderboard.map((entry, i) => (
                <div key={entry.username} className="flex items-center gap-3">
                  <span
                    className={`w-6 text-center font-display text-sm ${
                      i === 0 ? 'text-gold' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-400' : 'text-white/30'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-mono truncate">{entry.username}</p>
                  </div>
                  <div className="flex items-center gap-1 text-gold font-mono text-sm font-bold shrink-0">
                    <DollarSign className="w-3 h-3" />
                    {((entry._sum?.amount ?? 0) / 100).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
