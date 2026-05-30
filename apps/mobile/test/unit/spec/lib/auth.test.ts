import type { ApolloError } from '@apollo/client';
import { getApolloAuthContext, getAuthHeader } from '@/lib/auth';
import { getApolloErrorCode, getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  toFieldErrors,
} from '@/lib/auth/validation';

type MobilePlatform = 'android' | 'ios' | 'web';

type GoogleSignInModule = typeof import('@/lib/auth/googleSignIn');

function loadGoogleSignInModule({
  iosClientId,
  platform,
  webClientId,
}: {
  iosClientId?: string;
  platform: MobilePlatform;
  webClientId?: string;
}) {
  const configureMock = jest.fn();
  const nextEnv = { ...process.env };

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
    },
  }));
  jest.doMock('react-native', () => ({
    Platform: {
      OS: platform,
    },
  }));

  let googleSignInModule: GoogleSignInModule;
  jest.isolateModules(() => {
    googleSignInModule = require('@/lib/auth/googleSignIn') as GoogleSignInModule;
  });

  return {
    configureMock,
    googleSignInModule: googleSignInModule!,
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

  it('reports Google Sign-In availability and messages per platform', () => {
    const androidModule = loadGoogleSignInModule({
      platform: 'android',
      webClientId: 'android-web-client.apps.googleusercontent.com',
    }).googleSignInModule;
    expect(androidModule.isGoogleSignInConfiguredForPlatform()).toBe(true);
    expect(androidModule.getGoogleSignInUnavailableMessage()).toBe(
      'Google sign-in is not configured for this Android build.',
    );

    const iosModule = loadGoogleSignInModule({
      iosClientId: 'ios-client.apps.googleusercontent.com',
      platform: 'ios',
      webClientId: 'ios-web-client.apps.googleusercontent.com',
    }).googleSignInModule;
    expect(iosModule.isGoogleSignInConfiguredForPlatform()).toBe(true);
    expect(iosModule.getGoogleSignInUnavailableMessage()).toBe('Google sign-in is not configured for this iOS build.');

    const webModule = loadGoogleSignInModule({
      platform: 'web',
      webClientId: 'web-client.apps.googleusercontent.com',
    }).googleSignInModule;
    expect(webModule.isGoogleSignInConfiguredForPlatform()).toBe(false);
    expect(webModule.getGoogleSignInUnavailableMessage()).toBe(
      'Google sign-in is only available in native mobile builds.',
    );
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
});
