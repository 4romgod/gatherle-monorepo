'use server';

import { ForgotPasswordInputTypeSchema } from '@/data/validation';
import type { ActionState } from '@/data/actions/types';
import { getApolloErrorMessage } from '@/data/actions/types';
import { getClient } from '@/data/graphql';
import { ForgotPasswordDocument } from '@/data/graphql/types/graphql';
import { ApolloError } from '@apollo/client';
import { logger } from '@/lib/utils';

export async function forgotPasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inputData = {
    email: formData.get('email')?.toString().toLowerCase() ?? '',
  };

  logger.action('forgotPasswordAction', { email: inputData.email });

  const validatedFields = ForgotPasswordInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    logger.warn('Forgot password validation failed', { errors: validatedFields.error.flatten().fieldErrors });
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await getClient().mutate({
      mutation: ForgotPasswordDocument,
      variables: { email: inputData.email },
    });

    logger.info('Password reset email sent', { email: inputData.email });
    return { ...prevState, data: { sent: true }, apiError: null, zodErrors: null };
  } catch (error) {
    logger.error('Forgot password request failed', { error, email: inputData.email });
    const errorMessage = getApolloErrorMessage(error as ApolloError);
    return {
      ...prevState,
      apiError: errorMessage ?? 'Failed to send reset email. Please try again.',
      zodErrors: null,
    };
  }
}
