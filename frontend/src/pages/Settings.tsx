import { useEffect, useState, FormEvent } from 'react';
import {
  Key, RefreshCw, User, ExternalLink, Bell, Shield,
  Copy, Eye, EyeOff, Settings as SettingsIcon, DollarSign,
} from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'stream' | 'payments' | 'notifications'>('profile');

  // Profile
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Stream key
  const [streamKey, setStreamKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  // Payments
  const [stripeStatus, setStripeStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [onboarding, setOnboarding] = useState(false);
  const [payouts, setPayouts] = useState<any[]>([]);

  // Notifications
  const [notifTip, setNotifTip] = useState(true);
  const [notifViewer, setNotifViewer] = useState(false);
  const [notifChat, setNotifChat] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Profile visibility
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true);

  useEffect(() => {
    fetchStreamKey();
    fetchStripeStatus();
    fetchPayouts();
  }, []);

  const fetchStreamKey = async () => {
    try {
      const res = await api.get('/streams/my-key');
      setStreamKey(res.data.streamKey || '');
    } catch {
      setStreamKey('sk_' + Math.random().toString(36).slice(2, 18).toUpperCase());
    }
  };

  const fetchStripeStatus = async () => {
    try {
      const res = await api.get('/payments/connect/status');
      setStripeStatus(res.data.status || 'none');
    } catch {}
  };

  const fetchPayouts = async () => {
    try {
      const res = await api.get('/payments/payouts');
      setPayouts(res.data.payouts || []);
    } catch {}
  };

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await api.get('/users/me/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {} finally {
      setLoadingNotifs(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/users/me/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch('/auth/profile', { username: displayName, bio, isPublic });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const rotateKey = async () => {
    if (!confirm('Rotate stream key? Your current OBS setup will stop working until updated.')) return;
    setRotatingKey(true);
    try {
      const res = await api.post('/streams/rotate-key');
      setStreamKey(res.data.streamKey || '');
      toast.success('Stream key rotated');
    } catch {
      toast.error('Failed to rotate key');
    } finally {
      setRotatingKey(false);
    }
  };

  const connectStripe = async () => {
    setOnboarding(true);
    try {
      const res = await api.post('/payments/connect/onboard');
      window.open(res.data.onboardingUrl, '_blank');
      setStripeStatus('pending');
      toast.success('Stripe onboarding opened in new tab');
    } catch {
      toast.error('Failed to start Stripe onboarding');
    } finally {
      setOnboarding(false);
    }
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success('Copied!'); };

  const TABS = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'stream' as const, label: 'Stream', icon: Key },
    { id: 'payments' as const, label: 'Payments', icon: DollarSign },
    { id: 'notifications' as const, label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-burgundy/20 border border-burgundy/40 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-burgundy-light" />
        </div>
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">SETTINGS</h1>
          <p className="text-white/40 font-mono text-sm">Configure your broadcast suite</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-obsidian-50 border border-white/8 rounded-2xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-mono transition ${
              activeTab === tab.id
                ? 'bg-burgundy text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="card space-y-6">
          <h2 className="font-display text-xl tracking-wider text-white">CREATOR PROFILE</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-burgundy to-gold/60 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {(displayName || user?.email || 'S')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-medium">{user?.email}</p>
              <p className="text-white/40 font-mono text-xs">Creator account</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
                Display Name / Handle
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="yourusername"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Tell your audience about yourself..."
                maxLength={300}
              />
            </div>
            {/* Profile visibility */}
            <div className="flex items-center justify-between pt-2 border-t border-white/8">
              <div>
                <p className="text-white/80 text-sm font-medium">Public profile</p>
                <p className="text-white/30 font-mono text-xs mt-0.5">
                  {isPublic ? 'Anyone can view your profile and public streams' : 'Profile hidden from Discover'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublic ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <button type="submit" disabled={savingProfile} className="btn-primary disabled:opacity-40">
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Stream tab */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-display text-xl tracking-wider text-white">STREAM KEY</h2>
            <p className="text-white/40 font-mono text-sm">
              Use this key in OBS → Settings → Stream → Stream Key
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-mono text-white/40 mb-1.5">RTMP Server URL</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-sm bg-obsidian-100 border border-white/8 px-3 py-2 rounded-xl text-gold font-mono">
                    rtmp://live.seewhy.live/stream
                  </code>
                  <button onClick={() => copy('rtmp://live.seewhy.live/stream')} className="btn-ghost p-2.5">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-mono text-white/40 mb-1.5">Stream Key (keep secret)</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      readOnly
                      value={streamKey}
                      className="input font-mono text-sm w-full"
                    />
                  </div>
                  <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-2.5">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => streamKey && copy(streamKey)} className="btn-ghost p-2.5">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/8">
              <button
                onClick={rotateKey}
                disabled={rotatingKey}
                className="btn-ghost flex items-center gap-2 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${rotatingKey ? 'animate-spin' : ''}`} />
                {rotatingKey ? 'Rotating...' : 'Rotate Stream Key'}
              </button>
              <p className="text-white/20 font-mono text-xs mt-2">
                Rotating invalidates your current key immediately.
              </p>
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-display text-xl tracking-wider text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-white/40" />
              GUARDIAN AI
            </h2>
            <p className="text-white/40 font-mono text-xs">Auto-moderation thresholds (toxic-bert)</p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/60">Flag threshold</span>
                <span className="text-yellow-400">50%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/60">Mute threshold</span>
                <span className="text-orange-400">75%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/60">Ban threshold</span>
                <span className="text-red-400">95%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className={`card border ${stripeStatus === 'active' ? 'border-green-700/30 bg-green-900/10' : 'border-white/8'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl tracking-wider text-white mb-1">STRIPE CONNECT</h2>
                <p className="text-white/40 font-mono text-xs">
                  Receive 90% of all tips directly to your account
                </p>
              </div>
              <span className={`badge ${stripeStatus === 'active' ? 'badge-success' : stripeStatus === 'pending' ? 'badge-warning' : 'bg-white/10 text-white/40'}`}>
                {stripeStatus === 'active' ? 'Connected' : stripeStatus === 'pending' ? 'Pending' : 'Not connected'}
              </span>
            </div>

            {/* Revenue split */}
            <div className="mt-4 p-4 bg-obsidian-100 rounded-xl border border-white/5">
              <div className="flex justify-between text-sm font-mono mb-2">
                <span className="text-white/60">Tip amount</span>
                <span className="text-white">$10.00</span>
              </div>
              <div className="flex justify-between text-sm font-mono mb-2">
                <span className="text-gold">You receive (90%)</span>
                <span className="text-gold font-bold">$9.00</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-white/30">
                <span>Platform fee (10%)</span>
                <span>$1.00</span>
              </div>
            </div>

            {stripeStatus !== 'active' && (
              <button
                onClick={connectStripe}
                disabled={onboarding}
                className="btn-gold w-full mt-4 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {onboarding ? 'Opening Stripe...' : 'Connect Stripe Account'}
              </button>
            )}
          </div>

          {/* Payout history */}
          <div className="card">
            <h2 className="font-display text-xl tracking-wider text-white mb-4">PAYOUT HISTORY</h2>
            {payouts.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-10 h-10 text-white/10 mx-auto mb-2" />
                <p className="text-white/30 font-mono text-sm">No payouts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payouts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-obsidian-100 rounded-xl">
                    <div>
                      <p className="font-mono text-sm text-white">${(p.amount / 100).toFixed(2)}</p>
                      <p className="font-mono text-xs text-white/40">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="badge badge-success">{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Notification preferences */}
          <div className="card space-y-4">
            <h2 className="font-display text-xl tracking-wider text-white">ALERT PREFERENCES</h2>
            {[
              { id: 'tip',    label: 'Tip received',     sub: 'Alert when a viewer sends a tip',    value: notifTip,    set: setNotifTip },
              { id: 'viewer', label: 'Viewer milestone',  sub: 'Alert at 10, 50, 100+ viewers',      value: notifViewer, set: setNotifViewer },
              { id: 'chat',   label: 'Guardian AI alerts', sub: 'Moderation flags and actions',      value: notifChat,   set: setNotifChat },
            ].map((pref) => (
              <div key={pref.id} className="flex items-center justify-between py-3 border-b border-white/8 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{pref.label}</p>
                  <p className="text-xs font-mono text-white/40 mt-0.5">{pref.sub}</p>
                </div>
                <button
                  onClick={() => pref.set(!pref.value)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${pref.value ? 'bg-burgundy' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${pref.value ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>

          {/* In-app inbox */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl tracking-wider text-white">INBOX</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 text-xs font-mono border border-red-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-mono text-white/40 hover:text-white/70 transition">
                    Mark all read
                  </button>
                )}
                <button
                  onClick={fetchNotifications}
                  disabled={loadingNotifs}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  {loadingNotifs ? 'Loading…' : notifications.length === 0 ? 'Load inbox' : 'Refresh'}
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 mx-auto mb-2 text-white/10" />
                <p className="text-white/30 font-mono text-sm">
                  {loadingNotifs ? 'Loading…' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`py-3 flex gap-3 ${n.isRead ? 'opacity-50' : ''}`}
                  >
                    {!n.isRead && (
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    )}
                    <div className={`${n.isRead ? 'ml-5' : ''} flex-1 min-w-0`}>
                      <p className="text-white text-sm font-medium">{n.title}</p>
                      <p className="text-white/50 text-xs font-mono mt-0.5">{n.body}</p>
                      <p className="text-white/20 text-xs font-mono mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
