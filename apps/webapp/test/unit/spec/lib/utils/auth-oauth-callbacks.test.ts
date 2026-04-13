type CapturedConfig = {
  callbacks: {
    jwt: (...args: any[]) => Promise<any>;
    session: (...args: any[]) => Promise<any>;
  };
};

let capturedConfig: CapturedConfig | undefined;

jest.mock('next-auth', () => ({
  __esModule: true,
  default: (config: CapturedConfig) => {
    capturedConfig = config;
    return {
      auth: jest.fn(),
      handlers: {},
      signIn: jest.fn(),
      signOut: jest.fn(),
    };
  },
}));

jest.mock('@/auth.config', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/data/actions/global/auth/oauth', () => ({
  exchangeOAuthIdentity: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  isAuthenticated: jest.fn(),
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import '@/auth';
import { exchangeOAuthIdentity } from '@/data/actions/global/auth/oauth';
import { isAuthenticated } from '@/lib/utils';

describe('auth OAuth callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exchanges an OAuth identity during the jwt callback', async () => {
    const loginResponse = {
      __typename: 'UserWithToken',
      userId: 'user-1',
      email: 'user@example.com',
      username: 'oauth-user',
      token: 'jwt-token',
    };
    (exchangeOAuthIdentity as jest.Mock).mockResolvedValue(loginResponse);

    const result = await capturedConfig!.callbacks.jwt({
      token: {},
      user: { name: 'OAuth User', email: 'user@example.com', image: 'https://example.com/avatar.png' },
      account: { provider: 'google', id_token: 'google-id-token' },
      profile: {
        email: 'user@example.com',
        given_name: 'OAuth',
        family_name: 'User',
        picture: 'https://example.com/avatar.png',
      },
    });

    expect(exchangeOAuthIdentity).toHaveBeenCalledWith({
      provider: 'google',
      idToken: 'google-id-token',
      email: 'user@example.com',
      given_name: 'OAuth',
      family_name: 'User',
      profile_picture: 'https://example.com/avatar.png',
    });
    expect(result).toEqual({
      userId: 'user-1',
      email: 'user@example.com',
      username: 'oauth-user',
      token: 'jwt-token',
    });
  });

  it('invalidates the jwt token when downstream token validation fails', async () => {
    (isAuthenticated as jest.Mock).mockResolvedValue(false);

    const result = await capturedConfig!.callbacks.jwt({
      token: { token: 'expired-token' },
    });

    expect(isAuthenticated).toHaveBeenCalledWith('expired-token');
    expect(result).toBeNull();
  });

  it('hydrates the session user from the jwt token', async () => {
    const result = await capturedConfig!.callbacks.session({
      token: { userId: 'user-1', token: 'jwt-token', username: 'oauth-user' },
      session: { user: { name: 'Old Name' } },
    });

    expect(result.user).toEqual({
      userId: 'user-1',
      token: 'jwt-token',
      username: 'oauth-user',
      name: 'Old Name',
    });
  });
});
