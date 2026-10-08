import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function setToken(token: string): void {
  SecureStore.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  SecureStore.deleteItemAsync(TOKEN_KEY);
}
