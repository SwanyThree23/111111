import { 
  Search, Bell, MessageSquare, PlayCircle, 
  Compass, Heart, Library as LibraryIcon, Video, Settings, 
  LogOut, Flame, Radio 
} from 'lucide-react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import StreamView from './pages/StreamView';
import LibraryView from './pages/Library';
import SettingsView from './pages/Settings';

function App() {
  const location = useLocation();
  const isStreamView = location.pathname.includes('/stream');

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <div className="brand-icon">
            <Video size={20} color="white" />
          </div>
          <span className="text-gradient">SeeWhy LIVE</span>
        </Link>

        <div className="search-bar">
          <Search size={18} className="text-muted" />
          <input type="text" placeholder="Search streams, games, channels..." />
        </div>

        <div className="user-actions">
          <button className="btn-icon">
            <Bell size={20} />
          </button>
          <button className="btn-icon">
            <MessageSquare size={20} />
          </button>
          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Radio size={18} /> Go Live
          </Link>
          <Link to="/settings">
            <img src="/avatar.png" className="avatar" alt="User Avatar" />
          </Link>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="nav-section-title">Discover</div>
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <Compass size={20} />
            <span className="font-medium">Explore</span>
          </Link>
          <Link to="/" className="nav-item">
            <Flame size={20} />
            <span className="font-medium">Trending</span>
          </Link>
          <Link to="/" className="nav-item">
            <PlayCircle size={20} />
            <span className="font-medium">Following</span>
          </Link>

          <div className="nav-section-title" style={{ marginTop: '1rem' }}>Library</div>
          <Link to="/library" className={`nav-item ${location.pathname.includes('/library') ? 'active' : ''}`}>
            <Heart size={20} />
            <span className="font-medium">Saved Streams</span>
          </Link>
          <Link to="/library" className="nav-item">
            <LibraryIcon size={20} />
            <span className="font-medium">Collections</span>
          </Link>

          <div className="nav-section-title" style={{ marginTop: 'auto' }}>Account</div>
          <Link to="/settings" className={`nav-item ${location.pathname.includes('/settings') ? 'active' : ''}`}>
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </Link>
          <Link to="/" className="nav-item text-muted">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </Link>
        </aside>

        {/* Content Area */}
        <main className="content-area" style={isStreamView ? { padding: '1.5rem', display: 'flex', flexDirection: 'column' } : {}}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stream/:id" element={<StreamView />} />
            <Route path="/library" element={<LibraryView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
