import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const GOOGLE_OAUTH_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB?.trim() || null;
const GOOGLE_OAUTH_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS?.trim() || null;
const ANDROID_APPLICATION_ID = Application.applicationId?.trim() || 'com.gatherle.mobile';

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

export function getGoogleSignInDeveloperErrorMessage(): string {
  if (Platform.OS === 'android') {
    const buildHint =
      typeof __DEV__ !== 'undefined' && __DEV__
        ? 'Run `npm run android:oauth:doctor` to confirm whether this installed dev build is using the shared release keystore or the fallback Expo debug keystore.'
        : 'This installed build must be registered with the signing certificate used to produce it.';

    return `Google sign-in is misconfigured for this Android build. Confirm the Google Cloud Android OAuth client uses package ${ANDROID_APPLICATION_ID} and the signing SHA1 for this installed build. ${buildHint}`;
  }

  return 'Google sign-in is misconfigured for this build.';
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

export async function clearMobileGoogleSignInSession(): Promise<void> {
  if (Platform.OS === 'web' || !isGoogleSignInConfiguredForPlatform()) {
    return;
  }

  configureMobileGoogleSignIn();

  if (!GoogleSignin.hasPreviousSignIn() && !GoogleSignin.getCurrentUser()) {
    return;
  }

  try {
    await GoogleSignin.revokeAccess();
  } catch {
    // Best effort only. Still sign out locally so the chooser can reappear.
  }

  await GoogleSignin.signOut();
}
