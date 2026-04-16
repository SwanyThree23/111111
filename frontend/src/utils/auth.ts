import { create } from 'zustand';
import { User } from '@/types';
import api from './api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null; token: string | null; isAuthenticated: boolean; isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null, token: localStorage.getItem('token'), isAuthenticated: false, isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, token } = res.data;
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
    toast.success('Welcome back!');
  },

  register: async (email, username, password) => {
    const res = await api.post('/auth/register', { email, username, password });
    const { user, token } = res.data;
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
    toast.success('Account created!');
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
    toast.success('Logged out');
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) { set({ isLoading: false, isAuthenticated: false }); return; }
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
