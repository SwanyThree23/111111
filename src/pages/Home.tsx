import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

function Home() {
  return (
    <>
      <div className="hero-stream">
        <Link to="/stream/featured">
          <img src="/hero.png" alt="Featured Stream" />
          <div className="live-badge">LIVE</div>
          <div className="hero-content">
            <div className="stream-info">
              <h1>Cyberpunk 2077: Phantom Liberty Run</h1>
              <div className="stream-meta">
                <span className="text-xs font-semibold" style={{ background: 'var(--primary)', padding: '4px 10px', borderRadius: '4px' }}>RPG</span>
                <span className="font-medium text-sm">NeonNinja_99</span>
                <span className="text-muted text-sm">24.5k watching</span>
              </div>
            </div>
            <button className="btn btn-primary glass-panel">Watch Now</button>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Recommended Streams</h2>
        <button className="btn btn-outline text-sm">View All</button>
      </div>

      <div className="grid-cards">
        {/* Stream Card 1 */}
        <Link to="/stream/1" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stream-card">
            <div className="card-thumbnail">
              <img src="/thumb1.png" alt="Stream 1" />
              <div className="card-viewers">12.1K viewers</div>
            </div>
            <div className="card-details">
              <img src="/avatar1.png" className="card-user-avatar" alt="User 1" />
              <div className="card-info">
                <h3>Late Night Coding & Vibes: Building Web3</h3>
                <p className="text-muted text-sm">TechBro_Dev</p>
                <div className="tags">
                  <span className="tag">Software & Game Dev</span>
                  <span className="tag">English</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Stream Card 2 */}
        <Link to="/stream/2" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stream-card">
            <div className="card-thumbnail">
              <img src="/thumb2.png" alt="Stream 2" />
              <div className="card-viewers">8.4K viewers</div>
            </div>
            <div className="card-details">
              <img src="/avatar2.png" className="card-user-avatar" alt="User 2" />
              <div className="card-info">
                <h3>Valorant Ranked Ascent: Road to Radiant</h3>
                <p className="text-muted text-sm">ProAimz</p>
                <div className="tags">
                  <span className="tag">Valorant</span>
                  <span className="tag">FPS</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Stream Card 3 */}
        <Link to="/stream/3" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stream-card">
            <div className="card-thumbnail">
              <img src="/thumb3.png" alt="Stream 3" />
              <div className="card-viewers">4.2K viewers</div>
            </div>
            <div className="card-details">
              <div className="card-user-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)' }}>
                <User size={20} color="white" />
              </div>
              <div className="card-info">
                <h3>Just Chatting & Music Production Live</h3>
                <p className="text-muted text-sm">DJ_Electro</p>
                <div className="tags">
                  <span className="tag">Music</span>
                  <span className="tag">Chatting</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}

export default Home;
