'use server';

import { LoginUserDocument, LoginUserInputType } from '@/data/graphql/types/graphql';
import { LoginUserInputTypeSchema } from '@/data/validation';
import { getClient } from '@/data/graphql/apollo-client';
import { authenticateServerSide } from '@/lib/utils';

export async function loginUserAction(prevState: any, formData: FormData) {
  const inputData: LoginUserInputType = {
    email: formData.get('email')?.toString().toLowerCase() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };

  const validatedFields = LoginUserInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const loginResponse = await getClient().mutate({
      mutation: LoginUserDocument,
      variables: {
        input: inputData,
      },
    });

    const responseData = loginResponse.data?.loginUser;
    if (responseData) {
      authenticateServerSide(responseData);
    }

    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    console.error('Failed when calling Login User Mutation', error);
    const networkError = (error as any).networkError;
    if (networkError) {
      console.error('Error Message', networkError.result.errors[0].message);
      return {
        ...prevState,
        apiError: networkError.result.errors[0].message,
        zodErrors: null,
      };
    }
  }
}
