'use server';

import { ResetPasswordInputTypeSchema } from '@/data/validation';
import type { ActionState } from '@/data/actions/types';

export async function resetPasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inputData = {
    password: formData.get('password')?.toString() ?? '',
    'confirm-password': formData.get('confirm-password')?.toString() ?? '',
  };

  const validatedFields = ResetPasswordInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // TODO Call the API
  return {
    ...prevState,
    apiError: 'Feature coming soon',
    zodErrors: null,
  };
}
