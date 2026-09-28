import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { ApiEnvelope, MeResponse, User } from '../types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  profile: MeResponse['profile'] | null;
  permissions: string[];
  accessToken: string | null;
  refreshToken: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  setSession: (user: User, profile: MeResponse['profile'], permissions: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      permissions: [],
      accessToken: null,
      refreshToken: null,
      status: 'idle',

      login: async (email, password) => {
        const res = await api.post<ApiEnvelope<MeResponse & { accessToken: string; refreshToken: string }>>(
          '/auth/login',
          { email, password },
        );
        const { user, profile, permissions, accessToken, refreshToken } = res.data.data;
        set({ user, profile, permissions, accessToken, refreshToken, status: 'authenticated' });
      },

      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          api
            .post('/auth/logout', { refreshToken })
            .catch(() => undefined);
        }
        set({
          user: null,
          profile: null,
          permissions: [],
          accessToken: null,
          refreshToken: null,
          status: 'unauthenticated',
        });
      },

      bootstrap: async () => {
        if (!get().accessToken) {
          set({ status: 'unauthenticated' });
          return;
        }
        set({ status: 'loading' });
        try {
          const res = await api.get<ApiEnvelope<MeResponse>>('/auth/me');
          const { user, profile, permissions } = res.data.data;
          set({ user, profile, permissions, status: 'authenticated' });
        } catch {
          get().logout();
        }
      },

      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),

      setSession: (user, profile, permissions) =>
        set({ user, profile, permissions, status: 'authenticated' }),
    }),
    {
      name: 'eduportal.auth',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        permissions: state.permissions,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
