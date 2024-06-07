'use server';

import { ForgotPasswordInputTypeSchema } from '@/data/validation';

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const inputData = {
    email: formData.get('email')?.toString().toLowerCase() ?? '',
  };

  const validatedFields = ForgotPasswordInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // TODO Call the API
}
