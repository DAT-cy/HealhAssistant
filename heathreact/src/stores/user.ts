import { create } from 'zustand';
import { authService } from '@/api/services/auth.service';
import { apiClient } from '@/api/client';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

// ============================================================
// Types
// ============================================================
interface UserState {
  token: string | null;
  username: string;
  initialized: boolean;

  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ============================================================
// Store
// ============================================================
export const useUserStore = create<UserState>((set, get) => ({
  token: null,
  username: '',
  initialized: false,

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        apiClient.setToken(token);
        const profile = await authService.profile();
        set({ token, username: profile.username, initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  login: async (username: string, password: string) => {
    const response = await authService.login(username, password);
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    apiClient.setToken(response.token);
    set({ token: response.token, username: response.username });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    apiClient.setToken(null);
    set({ token: null, username: '' });
  },
}));

// Xử lý 401 tự động đăng xuất (chỉ một lần).
apiClient.setUnauthorizedHandler(() => {
  useUserStore.getState().logout().catch(() => {});
});
