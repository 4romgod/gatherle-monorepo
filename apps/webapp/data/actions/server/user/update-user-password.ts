'use server';

import { UpdateUserInput, UpdateUserDocument } from '@/data/graphql/types/graphql';
import { UpdateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';
import { ApolloError } from '@apollo/client';
import type { ActionState } from '@/data/actions/types';
import { getApolloErrorMessage } from '@/data/actions/types';
import { logger } from '@/lib/utils/logger';

export async function updateUserPasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user.userId;
  const token = session?.user.token;

  logger.action('updateUserPasswordAction', { userId, hasToken: !!token });

  if (!userId || !token) {
    logger.warn('Password update failed: User not authenticated');
    return {
      ...prevState,
      apiError: 'User is not authenticated',
      zodErrors: null,
    };
  }

  const currentPassword = formData.get('currentPassword')?.toString();
  const newPassword = formData.get('newPassword')?.toString();

  if (!currentPassword || !newPassword) {
    return {
      ...prevState,
      apiError: 'Both current and new passwords are required',
      zodErrors: null,
    };
  }

  // TODO: Verify current password before updating
  // You might need a separate GraphQL query/mutation to verify the current password
  let inputData: UpdateUserInput = {
    userId: userId,
    password: newPassword,
  };

  console.log('input data', inputData);

  logger.debug('Validating password update input');
  const validatedFields = UpdateUserInputSchema.safeParse(inputData);
  if (!validatedFields.success) {
    logger.warn('Password validation failed', { errors: validatedFields.error.flatten().fieldErrors });
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    logger.debug('Sending password update mutation');
    const updateResponse = await getClient().mutate({
      mutation: UpdateUserDocument,
      variables: {
        input: inputData,
      },
      context: {
        headers: {
          token: token,
        },
      },
    });

    // TODO: Update user session after password change
    const responseData = updateResponse.data?.updateUser;

    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
      success: true, // Add success flag
    };
  } catch (error) {
    console.error('Failed when calling Update User Mutation', error);
    const errorMessage = getApolloErrorMessage(error as ApolloError);

    if (errorMessage) {
      console.error('Error Message', errorMessage);
      return {
        ...prevState,
        apiError: errorMessage,
        zodErrors: null,
      };
    }

    return {
      ...prevState,
      apiError: 'An error occurred while updating your password',
      zodErrors: null,
    };
  }
}
