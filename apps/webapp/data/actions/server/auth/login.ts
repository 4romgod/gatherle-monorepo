'use server';

import { LoginUserInputType } from '@/data/graphql/types/graphql';
import { LoginUserInputTypeSchema } from '@/data/validation';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';

export async function loginUserAction(prevState: any, formData: FormData) {
  const inputData: LoginUserInputType = {
    email: formData.get('email')?.toString().toLowerCase() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };

  const validatedFields = LoginUserInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await signIn('credentials', {
      email,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    });
    console.log('signIn user', user);

    return {
      ...prevState,
      data: { message: 'Signed in' },
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            ...prevState,
            data: null,
            apiError: 'Invalid credentials',
            zodErrors: null,
          };
        case 'CallbackRouteError':
          return {
            ...prevState,
            data: null,
            apiError: error.cause?.err?.message ?? 'Something went wrong',
            zodErrors: null,
          };
        default:
          return {
            ...prevState,
            data: null,
            apiError: 'Something went wrong',
            zodErrors: null,
          };
      }
    }
    throw error;
  }
}
