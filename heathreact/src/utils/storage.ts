import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

/**
 * Bộ tiện ích lưu trữ an toàn, tự động tương thích cả Mobile (SecureStore) và Web (localStorage)
 */
export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[appStorage] getItem failed for key "${key}":`, e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`[appStorage] setItem failed for key "${key}":`, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[appStorage] removeItem failed for key "${key}":`, e);
    }
  },
};

export async function getToken(): Promise<string | null> {
  return appStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  return appStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  return appStorage.removeItem(TOKEN_KEY);
}

