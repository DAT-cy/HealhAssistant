import Constants from 'expo-constants';

// Không hardcode host production: đọc từ EXPO_PUBLIC_API_BASE_URL hoặc Expo extra.
export const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8080';
export const apiVersion = '/api/v1';
