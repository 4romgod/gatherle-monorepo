import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const APPLE_OAUTH_CLIENT_ID_WEB = 'com.gatherle.web';
const APPLE_AUTHORIZATION_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_MOBILE_CALLBACK_PATH = '/auth/mobile/apple/callback';
const APPLE_MOBILE_DEEP_LINK = 'gatherle://auth/apple';
const DEFAULT_WEBAPP_URL = 'https://gatherle.com';
const APPLE_REQUEST_CANCELED_CODE = 'ERR_REQUEST_CANCELED';
const APPLE_ACCESS_DENIED_ERROR = 'access_denied';

export type AppleOAuthIdentity = {
  idToken: string;
  email?: string | null;
  given_name?: string | null;
  family_name?: string | null;
};

type AppleBrowserCallbackPayload = AppleOAuthIdentity & {
  error?: string | null;
  errorDescription?: string | null;
  state?: string | null;
};

function trimSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getWebappBaseUrl() {
  return trimSlash(process.env.EXPO_PUBLIC_WEBAPP_URL?.trim() || DEFAULT_WEBAPP_URL);
}

function getAppleMobileCallbackUrl() {
  return `${getWebappBaseUrl()}${APPLE_MOBILE_CALLBACK_PATH}`;
}

function asOptionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function createAuthState() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function isAppleRequestCanceled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = 'code' in error ? asOptionalString(String(error.code)) : undefined;
  return code === APPLE_REQUEST_CANCELED_CODE;
}

function buildAppleAuthorizationUrl(authState: string) {
  const params = new URLSearchParams({
    client_id: APPLE_OAUTH_CLIENT_ID_WEB,
    nonce: authState,
    redirect_uri: getAppleMobileCallbackUrl(),
    response_mode: 'form_post',
    response_type: 'code id_token',
    scope: 'name email',
    state: authState,
  });

  return `${APPLE_AUTHORIZATION_URL}?${params.toString()}`;
}

function parseAppleBrowserCallbackUrl(url: string): AppleBrowserCallbackPayload {
  const parsedUrl = new URL(url);
  const searchParams = parsedUrl.searchParams;

  return {
    error: asOptionalString(searchParams.get('error')),
    errorDescription: asOptionalString(searchParams.get('error_description')),
    state: asOptionalString(searchParams.get('state')),
    idToken: asOptionalString(searchParams.get('id_token')) ?? '',
    email: asOptionalString(searchParams.get('email')) ?? null,
    given_name: asOptionalString(searchParams.get('given_name')) ?? null,
    family_name: asOptionalString(searchParams.get('family_name')) ?? null,
  };
}

async function signInWithAppleOnIos(): Promise<AppleOAuthIdentity | null> {
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new Error('Apple sign-in is not available on this iPhone build. Rebuild the app and try again.');
  }

  const authState = createAuthState();

  try {
    const credential = await AppleAuthentication.signInAsync({
      nonce: authState,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      state: authState,
    });

    if (credential.state !== authState) {
      throw new Error('Apple sign-in state mismatch. Please try again.');
    }

    const idToken = asOptionalString(credential.identityToken);
    if (!idToken) {
      throw new Error('Apple did not return an identity token. Please try again.');
    }

    return {
      idToken,
      email: asOptionalString(credential.email) ?? null,
      given_name: asOptionalString(credential.fullName?.givenName) ?? null,
      family_name: asOptionalString(credential.fullName?.familyName) ?? null,
    };
  } catch (error) {
    if (isAppleRequestCanceled(error)) {
      return null;
    }

    throw error;
  }
}

async function signInWithAppleOnAndroid(): Promise<AppleOAuthIdentity | null> {
  const authState = createAuthState();
  const result = await WebBrowser.openAuthSessionAsync(buildAppleAuthorizationUrl(authState), APPLE_MOBILE_DEEP_LINK);

  if (result.type !== 'success') {
    return null;
  }

  const callbackPayload = parseAppleBrowserCallbackUrl(result.url);

  if (callbackPayload.error) {
    if (callbackPayload.error === APPLE_ACCESS_DENIED_ERROR) {
      return null;
    }

    throw new Error(callbackPayload.errorDescription ?? 'Apple sign-in failed. Please try again.');
  }

  if (!callbackPayload.state || callbackPayload.state !== authState) {
    throw new Error('Apple sign-in state mismatch. Please try again.');
  }

  if (!callbackPayload.idToken) {
    throw new Error('Apple did not return an identity token. Please try again.');
  }

  return {
    idToken: callbackPayload.idToken,
    email: callbackPayload.email ?? null,
    given_name: callbackPayload.given_name ?? null,
    family_name: callbackPayload.family_name ?? null,
  };
}

export async function signInWithApple(): Promise<AppleOAuthIdentity | null> {
  switch (Platform.OS) {
    case 'ios':
      return signInWithAppleOnIos();
    case 'android':
      return signInWithAppleOnAndroid();
    default:
      throw new Error('Apple sign-in is only available in native mobile builds.');
  }
}
