'use server';

import { ResetPasswordInputTypeSchema } from '@/data/validation';

export async function resetPasswordAction(prevState: any, formData: FormData) {
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
}
