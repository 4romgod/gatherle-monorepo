import { getClient } from '@/data/graphql/apollo-client';
import { LoginUserDocument, LoginUserInput } from '@/data/graphql/types/graphql';
import { CredentialsSignin } from 'next-auth';

export async function loginUserGlobalAction(input: LoginUserInput) {
  try {
    const loginResponse = await getClient().mutate({
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
