'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NavBar } from '@/components/ui/NavBar';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, Shield, Bell, Palette, Key, Save,
  Camera, Mail, Globe, Trash2, Eye, EyeOff,
} from 'lucide-react';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Notification preferences
  const [notifStream, setNotifStream] = useState(true);
  const [notifChat, setNotifChat] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // Appearance
  const [theme, setTheme] = useState<'dark' | 'midnight' | 'amoled'>('dark');

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    setDisplayName(user.displayName ?? '');
  }, [user, router]);

  const updateProfile = useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
      api.patch('/api/auth/profile', data),
    onSuccess: () => toast.success('Profile updated!'),
    onError: (err) => toast.error((err as Error).message),
  });

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/api/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/api/auth/account'),
    onSuccess: () => { logout(); router.push('/'); },
  });

  const handleSaveProfile = () => {
    updateProfile.mutate({ displayName: displayName || undefined, bio: bio || undefined, avatarUrl: avatarUrl || undefined });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be 8+ characters'); return; }
    changePassword.mutate({ currentPassword, newPassword });
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#0C0806]">
      <NavBar />
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <h1 className="font-display text-5xl text-white mb-8">SETTINGS</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Tabs sidebar */}
          <div className="md:w-48 flex md:flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-ui transition-all text-left ${
                    activeTab === tab.id
                      ? 'bg-[#C8FF00]/10 text-[#C8FF00] font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* ─── PROFILE ─── */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="card">
                    <h2 className="font-display text-2xl mb-4">PROFILE</h2>

                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C8FF00] to-[#A855F7] flex items-center justify-center text-[#0C0806] text-2xl font-bold">
                          {(displayName || user.username)?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#242424] border border-[#1E1E1E] rounded-full flex items-center justify-center hover:bg-[#C8FF00] hover:text-[#0C0806] transition-colors">
                          <Camera size={12} />
                        </button>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user.displayName ?? user.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role} account</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="settings-display-name" className="block text-xs text-gray-500 font-ui uppercase tracking-wider mb-1">Display Name</label>
                        <input
                          id="settings-display-name"
                          className="input"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your display name"
                          maxLength={30}
                        />
                      </div>

                      <div>
                        <label htmlFor="settings-bio" className="block text-xs text-gray-500 font-ui uppercase tracking-wider mb-1">Bio</label>
                        <textarea
                          id="settings-bio"
                          className="input min-h-[100px] resize-none"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell viewers about yourself..."
                          maxLength={200}
                        />
                        <p className="text-xs text-gray-600 text-right mt-1">{bio.length}/200</p>
                      </div>

                      <div>
                        <label htmlFor="settings-username" className="block text-xs text-gray-500 font-ui uppercase tracking-wider mb-1">Username</label>
                        <input
                          id="settings-username"
                          className="input opacity-60 cursor-not-allowed"
                          value={user.username}
                          disabled
                        />
                        <p className="text-xs text-gray-600 mt-1">Usernames cannot be changed</p>
                      </div>

                      <button
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                        className="btn-volt flex items-center gap-2"
                      >
                        <Save size={14} />
                        {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SECURITY ─── */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="card">
                    <h2 className="font-display text-2xl mb-4">CHANGE PASSWORD</h2>
                    <div className="space-y-4">
                      <div className="relative">
                        <label htmlFor="settings-current-pw" className="block text-xs text-gray-500 font-ui uppercase tracking-wider mb-1">Current Password</label>
                        <input
                          id="settings-current-pw"
                          type={showPasswords ? 'text' : 'password'}
                          className="input pr-10"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-new-pw" className="block text-xs text-gray-500 font-ui uppercase tracking-wider mb-1">New Password</label>
                        <input
                          id="settings-new-pw"
                          type={showPasswords ? 'text' : 'password'}
                          className="input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={8}
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-confirm-pw" className="block text-xs text-gray-500 font-ui uppercase tracking-wider mb-1">Confirm New Password</label>
                        <input
                          id="settings-confirm-pw"
                          type={showPasswords ? 'text' : 'password'}
                          className="input"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                        <input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} className="rounded" />
                        Show passwords
                      </label>
                      <button
                        onClick={handleChangePassword}
                        disabled={changePassword.isPending || !currentPassword || !newPassword}
                        className="btn-volt flex items-center gap-2"
                      >
                        <Key size={14} />
                        {changePassword.isPending ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>

                  <div className="card border-[#FF3B3B]/30">
                    <h2 className="font-display text-2xl text-[#FF3B3B] mb-2">DANGER ZONE</h2>
                    <p className="text-sm text-gray-400 mb-4">Once you delete your account, there is no going back. This action is irreversible.</p>
                    <button
                      onClick={() => {
                        if (confirm('Are you SURE you want to delete your account? This cannot be undone.')) {
                          deleteAccount.mutate();
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#FF3B3B]/10 text-[#FF3B3B] border border-[#FF3B3B]/30 hover:bg-[#FF3B3B]/20 transition-all"
                    >
                      <Trash2 size={14} /> Delete Account
                    </button>
                  </div>
                </div>
              )}

              {/* ─── NOTIFICATIONS ─── */}
              {activeTab === 'notifications' && (
                <div className="card">
                  <h2 className="font-display text-2xl mb-4">NOTIFICATIONS</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Stream alerts', desc: 'Get notified when creators you follow go live', state: notifStream, set: setNotifStream },
                      { label: 'Chat mentions', desc: 'Notifications when someone @mentions you', state: notifChat, set: setNotifChat },
                      { label: 'Payment receipts', desc: 'Confirmations for tips and superchats', state: notifPayment, set: setNotifPayment },
                      { label: 'Email digest', desc: 'Weekly summary of activity', state: notifEmail, set: setNotifEmail },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-xl">
                        <div>
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => item.set(!item.state)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${item.state ? 'bg-[#C8FF00]' : 'bg-[#242424]'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.state ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => toast.success('Preferences saved!')} className="btn-volt flex items-center gap-2 mt-2">
                      <Save size={14} /> Save Preferences
                    </button>
                  </div>
                </div>
              )}

              {/* ─── APPEARANCE ─── */}
              {activeTab === 'appearance' && (
                <div className="card">
                  <h2 className="font-display text-2xl mb-4">APPEARANCE</h2>
                  <p className="text-sm text-gray-400 mb-4">Choose a theme for the SeeWhy LIVE interface.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { id: 'dark' as const, label: 'Dark', bg: '#0C0806', border: '#C8FF00' },
                      { id: 'midnight' as const, label: 'Midnight', bg: '#0a0a14', border: '#6366F1' },
                      { id: 'amoled' as const, label: 'AMOLED', bg: '#000000', border: '#FFFFFF' },
                    ]).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          theme === t.id ? 'border-[var(--volt)] volt-glow' : 'border-[#242424] hover:border-[#3a3a3a]'
                        }`}
                        style={{ background: t.bg }}
                      >
                        <div className="space-y-1.5 mb-3">
                          <div className="h-1.5 rounded-full w-full" style={{ background: t.border, opacity: 0.4 }} />
                          <div className="h-1.5 rounded-full w-3/4" style={{ background: t.border, opacity: 0.2 }} />
                          <div className="h-1.5 rounded-full w-1/2" style={{ background: t.border, opacity: 0.1 }} />
                        </div>
                        <p className="text-xs font-ui font-semibold text-center">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
