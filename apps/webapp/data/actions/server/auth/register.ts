'use server';

import { CreateUserInput, RegisterUserDocument, RequestEmailVerificationDocument } from '@/data/graphql/types/graphql';
import { CreateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { ApolloError } from '@apollo/client';
import type { ActionState } from '@/data/actions/types';
import { getApolloErrorMessage, getApolloErrorCode } from '@/data/actions/types';
import { logger } from '@/lib/utils/logger';

export async function registerUserAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inputData: CreateUserInput = {
    birthdate: formData.get('birthdate')?.toString() ?? '',
    email: formData.get('email')?.toString().toLowerCase() ?? '',
    family_name: formData.get('family_name')?.toString() ?? '',
    given_name: formData.get('given_name')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };

  logger.action('registerUserAction', { email: inputData.email });

  const validatedFields = CreateUserInputSchema.safeParse(inputData);
  if (!validatedFields.success) {
    logger.warn('Registration validation failed', { errors: validatedFields.error.flatten().fieldErrors });
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    logger.debug('Sending user registration mutation');
    const registerResponse = await getClient().mutate({
      mutation: RegisterUserDocument,
      variables: {
        input: inputData,
      },
    });

    logger.info('User registered successfully', { email: inputData.email });

    // Send the verification email — awaited so the call completes within the request
    // lifetime (required in serverless/edge runtimes). Failure is non-fatal: registration
    // has already succeeded and the user can request a new verification email.
    try {
      await getClient().mutate({
        mutation: RequestEmailVerificationDocument,
        variables: { email: inputData.email },
      });
    } catch (err) {
      logger.warn('Failed to send verification email after registration', { err, email: inputData.email });
    }

    const responseData = registerResponse.data?.createUser;
    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    logger.error('Registration failed', { error, email: inputData.email });
    const apolloError = error as ApolloError;

    if (getApolloErrorCode(apolloError) === 'CONFLICT') {
      return {
        ...prevState,
        apiError: 'An account with this email address already exists.',
        zodErrors: null,
      };
    }

    const errorMessage = getApolloErrorMessage(apolloError);
    return {
      ...prevState,
      apiError: errorMessage ?? 'An error occurred during registration. Please try again.',
      zodErrors: null,
    };
  }
}
