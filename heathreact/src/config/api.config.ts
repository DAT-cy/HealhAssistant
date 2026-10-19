import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Không hardcode host production: đọc từ EXPO_PUBLIC_API_BASE_URL hoặc Expo extra.
const defaultBaseURL = Platform.OS === 'android' ? 'http://10.0.2.2:8084' : 'http://localhost:8084';
export const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? Constants.expoConfig?.extra?.apiBaseUrl ?? defaultBaseURL;
export const apiVersion = '/api/v1';
