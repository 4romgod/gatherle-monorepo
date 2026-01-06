'use server';

import { DeleteUserByIdDocument, getClient } from '@/data/graphql';
import { auth } from '@/auth';
import { ApolloError } from '@apollo/client';
import type { ActionState } from '@/data/actions/types';
import { getApolloErrorMessage } from '@/data/actions/types';
import { logger } from '@/lib/utils';

export async function deleteUserProfileAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user.userId;
  const token = session?.user.token;

  logger.action('deleteUserProfileAction', { userId, hasToken: !!token });

  if (!userId || !token) {
    logger.warn('Delete profile failed: User not authenticated');
    return {
      ...prevState,
      apiError: 'User is not authenticated',
      zodErrors: null,
    };
  }

  try {
    const deleteResponse = await getClient().mutate({
      mutation: DeleteUserByIdDocument,
      variables: {
        userId: userId,
      },
      context: {
        headers: {
          token: token,
        },
      },
    });

    // TODO after deleting, logout the user
    logger.info('User profile deleted successfully', { userId });
    const responseData = deleteResponse.data?.deleteUserById;
    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    logger.error('Failed to delete user profile', { error, userId });
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
      apiError: 'An error occurred while deleting your profile',
      zodErrors: null,
    };
  }
}
