import type { ApolloError } from '@apollo/client';
import { getApolloAuthContext, getAuthHeader } from '@/lib/auth';
import { getApolloErrorCode, getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import { isInvalidSessionError, validateStoredSession } from '@/lib/auth/sessionValidation';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  toFieldErrors,
} from '@/lib/auth/validation';

type MobilePlatform = 'android' | 'ios' | 'web';

type AppleSignInModule = typeof import('@/lib/auth/appleSignIn');
type GoogleSignInModule = typeof import('@/lib/auth/googleSignIn');

function loadGoogleSignInModule({
  applicationId = 'com.gatherle.mobile',
  currentUser = null,
  hasPreviousSignIn = false,
  isDev = false,
  iosClientId,
  platform,
  webClientId,
}: {
  applicationId?: string;
  currentUser?: Record<string, unknown> | null;
  hasPreviousSignIn?: boolean;
  isDev?: boolean;
  iosClientId?: string;
  platform: MobilePlatform;
  webClientId?: string;
}) {
  const configureMock = jest.fn();
  const getCurrentUserMock = jest.fn(() => currentUser);
  const hasPreviousSignInMock = jest.fn(() => hasPreviousSignIn);
  const revokeAccessMock = jest.fn().mockResolvedValue(null);
  const signOutMock = jest.fn().mockResolvedValue(null);
  const nextEnv = { ...process.env };
  const originalDev = global.__DEV__;

  if (webClientId === undefined) {
    delete nextEnv.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB;
  } else {
    nextEnv.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB = webClientId;
  }

  if (iosClientId === undefined) {
    delete nextEnv.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS;
  } else {
    nextEnv.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS = iosClientId;
  }

  process.env = nextEnv;
  jest.resetModules();
  jest.doMock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
      configure: configureMock,
      getCurrentUser: getCurrentUserMock,
      hasPreviousSignIn: hasPreviousSignInMock,
      revokeAccess: revokeAccessMock,
      signOut: signOutMock,
    },
  }));
  jest.doMock('expo-application', () => ({
    applicationId,
  }));
  jest.doMock('react-native', () => ({
    Platform: {
      OS: platform,
    },
  }));
  global.__DEV__ = isDev;

  let googleSignInModule: GoogleSignInModule;
  jest.isolateModules(() => {
    googleSignInModule = require('@/lib/auth/googleSignIn') as GoogleSignInModule;
  });

  return {
    configureMock,
    googleSignInModule: googleSignInModule!,
    hasPreviousSignInMock,
    revokeAccessMock,
    signOutMock,
    resetDevFlag() {
      global.__DEV__ = originalDev;
    },
  };
}

function loadAppleSignInModule({
  appleAvailable = true,
  platform,
  webappUrl,
}: {
  appleAvailable?: boolean;
  platform: MobilePlatform;
  webappUrl?: string;
}) {
  const isAvailableAsync = jest.fn().mockResolvedValue(appleAvailable);
  const randomUUID = jest
    .fn()
    .mockReturnValueOnce('uuid-1')
    .mockReturnValueOnce('uuid-2')
    .mockReturnValue('uuid-repeat');
  const signInAsync = jest.fn();
  const openAuthSessionAsync = jest.fn();
  const nextEnv = { ...process.env };

  if (webappUrl === undefined) {
    delete nextEnv.EXPO_PUBLIC_WEBAPP_URL;
  } else {
    nextEnv.EXPO_PUBLIC_WEBAPP_URL = webappUrl;
  }

  process.env = nextEnv;
  jest.resetModules();
  jest.doMock('expo-apple-authentication', () => ({
    AppleAuthenticationScope: {
      FULL_NAME: 0,
      EMAIL: 1,
    },
    isAvailableAsync,
    signInAsync,
  }));
  jest.doMock('expo-crypto', () => ({
    randomUUID,
  }));
  jest.doMock('expo-web-browser', () => ({
    openAuthSessionAsync,
  }));
  jest.doMock('react-native', () => ({
    Platform: {
      OS: platform,
    },
  }));

  let appleSignInModule: AppleSignInModule;
  jest.isolateModules(() => {
    appleSignInModule = require('@/lib/auth/appleSignIn') as AppleSignInModule;
  });

  return {
    appleSignInModule: appleSignInModule!,
    isAvailableAsync,
    openAuthSessionAsync,
    randomUUID,
    signInAsync,
  };
}

