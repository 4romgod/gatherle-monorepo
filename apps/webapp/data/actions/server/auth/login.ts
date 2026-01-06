'use server';

import { LoginUserInput } from '@/data/graphql/types/graphql';
import { LoginUserInputSchema } from '@/data/validation';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import type { ActionState } from '@/data/actions/types';
import { logger } from '@/lib/utils/logger';

export async function loginUserAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const inputData: LoginUserInput = {
    email: formData.get('email')?.toString().toLowerCase() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };

  logger.action('loginUserAction', { email: inputData.email });

  const validatedFields = LoginUserInputSchema.safeParse(inputData);
  if (!validatedFields.success) {
    logger.warn('Login validation failed', { errors: validatedFields.error.flatten().fieldErrors });
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  try {
    logger.debug('Attempting sign in');
    const user = await signIn('credentials', {
      email,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    });

    logger.info('User logged in successfully', { email });

    return {
      ...prevState,
      data: { message: 'Signed in' },
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    logger.error('Login failed', { error, email: inputData.email });
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
