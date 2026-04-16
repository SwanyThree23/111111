import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/utils/auth';
import { Loader, Video } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { alert('Passwords do not match'); return; }
    setIsLoading(true);
    try { await register(email, username, password); navigate('/onboarding'); }
    catch {} finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Video className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-gray-600">Join SwanyThree</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input" placeholder="yourusername" required minLength={3} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" required minLength={8} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input" placeholder="••••••••" required /></div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
              {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Creating...</> : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Have account? <Link to="/login" className="text-purple-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
