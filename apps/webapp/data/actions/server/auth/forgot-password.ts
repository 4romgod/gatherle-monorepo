'use server';

import { ForgotPasswordInputTypeSchema } from '@/data/validation';
import type { ActionState } from '@/data/actions/types';

export async function forgotPasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inputData = {
    email: formData.get('email')?.toString().toLowerCase() ?? '',
  };

  const validatedFields = ForgotPasswordInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...(prevState ?? {}),
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // TODO Call the API
  return {
    ...(prevState ?? {}),
    apiError: 'Forgot password not yet implemented',
    zodErrors: null,
  };
}
