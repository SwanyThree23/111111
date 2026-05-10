import { create } from 'zustand';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import api from './api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const token = data.session?.access_token || null;
    if (token) localStorage.setItem('token', token);

    let user: User | null = null;
    try {
      const res = await api.get('/auth/me');
      user = res.data.user;
    } catch {
      const su = data.user;
      user = {
        id: su?.id || '',
        email: su?.email || '',
        username: (su?.user_metadata?.username as string) || su?.email?.split('@')[0] || 'creator',
        role: 'creator',
        createdAt: su?.created_at || new Date().toISOString(),
      };
    }

    set({ user, token, isAuthenticated: true });
    toast.success('Welcome back!');
  },

  register: async (email, username, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;

    const token = data.session?.access_token || null;
    if (token) localStorage.setItem('token', token);

    let user: User | null = null;
    try {
      const res = await api.post('/auth/register', { email, username, password });
      user = res.data.user;
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        set({ token: res.data.token });
      }
    } catch {
      const su = data.user;
      user = {
        id: su?.id || '',
        email: su?.email || '',
        username,
        role: 'creator',
        createdAt: su?.created_at || new Date().toISOString(),
      };
    }

    set({ user, isAuthenticated: true });
    toast.success('Account created! Welcome to SeeWhy LIVE.');
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
    toast.success('Logged out');
  },

  loadUser: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const token = session.access_token;
      localStorage.setItem('token', token);
      set({ token, isAuthenticated: true });

      try {
        const res = await api.get('/auth/me');
        set({ user: res.data.user, isLoading: false });
      } catch {
        const su = session.user;
        set({
          user: {
            id: su.id,
            email: su.email || '',
            username: (su.user_metadata?.username as string) || su.email?.split('@')[0] || 'creator',
            role: 'creator',
            createdAt: su.created_at,
          },
          isLoading: false,
        });
      }
      return;
    }

    const stored = localStorage.getItem('token');
    if (!stored) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, token: stored, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
