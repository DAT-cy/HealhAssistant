import { create } from 'zustand';
import { authService } from '@/api/services/auth.service';
import { apiClient } from '@/api/client';
import { navigationService } from '@/routes';
import { appStorage } from '@/utils/storage';
import { LoginResponse, Role } from '@/api/types';

const TOKEN_KEY = 'auth_token';

// ============================================================
// Types
// ============================================================
interface UserState {
  token: string | null;
  username: string;
  role: Role | null;
  initialized: boolean;
  profileComplete: boolean | null;

  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  completeLogin: (response: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  setProfileComplete: (complete: boolean | null) => void;
}

// ============================================================
// Store
// ============================================================
export const useUserStore = create<UserState>((set) => ({
  token: null,
  username: '',
  role: null,
  initialized: false,
  profileComplete: null,

  init: async () => {
    try {
      const token = await appStorage.getItem(TOKEN_KEY);
      if (token) {
        apiClient.setToken(token);
        try {
          const profile = await authService.profile();
          set({ token, username: profile.username || '', role: profile.role ?? null, initialized: true, profileComplete: null });
        } catch {
          // Token không còn hợp lệ trên backend -> dọn dẹp sạch sẽ
          await appStorage.removeItem(TOKEN_KEY);
          apiClient.setToken(null);
          set({ token: null, username: '', role: null, initialized: true, profileComplete: null });
        }
      } else {
        apiClient.setToken(null);
        set({ token: null, username: '', role: null, initialized: true, profileComplete: null });
      }
    } catch {
      apiClient.setToken(null);
      set({ token: null, username: '', role: null, initialized: true, profileComplete: null });
    }
  },

  login: async (username: string, password: string) => {
    const response = await authService.login(username, password);
    await useUserStore.getState().completeLogin(response);
  },

  completeLogin: async (response: LoginResponse) => {
    await appStorage.setItem(TOKEN_KEY, response.token);
    apiClient.setToken(response.token);
    set({ token: response.token, username: response.username || '', role: response.role ?? null, profileComplete: null });
  },

  logout: async () => {
    try {
      // Xóa token khỏi SecureStore trên thiết bị.
      await appStorage.removeItem(TOKEN_KEY);
    } catch (err) {
      console.warn('Lỗi khi xóa token khỏi storage:', err);
    }
    // 2. Xóa header Authorization trong apiClient
    apiClient.setToken(null);
    // 3. Cập nhật state Zustand
    set({ token: null, username: '', role: null, profileComplete: null });
    // 4. Replace with the unauthenticated route immediately.
    navigationService.replace('Login');
  },
  setProfileComplete: (complete) => set({ profileComplete: complete }),
}));

// Xử lý 401 tự động đăng xuất (chỉ một lần).
apiClient.setUnauthorizedHandler(() => {
  useUserStore.getState().logout().catch(() => {});
});
