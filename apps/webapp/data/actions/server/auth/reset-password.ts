'use server';

import { ResetPasswordInputTypeSchema } from '@/data/validation';
import type { ActionState } from '@/data/actions/types';
import { getApolloErrorCode, getApolloErrorMessage } from '@/data/actions/types';
import { getClient } from '@/data/graphql';
import { ResetPasswordDocument } from '@/data/graphql/types/graphql';
import { ApolloError } from '@apollo/client';
import { logger } from '@/lib/utils/logger';

export async function resetPasswordAction(
  token: string,
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const inputData = {
    password: formData.get('password')?.toString() ?? '',
    'confirm-password': formData.get('confirm-password')?.toString() ?? '',
  };

  logger.action('resetPasswordAction');

  const validatedFields = ResetPasswordInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    logger.warn('Reset password validation failed', { errors: validatedFields.error.flatten().fieldErrors });
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  if (!token) {
    return { ...prevState, apiError: 'Reset token is missing. Please request a new link.', zodErrors: null };
  }

  try {
    await getClient().mutate({
      mutation: ResetPasswordDocument,
      variables: { token, newPassword: inputData.password },
    });

    logger.info('Password reset successfully');
    return { ...prevState, data: { reset: true }, apiError: null, zodErrors: null };
  } catch (error) {
    logger.error('Password reset failed', { error });
    const code = getApolloErrorCode(error as ApolloError);
    if (code === 'BAD_USER_INPUT') {
      return {
        ...prevState,
        apiError: 'This reset link is invalid or has expired. Please request a new one.',
        zodErrors: null,
      };
    }
    const errorMessage = getApolloErrorMessage(error as ApolloError);
    return {
      ...prevState,
      apiError: errorMessage ?? 'Failed to reset password. Please try again.',
      zodErrors: null,
    };
  }
}
