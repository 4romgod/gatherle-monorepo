'use server';

import { DeleteUserByIdDocument, getClient } from '@/data/graphql';
import { auth } from '@/auth';
import type { ActionState } from '@/data/actions/types';
import { extractApolloErrorMessage } from '@/lib/utils/apollo-error';
import { getAuthHeader } from '@/lib/utils/auth';
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
        headers: getAuthHeader(token),
      },
    });

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
    const errorMessage = extractApolloErrorMessage(error, 'An error occurred while deleting your profile');

    return {
      ...prevState,
      apiError: errorMessage,
      zodErrors: null,
    };
  }
}
