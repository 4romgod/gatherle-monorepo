import { getClient } from '@/data/graphql/apollo-client';
import { LoginWithOAuthDocument } from '@/data/graphql/query/User/mutation';
import { OAuthProvider, type LoginWithOAuthMutation } from '@/data/graphql/types/graphql';
import { ApolloError } from '@apollo/client';
import { getApolloErrorMessage } from '@/data/actions/types';

export type OAuthProviderId = 'google' | 'apple';

export type ExchangeOAuthIdentityInput = {
  provider: OAuthProviderId;
  idToken: string;
  email?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  profile_picture?: string | null;
};

type LoginWithOAuthUser = LoginWithOAuthMutation['loginWithOAuth'];

const providerValueMap: Record<OAuthProviderId, OAuthProvider> = {
  google: OAuthProvider.Google,
  apple: OAuthProvider.Apple,
};

export async function exchangeOAuthIdentity(input: ExchangeOAuthIdentityInput): Promise<LoginWithOAuthUser> {
  try {
    const loginResponse = await getClient().mutate({
      mutation: LoginWithOAuthDocument,
      variables: {
        input: {
          provider: providerValueMap[input.provider],
          idToken: input.idToken,
          ...(input.email ? { email: input.email } : {}),
          ...(input.given_name ? { given_name: input.given_name } : {}),
          ...(input.family_name ? { family_name: input.family_name } : {}),
          ...(input.profile_picture ? { profile_picture: input.profile_picture } : {}),
        },
      },
    });

    const responseData = loginResponse.data?.loginWithOAuth;
    if (!responseData) {
      throw new Error('OAuth exchange failed.');
    }

    return responseData;
  } catch (error) {
    const errorMessage = getApolloErrorMessage(error as ApolloError);
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    throw error;
  }
}
