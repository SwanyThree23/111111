import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAccessToken } from '@/lib/api';

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { accessToken, user } = await api.post<{ accessToken: string; user: User }>('/api/auth/login', { email, password });
          setAccessToken(accessToken);
          set({ accessToken, user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const { accessToken, user } = await api.post<{ accessToken: string; user: User }>('/api/auth/register', data);
          setAccessToken(accessToken);
          set({ accessToken, user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        await api.post('/api/auth/logout').catch(() => {});
        setAccessToken(null);
        set({ user: null, accessToken: null });
      },

      refresh: async () => {
        try {
          const { accessToken } = await api.post<{ accessToken: string }>('/api/auth/refresh');
          setAccessToken(accessToken);
          set({ accessToken });
        } catch {
          set({ user: null, accessToken: null });
        }
      },
    }),
    {
      name: 'seewhy-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
      },
    }
  )
);
