import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
// import { io } from 'socket.io-client';
import { Send, Users, Heart, Share2, MoreVertical } from 'lucide-react';

export default function StreamView() {
  const { id } = useParams();
  const chatRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<{user: string, text: string, color: string}[]>([
    { user: 'CyberNinja', text: 'PogChamp', color: '#ffb300' },
    { user: 'NeoDev', text: 'This stream is fire 🔥', color: '#00e5ff' },
    { user: 'Glitch001', text: 'What stack are you using?', color: '#9d00ff' },
    { user: 'ZeroCool', text: 'React + Vite is the best.', color: '#00e5ff' },
    { user: 'System', text: 'Welcome to the chat room!', color: '#8b8b99' },
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    // In a real implementation:
    // const socket = io('https://your-backend-url.com');
    // socket.on('chat_message', (msg) => setMessages(prev => [...prev, msg]));
    // return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { user: 'You', text: chatInput, color: '#ff3366' }]);
    setChatInput('');
  };

  return (
    <div className="stream-layout">
      {/* Video Section */}
      <div className="stream-main-column">
        <div className="stream-video-container">
          <img 
            src={id === 'featured' ? '/hero.png' : `/thumb${id}.png`} 
            alt="Stream Video Placeholder" 
            onError={(e) => { e.currentTarget.src = '/hero.png'; }}
          />
          <div className="live-status-overlay">LIVE CONCURRENT: 24,512</div>
        </div>
        
        <div className="stream-info-bar glass-panel">
          <div className="stream-info-left">
            <img src="/avatar1.png" className="avatar-large" alt="Streamer" />
            <div className="stream-details">
              <h1>Building SeeWhy Live - Part 2</h1>
              <p className="text-muted">NeonNinja_99 • Development & IT</p>
            </div>
          </div>
          <div className="stream-info-right">
            <button className="btn btn-primary">
              <Heart size={18} /> Follow
            </button>
            <button className="btn btn-outline btn-icon" title="Share">
              <Share2 size={18} />
            </button>
            <button className="btn btn-outline btn-icon" title="More">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Chat Section */}
      <div className="chat-sidebar glass-panel">
        <div className="chat-header">
          <h3>Stream Chat</h3>
          <span className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Users size={14} /> 24.5k
          </span>
        </div>
        
        <div className="chat-messages" ref={chatRef}>
          {messages.map((msg, i) => (
            <div key={i} className="chat-message">
              <span className="chat-username" style={{ color: msg.color }}>{msg.user}: </span>
              <span className="chat-text">{msg.text}</span>
            </div>
          ))}
        </div>

        <form className="chat-input-form" onSubmit={handleSend}>
          <input 
            type="text" 
            placeholder="Send a message..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" className="btn-icon send-btn">
            <Send size={18} color="var(--primary)" />
          </button>
        </form>
      </div>
    </div>
  );
}
