/**
 * Thiết lập chung cho mọi test (chạy trước mỗi file test).
 * - Cố định baseURL để test không phụ thuộc file .env trên máy.
 * - SecureStore là native module, không chạy trong Jest -> thay bằng Map trong bộ nhớ.
 */
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key); }),
  };
});

// sonner-native cần native module (gesture handler, reanimated, svg) -> thay bằng hàm giả trong test.
jest.mock('sonner-native', () => {
  const toast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn(), loading: jest.fn(), dismiss: jest.fn() });
  return { toast, Toaster: () => null };
});
