import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

const GOOGLE_OAUTH_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB?.trim() || null;
const GOOGLE_OAUTH_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS?.trim() || null;

let googleSignInConfigured = false;

export function isGoogleSignInConfiguredForPlatform(): boolean {
  if (Platform.OS === 'android') {
    return Boolean(GOOGLE_OAUTH_CLIENT_ID_WEB);
  }

  if (Platform.OS === 'ios') {
    return Boolean(GOOGLE_OAUTH_CLIENT_ID_WEB && GOOGLE_OAUTH_CLIENT_ID_IOS);
  }

  return false;
}

export function getGoogleSignInUnavailableMessage(): string {
  if (Platform.OS === 'android') {
    return 'Google sign-in is not configured for this Android build.';
  }

  if (Platform.OS === 'ios') {
    return 'Google sign-in is not configured for this iOS build.';
  }

  return 'Google sign-in is only available in native mobile builds.';
}

export function configureMobileGoogleSignIn(): void {
  if (Platform.OS === 'web' || googleSignInConfigured || !isGoogleSignInConfiguredForPlatform()) {
    return;
  }

  GoogleSignin.configure({
    iosClientId: GOOGLE_OAUTH_CLIENT_ID_IOS ?? undefined,
    webClientId: GOOGLE_OAUTH_CLIENT_ID_WEB ?? undefined,
  });

  googleSignInConfigured = true;
}
