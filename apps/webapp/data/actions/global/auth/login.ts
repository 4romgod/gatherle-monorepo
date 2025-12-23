import { getClient } from '@/data/graphql/apollo-client';
import { LoginUserDocument, LoginUserInput } from '@/data/graphql/types/graphql';
import { CredentialsSignin } from 'next-auth';
import { ApolloError } from '@apollo/client';
import { getApolloErrorMessage } from '@/data/actions/types';

export async function loginUserGlobalAction(input: LoginUserInput) {
  try {
    const loginResponse = await getClient().mutate({
      mutation: LoginUserDocument,
      variables: { input },
    });
    const responseData = loginResponse.data?.loginUser;
    return responseData ?? null;
  } catch (error) {
    const errorMessage = getApolloErrorMessage(error as ApolloError);
    if (errorMessage) {
      throw new CredentialsSignin(errorMessage);
    }
    throw error;
  }
}
