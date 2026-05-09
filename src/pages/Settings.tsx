import { User, Bell, Palette, Shield, CreditCard } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="settings-container" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Account Settings</h1>
      
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Settings Sidebar Menu */}
        <div className="settings-menu glass-panel" style={{ width: '250px', padding: '1rem', height: 'fit-content' }}>
          <div className="nav-item active" style={{ borderRadius: '8px' }}>
            <User size={18} /> Profile
          </div>
          <div className="nav-item" style={{ borderRadius: '8px' }}>
            <Palette size={18} /> Appearance
          </div>
          <div className="nav-item" style={{ borderRadius: '8px' }}>
            <Bell size={18} /> Notifications
          </div>
          <div className="nav-item" style={{ borderRadius: '8px' }}>
            <Shield size={18} /> Security & Privacy
          </div>
          <div className="nav-item" style={{ borderRadius: '8px' }}>
            <CreditCard size={18} /> Subscriptions
          </div>
        </div>

        {/* Settings Content Box */}
        <div className="settings-content glass-panel" style={{ flex: 1, padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
            <img src="/avatar.png" alt="User" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
            <div>
              <h2 style={{ marginBottom: '0.5rem' }}>NeonNinja_99</h2>
              <button className="btn btn-outline text-sm">Change Avatar</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Display Name</label>
              <input type="text" defaultValue="NeonNinja_99" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'white', fontFamily: 'inherit' }} />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email Address</label>
              <input type="email" defaultValue="neon.ninja@cyber.net" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'white', fontFamily: 'inherit' }} />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Bio</label>
              <textarea defaultValue="Streaming the future of gaming. Part-time developer, full-time cyberpunk." rows={4} style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-dark)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'white', fontFamily: 'inherit', resize: 'none' }} />
            </div>

            <button className="btn btn-primary" style={{ width: 'fit-content', marginTop: '1rem' }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
