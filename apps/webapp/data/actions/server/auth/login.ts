'use server';

import { LoginUserInput } from '@/data/graphql/types/graphql';
import { LoginUserInputSchema } from '@/data/validation';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import type { ActionState } from '@/data/actions/types';
import { logger } from '@/lib/utils/logger';

const EMAIL_NOT_VERIFIED_MESSAGE = 'Please verify your email address before logging in.';

function resolveRedirectTo(formData: FormData) {
  const requestedRedirectTo = formData.get('redirectTo')?.toString().trim();

  if (!requestedRedirectTo || !requestedRedirectTo.startsWith('/') || requestedRedirectTo.startsWith('//')) {
    return DEFAULT_LOGIN_REDIRECT;
  }

  return requestedRedirectTo;
}

const getCredentialsSignInMessage = (error: AuthError): string => {
  if (error.message.includes(EMAIL_NOT_VERIFIED_MESSAGE)) {
    return EMAIL_NOT_VERIFIED_MESSAGE;
  }

  return 'Invalid credentials';
};

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
  const redirectTo = resolveRedirectTo(formData);

  try {
    logger.debug('Attempting sign in');
    await signIn('credentials', {
      email,
      password,
      redirectTo,
      redirect: true,
    });

    logger.info('User logged in successfully', { email, redirectTo });

    return {
      ...prevState,
      data: { message: 'Signed in' },
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    // NEXT_REDIRECT is not an error - it's how Next.js performs redirects in server actions
    if (
      error instanceof Error &&
      (error.message === 'NEXT_REDIRECT' || (error as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      logger.info('Login successful, redirecting user', { email, redirect: redirectTo });
      throw error;
    }

    logger.error('Login failed', { error, email: inputData.email });
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            ...prevState,
            data: null,
            apiError: getCredentialsSignInMessage(error),
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
