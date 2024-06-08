import { getInstanceOfApolloClient } from '@/data/graphql/apollo-client';
import { LoginUserDocument, LoginUserInputType } from '@/data/graphql/types/graphql';
import { GRAPHQL_URL } from '@/lib/constants';
import { CredentialsSignin } from 'next-auth';

const apolloClient = getInstanceOfApolloClient(GRAPHQL_URL, true);
export async function loginUserGlobalAction(input: LoginUserInputType) {
  try {
    const loginResponse = await apolloClient.mutate({
      mutation: LoginUserDocument,
      variables: { input },
    });
    const responseData = loginResponse.data?.loginUser;
    return responseData ?? null;
  } catch (error) {
    const networkError = (error as any).networkError;
    if (networkError) {
      throw new CredentialsSignin(networkError.result.errors[0].message);
    }
    throw error;
  }
}
