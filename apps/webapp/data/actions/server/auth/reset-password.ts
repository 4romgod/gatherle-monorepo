'use server';

import { ResetPasswordInputTypeSchema } from '@/data/validation';
import type { ActionState } from '@/data/actions/types';
import { logger } from '@/lib/utils/logger';

export async function resetPasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
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

  // TODO Call the API
  logger.warn('Reset password not implemented yet');
  return {
    ...prevState,
    apiError: 'Feature coming soon',
    zodErrors: null,
  };
}
