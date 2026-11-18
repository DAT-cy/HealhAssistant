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
