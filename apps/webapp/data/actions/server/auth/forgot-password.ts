'use server';

import { ForgotPasswordInputTypeSchema } from '@/data/validation';
import type { ActionState } from '@/data/actions/types';
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

  // TODO Call the API
  logger.warn('Forgot password not implemented yet', { email: inputData.email });
  return {
    ...prevState,
    apiError: 'Feature coming soon',
    zodErrors: null,
  };
}
