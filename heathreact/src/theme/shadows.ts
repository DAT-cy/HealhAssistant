import { Platform } from 'react-native';
export const shadows = {
  card: Platform.select({ ios: { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }),
  modal: Platform.select({ ios: { shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 8 } }),
} as const;
