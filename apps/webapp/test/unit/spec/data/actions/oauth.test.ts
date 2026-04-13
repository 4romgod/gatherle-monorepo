jest.mock('@/data/graphql/apollo-client', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/data/actions/types', () => ({
  getApolloErrorMessage: jest.fn(),
}));

import { getClient } from '@/data/graphql/apollo-client';
import { getApolloErrorMessage } from '@/data/actions/types';
import { exchangeOAuthIdentity } from '@/data/actions/global/auth/oauth';
import { AuthProvider } from '@/data/graphql/types/graphql';

const mockMutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ mutate: mockMutate });
});

describe('exchangeOAuthIdentity', () => {
  it('maps provider values and returns the login payload', async () => {
    const loginWithOAuth = {
      userId: 'user-1',
      email: 'user@example.com',
      username: 'oauth-user',
      token: 'jwt-token',
    };

    mockMutate.mockResolvedValue({ data: { loginWithOAuth } });

    const result = await exchangeOAuthIdentity({
      provider: 'google',
      idToken: 'google-id-token',
      email: 'user@example.com',
      given_name: 'Test',
      family_name: 'User',
      profile_picture: 'https://example.com/avatar.png',
    });

    expect(mockMutate).toHaveBeenCalledWith({
      mutation: expect.anything(),
      variables: {
        input: {
          provider: AuthProvider.Google,
          idToken: 'google-id-token',
          email: 'user@example.com',
          given_name: 'Test',
          family_name: 'User',
          profile_picture: 'https://example.com/avatar.png',
        },
      },
    });
    expect(result).toEqual(loginWithOAuth);
  });

  it('omits nullable fallback fields when they are empty', async () => {
    mockMutate.mockResolvedValue({
      data: { loginWithOAuth: { userId: 'user-1', email: 'user@example.com', username: 'oauth-user', token: 'jwt' } },
    });

    await exchangeOAuthIdentity({
      provider: 'apple',
      idToken: 'apple-id-token',
      email: null,
      given_name: null,
      family_name: null,
      profile_picture: null,
    });

    expect(mockMutate).toHaveBeenCalledWith({
      mutation: expect.anything(),
      variables: {
        input: {
          provider: AuthProvider.Apple,
          idToken: 'apple-id-token',
        },
      },
    });
  });

  it('throws a translated Apollo error message when available', async () => {
    const apolloError = new Error('GraphQL failure');
    mockMutate.mockRejectedValue(apolloError);
    (getApolloErrorMessage as jest.Mock).mockReturnValue('OAuth exchange failed upstream.');

    await expect(
      exchangeOAuthIdentity({
        provider: 'google',
        idToken: 'bad-token',
      }),
    ).rejects.toThrow('OAuth exchange failed upstream.');
  });

  it('throws a fallback error when the mutation returns no login payload', async () => {
    mockMutate.mockResolvedValue({ data: { loginWithOAuth: null } });
    (getApolloErrorMessage as jest.Mock).mockReturnValue(undefined);

    await expect(
      exchangeOAuthIdentity({
        provider: 'google',
        idToken: 'google-id-token',
      }),
    ).rejects.toThrow('OAuth exchange failed.');
  });
});
