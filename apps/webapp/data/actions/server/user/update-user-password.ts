'use server';

import {
  GetUserByIdDocument,
  UpdateUserInput,
  UpdateUserDocument,
  LoginUserDocument,
} from '@/data/graphql/types/graphql';
import { UpdateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';
import type { ActionState } from '@/data/actions/types';
import { extractApolloErrorMessage } from '@/lib/utils/apollo-error';
import { getAuthHeader } from '@/lib/utils/auth';
import { logger } from '@/lib/utils/logger';

export async function updateUserPasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user?.userId;
  const token = session?.user?.token;
  const userEmail = session?.user?.email;

  logger.action('updateUserPasswordAction', { userId, hasToken: !!token });

  if (!userId || !token || !userEmail) {
    logger.warn('Password update failed: User not authenticated');
    return {
      ...prevState,
      apiError: 'User is not authenticated',
      zodErrors: null,
    };
  }

  const currentPassword = formData.get('currentPassword')?.toString();
  const newPassword = formData.get('newPassword')?.toString();
  let requiresCurrentPassword = session?.user?.hasLocalPassword !== false;

  if (userId && token) {
    try {
      const profileResponse = await getClient().query({
        query: GetUserByIdDocument,
        variables: { userId },
        context: {
          headers: getAuthHeader(token),
        },
        fetchPolicy: 'no-cache',
      });

      requiresCurrentPassword = profileResponse.data?.readUserById?.hasLocalPassword !== false;
    } catch (error) {
      logger.warn('Could not resolve current password mode from user profile. Falling back to session data.', {
        error,
        userId,
      });
    }
  }

  if ((requiresCurrentPassword && !currentPassword) || !newPassword) {
    return {
      ...prevState,
      apiError: requiresCurrentPassword ? 'Both current and new passwords are required' : 'A new password is required',
      zodErrors: null,
    };
  }

  if (requiresCurrentPassword) {
    const currentPasswordToVerify = currentPassword as string;

    // Verify current password by attempting to login
    try {
      logger.debug('Verifying current password');
      await getClient().mutate({
        mutation: LoginUserDocument,
        variables: {
          input: {
            email: userEmail,
            password: currentPasswordToVerify,
          },
        },
      });
    } catch (error) {
      logger.warn('Current password verification failed');
      return {
        ...prevState,
        apiError: 'Current password is incorrect',
        zodErrors: null,
      };
    }
  }

  let inputData: UpdateUserInput = {
    userId: userId,
    password: newPassword,
  };

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
        headers: getAuthHeader(token),
      },
    });

    const responseData = updateResponse.data?.updateUser;

    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
      success: true,
    };
  } catch (error) {
    logger.error('Failed when calling Update User Mutation', error);
    const errorMessage = extractApolloErrorMessage(error, 'An error occurred while updating your password');

    return {
      ...prevState,
      apiError: errorMessage,
      zodErrors: null,
    };
  }
}
