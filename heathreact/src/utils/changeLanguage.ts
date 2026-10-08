import AsyncStorage from '@react-native-async-storage/async-storage';

export function changeLanguage(locale: string): void {
  AsyncStorage.setItem('language', locale);
}
