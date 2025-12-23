'use server';

import { CreateUserInput, RegisterUserDocument } from '@/data/graphql/types/graphql';
import { CreateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { ApolloError } from '@apollo/client';
import type { ActionState } from '@/data/actions/types';
import { getApolloErrorMessage } from '@/data/actions/types';

export async function registerUserAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inputData: CreateUserInput = {
    birthdate: formData.get('birthdate')?.toString() ?? '',
    email: formData.get('email')?.toString().toLowerCase() ?? '',
    family_name: formData.get('family_name')?.toString() ?? '',
    given_name: formData.get('given_name')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };

  console.log(inputData);

  const validatedFields = CreateUserInputSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...(prevState ?? {}),
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const registerResponse = await getClient().mutate({
      mutation: RegisterUserDocument,
      variables: {
        input: inputData,
      },
    });

    const responseData = registerResponse.data?.createUser;
    return {
      ...(prevState ?? {}),
      data: responseData,
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    console.error('Failed when calling Register User Mutation', error);
    const errorMessage = getApolloErrorMessage(error as ApolloError);
    
    if (errorMessage) {
      console.error('Error Message', errorMessage);
      return {
        ...(prevState ?? {}),
        apiError: errorMessage,
        zodErrors: null,
      };
    }
    return {
      ...(prevState ?? {}),
      apiError: 'An error occurred during registration',
      zodErrors: null,
    };
  }
}
