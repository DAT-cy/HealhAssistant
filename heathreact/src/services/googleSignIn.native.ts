import { Platform } from 'react-native';

export async function signInWithGoogle(): Promise<string | null> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  if (!webClientId) throw new Error('Google OAuth is not configured for this app.');
  if (Platform.OS === 'ios' && (!iosClientId || !iosUrlScheme)) throw new Error('Google iOS OAuth client ID and URL scheme are required.');

  let googleSignInModule: typeof import('@react-native-google-signin/google-signin');
  try {
    googleSignInModule = await import('@react-native-google-signin/google-signin');
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    if (detail.includes('RNGoogleSignin') || detail.includes('TurboModuleRegistry')) {
      throw new Error('Google Sign-In chưa được tích hợp vào ứng dụng này. Hãy cài development build mới; Expo Go không hỗ trợ module này.');
    }
    throw error;
  }

  const { GoogleSignin, isSuccessResponse } = googleSignInModule;
  GoogleSignin.configure({ webClientId, iosClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) return null;
  if (!result.data.idToken) throw new Error('Google did not return an ID token. Check the OAuth client IDs.');
  return result.data.idToken;
}
