import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ============================================================
// Network config – multi-site support
// ============================================================
export const network = {
  contentType: 'application/json;charset=UTF-8',
  messageDuration: 3000,
  requestTimeout: 30000,
  successCode: 200,
  invalidCode: 401,
  noPermissionCode: 403,

  /** Default Frappe site URL (override bằng EXPO_PUBLIC_FRAPPE_SITE_URL trong .env) */
  siteUrl: Constants.expoConfig?.extra?.frappeSiteUrl ?? '',

  /** Storage key cho site URL */
  SITE_KEY: '@frappe_site_url',
  SID_KEY: '@frappe_sid',

  async getSiteUrl(): Promise<string | null> {
    return AsyncStorage.getItem(this.SITE_KEY);
  },

  async setSiteUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(this.SITE_KEY, url);
  },
};
