'use server';

import { getClient } from '@/data/graphql';
import { RequestEmailVerificationDocument, VerifyEmailDocument } from '@/data/graphql/types/graphql';
import type { ActionState } from '@/data/actions/types';
import { getApolloErrorMessage } from '@/data/actions/types';
import { ForgotPasswordInputTypeSchema } from '@/data/validation';
import { ApolloError } from '@apollo/client';
import { logger } from '@/lib/utils/logger';

export async function requestEmailVerificationAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inputData = { email: formData.get('email')?.toString().toLowerCase() ?? '' };

  logger.action('requestEmailVerificationAction', { email: inputData.email });

  const validatedFields = ForgotPasswordInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return { ...prevState, apiError: null, zodErrors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await getClient().mutate({
      mutation: RequestEmailVerificationDocument,
      variables: { email: validatedFields.data.email },
    });

    logger.info('Verification email sent', { email: validatedFields.data.email });
    return { ...prevState, data: { sent: true }, apiError: null, zodErrors: null };
  } catch (error) {
    logger.error('Failed to send verification email', { error, email: validatedFields.data.email });
    const errorMessage = getApolloErrorMessage(error as ApolloError);
    return {
      ...prevState,
      apiError: errorMessage ?? 'Failed to send verification email. Please try again.',
      zodErrors: null,
    };
  }
}

export async function verifyEmailAction(token: string): Promise<{ success: boolean; error?: string }> {
  logger.action('verifyEmailAction');

  if (!token) {
    return { success: false, error: 'Verification token is missing.' };
  }

  try {
    await getClient().mutate({
      mutation: VerifyEmailDocument,
      variables: { token },
    });

    logger.info('Email verified successfully');
    return { success: true };
  } catch (error) {
    logger.error('Email verification failed', { error });
    return {
      success: false,
      error: 'This verification link is invalid or has expired. Please request a new one.',
    };
  }
}
