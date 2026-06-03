import { OAuthProvider } from '@gatherle/commons/types';

const mockCreateRemoteJWKSet = jest.fn();
const mockJwtVerify = jest.fn();
const mockWarn = jest.fn();

jest.mock('jose', () => ({
  createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

jest.mock('@/constants', () => {
  const actual = jest.requireActual('@/constants');
  return {
    ...actual,
    APPLE_OAUTH_CLIENT_ID_IOS: 'com.gatherle.mobile',
    APPLE_OAUTH_CLIENT_IDS: ['com.gatherle.web', 'com.gatherle.mobile'],
    APPLE_OAUTH_CLIENT_ID_WEB: 'com.gatherle.web',
    GOOGLE_OAUTH_CLIENT_ID_WEB: 'google-web-client-id',
    GOOGLE_OAUTH_CLIENT_ID_ANDROID: 'google-android-client-id',
    GOOGLE_OAUTH_CLIENT_ID_IOS: 'google-ios-client-id',
    GOOGLE_CLIENT_IDS: ['google-web-client-id', 'google-android-client-id', 'google-ios-client-id'],
  };
});

jest.mock('@/utils/logger', () => ({
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },
  LOG_LEVEL_MAP: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  initLogger: jest.fn(),
  logger: {
    warn: (...args: unknown[]) => mockWarn(...args),
  },
}));

const loadExternalAuth = async () => import('@/utils/externalAuth');

describe('externalAuth utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockCreateRemoteJWKSet.mockImplementation((url: URL) => `jwks:${url.toString()}`);
  });

  it('reuses the provider JWKS loader across repeated Google verifications', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'google-user-1',
        email: 'user@example.com',
        email_verified: 'true',
        given_name: 'OAuth',
        family_name: 'User',
        picture: 'https://example.com/avatar.png',
      },
    });

    const { verifyExternalIdentityToken } = await loadExternalAuth();
    const input = {
      provider: OAuthProvider.Google,
      idToken: 'google-id-token',
    };

    const firstResult = await verifyExternalIdentityToken(input);
    const secondResult = await verifyExternalIdentityToken(input);

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1);
    expect(mockJwtVerify).toHaveBeenCalledTimes(2);
    expect(mockJwtVerify).toHaveBeenNthCalledWith(
      1,
      'google-id-token',
      'jwks:https://www.googleapis.com/oauth2/v3/certs',
      {
        audience: ['google-web-client-id', 'google-android-client-id', 'google-ios-client-id'],
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
      },
    );
    expect(firstResult).toEqual(secondResult);
    expect(firstResult).toEqual({
      provider: OAuthProvider.Google,
      providerUserId: 'google-user-1',
      email: 'user@example.com',
      emailVerified: true,
      givenName: 'OAuth',
      familyName: 'User',
      profilePicture: 'https://example.com/avatar.png',
    });
  });

  it('accepts Apple identity tokens for both the web service ID and the native iOS bundle ID audiences', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'apple-user-1',
        email: 'apple-user@example.com',
        email_verified: true,
      },
    });

    const { verifyExternalIdentityToken } = await loadExternalAuth();
    const result = await verifyExternalIdentityToken({
      provider: OAuthProvider.Apple,
      idToken: 'apple-id-token',
      given_name: 'Apple',
      family_name: 'User',
    });

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1);
    expect(mockJwtVerify).toHaveBeenCalledWith('apple-id-token', 'jwks:https://appleid.apple.com/auth/keys', {
      audience: ['com.gatherle.web', 'com.gatherle.mobile'],
      issuer: 'https://appleid.apple.com',
    });
    expect(result).toEqual({
      provider: OAuthProvider.Apple,
      providerUserId: 'apple-user-1',
      email: 'apple-user@example.com',
      emailVerified: true,
      givenName: 'Apple',
      familyName: 'User',
      profilePicture: undefined,
    });
  });

  it('wraps jose verification failures in an unauthenticated error without logging token contents', async () => {
    mockJwtVerify.mockRejectedValue(new Error('signature verification failed'));

    const { verifyExternalIdentityToken } = await loadExternalAuth();

    await expect(
      verifyExternalIdentityToken({
        provider: OAuthProvider.Google,
        idToken: 'sensitive-token-value',
      }),
    ).rejects.toThrow('Google identity token is invalid.');

    expect(mockWarn).toHaveBeenCalledWith('External identity token verification failed', {
      provider: OAuthProvider.Google,
      errorName: 'Error',
      errorMessage: 'signature verification failed',
    });
    expect(JSON.stringify(mockWarn.mock.calls)).not.toContain('sensitive-token-value');
  });
});