describe('mobile auth helpers', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('builds authorization headers only when a token exists', () => {
    expect(getAuthHeader(null)).toEqual({});
    expect(getAuthHeader(undefined)).toEqual({});
    expect(getAuthHeader('token-123')).toEqual({ Authorization: 'Bearer token-123' });
    expect(getApolloAuthContext('token-123')).toEqual({ context: { headers: { Authorization: 'Bearer token-123' } } });
  });

  it('validates login and forgot-password email formats', () => {
    expect(loginSchema.safeParse({ email: 'person@example.com', password: 'password1' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'bad-email', password: 'password1' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'person@example.com', password: 'short' }).success).toBe(false);

    expect(forgotPasswordSchema.safeParse({ email: 'person@example.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'person' }).success).toBe(false);
  });

  it('validates registration password strength and real YYYY-MM-DD dates', () => {
    const validInput = {
      birthdate: '1990-02-28',
      email: 'person@example.com',
      family_name: 'User',
      given_name: 'Test',
      password: 'Strong1!',
    };

    expect(registerSchema.safeParse(validInput).success).toBe(true);
    expect(registerSchema.safeParse({ ...validInput, birthdate: '1990-02-30' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, birthdate: '2026-99-99' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, birthdate: '02/28/1990' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'lowercase1!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'NOLOWERCASE1!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'NoNumber!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'NoSpecial1' }).success).toBe(false);
  });

  it('validates reset-password confirmation and exposes field errors', () => {
    expect(resetPasswordSchema.safeParse({ password: 'Strong1!', confirmPassword: 'Strong1!' }).success).toBe(true);

    const result = resetPasswordSchema.safeParse({ password: 'Strong1!', confirmPassword: 'Different1!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).confirmPassword).toContain('Passwords do not match');
    }
  });

  it('extracts Apollo GraphQL and network error details', () => {
    const graphQLError = {
      graphQLErrors: [{ message: 'Not verified', extensions: { code: 'UNAUTHENTICATED' } }],
      message: 'GraphQL error',
    } as unknown as ApolloError;
    expect(getApolloErrorCode(graphQLError)).toBe('UNAUTHENTICATED');
    expect(getApolloErrorMessage(graphQLError)).toBe('Not verified');

    const networkError = {
      graphQLErrors: [],
      message: 'Network wrapper',
      networkError: {
        result: { errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }] },
      },
    } as unknown as ApolloError;
    expect(getApolloErrorCode(networkError)).toBe('FORBIDDEN');
    expect(getApolloErrorMessage(networkError)).toBe('Forbidden');

    const plainError = { graphQLErrors: [], message: 'Plain failure' } as unknown as ApolloError;
    expect(getApolloErrorCode(plainError)).toBeNull();
    expect(getApolloErrorMessage(plainError)).toBe('Plain failure');
  });

  it('recognizes invalid-session GraphQL errors', () => {
    const notFoundError = {
      graphQLErrors: [{ message: 'User missing', extensions: { code: 'NOT_FOUND' } }],
      message: 'GraphQL error',
    } as unknown as ApolloError;
    const unauthenticatedError = {
      graphQLErrors: [{ message: 'Unauthenticated', extensions: { code: 'UNAUTHENTICATED' } }],
      message: 'GraphQL error',
    } as unknown as ApolloError;
    const forbiddenError = {
      graphQLErrors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }],
      message: 'GraphQL error',
    } as unknown as ApolloError;

    expect(isInvalidSessionError(notFoundError)).toBe(true);
    expect(isInvalidSessionError(unauthenticatedError)).toBe(true);
    expect(isInvalidSessionError(forbiddenError)).toBe(false);
  });

  it('invalidates restored sessions when the API user is missing or mismatched', async () => {
    const apolloClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readUserById: {
              email: 'updated@example.com',
              userId: 'user-123',
              username: 'updated-person',
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            readUserById: {
              email: 'person@example.com',
              userId: 'other-user',
              username: 'person',
            },
          },
        })
        .mockRejectedValueOnce({
          graphQLErrors: [{ message: 'User missing', extensions: { code: 'NOT_FOUND' } }],
          message: 'GraphQL error',
        })
        .mockRejectedValueOnce(new Error('Temporary network issue')),
    };

    await expect(
      validateStoredSession(apolloClient as never, {
        email: 'person@example.com',
        token: 'token-123',
        userId: 'user-123',
        username: 'person',
      }),
    ).resolves.toEqual({
      kind: 'valid',
      session: {
        email: 'updated@example.com',
        token: 'token-123',
        userId: 'user-123',
        username: 'updated-person',
      },
    });

    await expect(
      validateStoredSession(apolloClient as never, {
        email: 'person@example.com',
        token: 'token-123',
        userId: 'user-123',
        username: 'person',
      }),
    ).resolves.toEqual({ kind: 'invalid' });

    await expect(
      validateStoredSession(apolloClient as never, {
        email: 'person@example.com',
        token: 'token-123',
        userId: 'user-123',
        username: 'person',
      }),
    ).resolves.toEqual({ kind: 'invalid' });

    await expect(
      validateStoredSession(apolloClient as never, {
        email: 'person@example.com',
        token: 'token-123',
        userId: 'user-123',
        username: 'person',
      }),
    ).resolves.toEqual({
      kind: 'unverified',
      session: {
        email: 'person@example.com',
        token: 'token-123',
        userId: 'user-123',
        username: 'person',
      },
    });
  });

  it('uses native Apple Authentication on iOS and forwards the identity token and profile fields', async () => {
    const { appleSignInModule, isAvailableAsync, signInAsync } = loadAppleSignInModule({
      platform: 'ios',
    });

    signInAsync.mockImplementation(async (options: { nonce: string; state: string }) => ({
      email: 'ios@example.com',
      fullName: {
        familyName: 'User',
        givenName: 'iOS',
      },
      identityToken: 'ios-apple-id-token',
      state: options.state,
    }));

    await expect(appleSignInModule.signInWithApple()).resolves.toEqual({
      email: 'ios@example.com',
      family_name: 'User',
      given_name: 'iOS',
      idToken: 'ios-apple-id-token',
    });

    expect(isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(signInAsync).toHaveBeenCalledWith({
      nonce: expect.any(String),
      requestedScopes: [0, 1],
      state: expect.any(String),
    });

    const [{ nonce, state }] = signInAsync.mock.calls.map(([options]) => options);
    expect(nonce).toBe(state);
  });

  it('uses the web callback bridge for Apple sign-in on Android', async () => {
    const { appleSignInModule, openAuthSessionAsync } = loadAppleSignInModule({
      platform: 'android',
      webappUrl: 'https://beta.gatherle.com',
    });

    openAuthSessionAsync.mockImplementation(async (authorizationUrl: string) => {
      const authUrl = new URL(authorizationUrl);
      const state = authUrl.searchParams.get('state');

      return {
        type: 'success',
        url: `gatherle://auth/apple?state=${encodeURIComponent(state ?? '')}&id_token=android-apple-id-token&email=android%40example.com&given_name=Android&family_name=User`,
      };
    });

    await expect(appleSignInModule.signInWithApple()).resolves.toEqual({
      email: 'android@example.com',
      family_name: 'User',
      given_name: 'Android',
      idToken: 'android-apple-id-token',
    });

    expect(openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining('client_id=com.gatherle.web'),
      'gatherle://auth/apple',
    );

    const [authorizationUrl] = openAuthSessionAsync.mock.calls[0];
    const parsedUrl = new URL(authorizationUrl);
    expect(parsedUrl.searchParams.get('redirect_uri')).toBe('https://beta.gatherle.com/auth/mobile/apple/callback');
    expect(parsedUrl.searchParams.get('response_mode')).toBe('form_post');
    expect(parsedUrl.searchParams.get('response_type')).toBe('code id_token');
    expect(parsedUrl.searchParams.get('scope')).toBe('name email');
  });

  it('treats an iOS Apple sign-in cancellation as a no-op', async () => {
    const { appleSignInModule, signInAsync } = loadAppleSignInModule({
      platform: 'ios',
    });

    signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    await expect(appleSignInModule.signInWithApple()).resolves.toBeNull();
  });

  it('rejects Apple sign-in on iOS when the native module is unavailable', async () => {
    const { appleSignInModule } = loadAppleSignInModule({
      appleAvailable: false,
      platform: 'ios',
    });

    await expect(appleSignInModule.signInWithApple()).rejects.toThrow(
      'Apple sign-in is not available on this iPhone build. Rebuild the app and try again.',
    );
  });

  it('rejects Apple sign-in on iOS when Apple returns the wrong state', async () => {
    const { appleSignInModule, signInAsync } = loadAppleSignInModule({
      platform: 'ios',
    });

    signInAsync.mockResolvedValue({
      email: 'ios@example.com',
      fullName: {
        familyName: 'User',
        givenName: 'iOS',
      },
      identityToken: 'ios-apple-id-token',
      state: 'wrong-state',
    });

    await expect(appleSignInModule.signInWithApple()).rejects.toThrow(
      'Apple sign-in state mismatch. Please try again.',
    );
  });

  it('rejects Apple sign-in on iOS when no identity token is returned', async () => {
    const { appleSignInModule, signInAsync } = loadAppleSignInModule({
      platform: 'ios',
    });

    signInAsync.mockImplementation(async (options: { state: string }) => ({
      email: 'ios@example.com',
      fullName: null,
      identityToken: null,
      state: options.state,
    }));

    await expect(appleSignInModule.signInWithApple()).rejects.toThrow(
      'Apple did not return an identity token. Please try again.',
    );
  });

  it('rethrows non-cancellation Apple sign-in errors on iOS', async () => {
    const { appleSignInModule, signInAsync } = loadAppleSignInModule({
      platform: 'ios',
    });

    signInAsync.mockRejectedValue('unexpected-ios-error');

    await expect(appleSignInModule.signInWithApple()).rejects.toBe('unexpected-ios-error');
  });

  it('treats a dismissed Android Apple browser session as a no-op', async () => {
    const { appleSignInModule, openAuthSessionAsync } = loadAppleSignInModule({
      platform: 'android',
    });

    openAuthSessionAsync.mockResolvedValue({
      type: 'dismiss',
    });

    await expect(appleSignInModule.signInWithApple()).resolves.toBeNull();
  });

  it('treats an access-denied Android Apple callback as a no-op', async () => {
    const { appleSignInModule, openAuthSessionAsync } = loadAppleSignInModule({
      platform: 'android',
    });

    openAuthSessionAsync.mockImplementation(async (authorizationUrl: string) => {
      const authUrl = new URL(authorizationUrl);
      const state = authUrl.searchParams.get('state');

      return {
        type: 'success',
        url: `gatherle://auth/apple?state=${encodeURIComponent(state ?? '')}&error=access_denied`,
      };
    });

    await expect(appleSignInModule.signInWithApple()).resolves.toBeNull();
  });

  it('rejects Android Apple callbacks that return an explicit error', async () => {
    const { appleSignInModule, openAuthSessionAsync } = loadAppleSignInModule({
      platform: 'android',
    });

    openAuthSessionAsync.mockImplementation(async (authorizationUrl: string) => {
      const authUrl = new URL(authorizationUrl);
      const state = authUrl.searchParams.get('state');

      return {
        type: 'success',
        url: `gatherle://auth/apple?state=${encodeURIComponent(state ?? '')}&error=server_error&error_description=Apple%20callback%20failed`,
      };
    });

    await expect(appleSignInModule.signInWithApple()).rejects.toThrow('Apple callback failed');
  });

  it('rejects Android Apple callbacks with a missing or mismatched state', async () => {
    const { appleSignInModule, openAuthSessionAsync } = loadAppleSignInModule({
      platform: 'android',
    });

    openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'gatherle://auth/apple?id_token=android-apple-id-token&state=wrong-state',
    });

    await expect(appleSignInModule.signInWithApple()).rejects.toThrow(
      'Apple sign-in state mismatch. Please try again.',
    );
  });

  it('rejects Android Apple callbacks that omit the identity token', async () => {
    const { appleSignInModule, openAuthSessionAsync } = loadAppleSignInModule({
      platform: 'android',
    });

    openAuthSessionAsync.mockImplementation(async (authorizationUrl: string) => {
      const authUrl = new URL(authorizationUrl);
      const state = authUrl.searchParams.get('state');

      return {
        type: 'success',
        url: `gatherle://auth/apple?state=${encodeURIComponent(state ?? '')}`,
      };
    });

    await expect(appleSignInModule.signInWithApple()).rejects.toThrow(
      'Apple did not return an identity token. Please try again.',
    );
  });

  it('rejects Apple sign-in on non-native platforms', async () => {
    const { appleSignInModule } = loadAppleSignInModule({
      platform: 'web',
    });

    await expect(appleSignInModule.signInWithApple()).rejects.toThrow(
      'Apple sign-in is only available in native mobile builds.',
    );
  });

  it('reports Google Sign-In availability and messages per platform', () => {
    const androidModule = loadGoogleSignInModule({
      platform: 'android',
      webClientId: 'android-web-client.apps.googleusercontent.com',
    });
    expect(androidModule.googleSignInModule.isGoogleSignInConfiguredForPlatform()).toBe(true);
    expect(androidModule.googleSignInModule.getGoogleSignInUnavailableMessage()).toBe(
      'Google sign-in is not configured for this Android build.',
    );
    expect(androidModule.googleSignInModule.getGoogleSignInDeveloperErrorMessage()).toContain(
      'package com.gatherle.mobile',
    );
    androidModule.resetDevFlag();

    const iosModule = loadGoogleSignInModule({
      iosClientId: 'ios-client.apps.googleusercontent.com',
      platform: 'ios',
      webClientId: 'ios-web-client.apps.googleusercontent.com',
    });
    expect(iosModule.googleSignInModule.isGoogleSignInConfiguredForPlatform()).toBe(true);
    expect(iosModule.googleSignInModule.getGoogleSignInUnavailableMessage()).toBe(
      'Google sign-in is not configured for this iOS build.',
    );
    expect(iosModule.googleSignInModule.getGoogleSignInDeveloperErrorMessage()).toBe(
      'Google sign-in is misconfigured for this build.',
    );
    iosModule.resetDevFlag();

    const webModule = loadGoogleSignInModule({
      platform: 'web',
      webClientId: 'web-client.apps.googleusercontent.com',
    });
    expect(webModule.googleSignInModule.isGoogleSignInConfiguredForPlatform()).toBe(false);
    expect(webModule.googleSignInModule.getGoogleSignInUnavailableMessage()).toBe(
      'Google sign-in is only available in native mobile builds.',
    );
    webModule.resetDevFlag();
  });

  it('surfaces a debug-signing hint for Android developer errors in dev builds', () => {
    const androidDevModule = loadGoogleSignInModule({
      applicationId: 'com.gatherle.mobile',
      isDev: true,
      platform: 'android',
      webClientId: 'android-web-client.apps.googleusercontent.com',
    });

    expect(androidDevModule.googleSignInModule.getGoogleSignInDeveloperErrorMessage()).toContain(
      'Run `npm run android:oauth:doctor` to confirm whether this installed dev build is using the shared release keystore or the fallback Expo debug keystore.',
    );

    androidDevModule.resetDevFlag();
  });

  it('skips Google Sign-In setup when the current platform is missing required configuration', () => {
    const { configureMock: androidConfigureMock, googleSignInModule: androidModule } = loadGoogleSignInModule({
      platform: 'android',
    });
    expect(androidModule.isGoogleSignInConfiguredForPlatform()).toBe(false);
    androidModule.configureMobileGoogleSignIn();
    expect(androidConfigureMock).not.toHaveBeenCalled();

    const { configureMock: iosConfigureMock, googleSignInModule: iosModule } = loadGoogleSignInModule({
      platform: 'ios',
      webClientId: 'ios-web-client.apps.googleusercontent.com',
    });
    expect(iosModule.isGoogleSignInConfiguredForPlatform()).toBe(false);
    iosModule.configureMobileGoogleSignIn();
    expect(iosConfigureMock).not.toHaveBeenCalled();
  });

  it('configures Google Sign-In exactly once per native module instance', () => {
    const { configureMock, googleSignInModule } = loadGoogleSignInModule({
      iosClientId: 'ios-client.apps.googleusercontent.com',
      platform: 'ios',
      webClientId: 'ios-web-client.apps.googleusercontent.com',
    });

    googleSignInModule.configureMobileGoogleSignIn();
    googleSignInModule.configureMobileGoogleSignIn();

    expect(configureMock).toHaveBeenCalledTimes(1);
    expect(configureMock).toHaveBeenCalledWith({
      iosClientId: 'ios-client.apps.googleusercontent.com',
      webClientId: 'ios-web-client.apps.googleusercontent.com',
    });
  });

  it('never configures Google Sign-In on web even when client IDs exist', () => {
    const { configureMock, googleSignInModule } = loadGoogleSignInModule({
      iosClientId: 'ios-client.apps.googleusercontent.com',
      platform: 'web',
      webClientId: 'web-client.apps.googleusercontent.com',
    });

    googleSignInModule.configureMobileGoogleSignIn();

    expect(configureMock).not.toHaveBeenCalled();
  });

  it('clears the native Google session on logout when a prior sign-in exists', async () => {
    const { configureMock, googleSignInModule, revokeAccessMock, signOutMock } = loadGoogleSignInModule({
      hasPreviousSignIn: true,
      platform: 'android',
      webClientId: 'android-web-client.apps.googleusercontent.com',
    });

    await googleSignInModule.clearMobileGoogleSignInSession();

    expect(configureMock).toHaveBeenCalledTimes(1);
    expect(revokeAccessMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('still signs out locally when Google access revocation fails', async () => {
    const { googleSignInModule, revokeAccessMock, signOutMock } = loadGoogleSignInModule({
      hasPreviousSignIn: true,
      platform: 'android',
      webClientId: 'android-web-client.apps.googleusercontent.com',
    });

    revokeAccessMock.mockRejectedValueOnce(new Error('revoke failed'));

    await googleSignInModule.clearMobileGoogleSignInSession();

    expect(revokeAccessMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('skips Google session clearing when no native Google user is cached', async () => {
    const { configureMock, googleSignInModule, signOutMock } = loadGoogleSignInModule({
      hasPreviousSignIn: false,
      platform: 'android',
      webClientId: 'android-web-client.apps.googleusercontent.com',
    });

    await googleSignInModule.clearMobileGoogleSignInSession();

    expect(configureMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
