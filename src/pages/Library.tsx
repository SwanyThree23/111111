import { Library, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LibraryView() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Library size={32} color="var(--primary)" />
        <h1 style={{ fontSize: '2rem' }}>Your Library</h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <button className="nav-item active" style={{ background: 'transparent', paddingBottom: '1rem', borderBottom: '2px solid var(--primary)', borderRadius: 0, paddingLeft: 0, paddingRight: 0, marginRight: '2rem' }}>Saved Streams</button>
        <button className="nav-item" style={{ background: 'transparent', paddingBottom: '1rem', borderRadius: 0, paddingLeft: 0, paddingRight: 0, marginRight: '2rem' }}>Watch History</button>
        <button className="nav-item" style={{ background: 'transparent', paddingBottom: '1rem', borderRadius: 0, paddingLeft: 0, paddingRight: 0 }}>Playlists</button>
      </div>

      <div className="grid-cards">
        {/* Saved Stream 1 */}
        <Link to="/stream/1" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stream-card">
            <div className="card-thumbnail">
              <img src="/thumb1.png" alt="Saved Stream" />
              <div className="live-status-overlay" style={{ background: 'rgba(0,0,0,0.8)', border: 'none', color: 'white' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> 2:45:10
              </div>
            </div>
            <div className="card-details">
              <div className="card-info" style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Late Night Coding - Building Web3</h3>
                <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>TechBro_Dev • Streamed 2 days ago</p>
                <div style={{ width: '100%', background: 'var(--bg-dark)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: '45%', background: 'var(--primary)', height: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </Link>
        
        {/* Saved Stream 2 */}
        <Link to="/stream/2" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stream-card">
            <div className="card-thumbnail">
              <img src="/thumb2.png" alt="Saved Stream 2" />
              <div className="live-status-overlay" style={{ background: 'rgba(0,0,0,0.8)', border: 'none', color: 'white' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> 4:12:00
              </div>
            </div>
            <div className="card-details">
              <div className="card-info" style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Valorant Ranked Ascent Grind</h3>
                <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>ProAimz • Streamed 1 week ago</p>
                <div style={{ width: '100%', background: 'var(--bg-dark)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: '10%', background: 'var(--primary)', height: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
