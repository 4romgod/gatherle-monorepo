'use server';

import {
  CreateUserInputType,
  LoginUserDocument,
  LoginUserInputType,
  RegisterUserDocument,
} from '@/data/graphql/types/graphql';
import {
  CreateUserInputTypeSchema,
  ForgotPasswordInputTypeSchema,
  LoginUserInputTypeSchema,
  ResetPasswordInputTypeSchema,
} from '../validation';
import { getClient } from '@/data/graphql/apollo-client';

export async function registerUserAction(prevState: any, formData: FormData) {
  const inputData: CreateUserInputType = {
    given_name: formData.get('given_name')?.toString() ?? '',
    family_name: formData.get('family_name')?.toString() ?? '',
    address: formData.get('address')?.toString() ?? '',
    phone_number: formData.get('phone_number')?.toString() ?? '',
    birthdate: formData.get('birthdate')?.toString() ?? '',
    email: formData.get('email')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };
  console.debug('inputData', inputData);

  const validatedFields = CreateUserInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const registerResponse = await getClient().mutate({
      mutation: RegisterUserDocument,
      variables: { input: inputData },
    });
    console.log('registerResponse', registerResponse);
  } catch (error) {
    console.error('Failed when calling Register User Mutation', error);
    const networkError = (error as any).networkError;
    if (networkError) {
      console.error('Error Message', networkError.result.errors[0].message);
      return {
        ...prevState,
        apiError: networkError.result.errors[0].message,
        zodErrors: null,
      };
    }
  }
}

// TODO Will use this instead of useMutation
export async function loginUserAction(prevState: any, formData: FormData) {
  const inputData: LoginUserInputType = {
    email: formData.get('email')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };
  console.debug('inputData', inputData);

  const validatedFields = LoginUserInputTypeSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const loginResponse = await getClient().mutate({
      mutation: LoginUserDocument,
      variables: { input: inputData },
    });
    console.log('loginResponse', loginResponse);

    return {
      ...prevState,
      data: loginResponse.data,
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    console.error('Failed when calling Login User Mutation', error);
    const networkError = (error as any).networkError;
    if (networkError) {
      console.error('Error Message', networkError.result.errors[0].message);
      return {
        ...prevState,
        apiError: networkError.result.errors[0].message,
        zodErrors: null,
      };
    }
  }
}

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const inputData = {
    email: formData.get('email')?.toString() ?? '',
  };
  console.debug('inputData', inputData);

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

export async function resetPasswordAction(prevState: any, formData: FormData) {
  const password = formData.get('password')?.toString() ?? '';
  const confirmPassword = formData.get('confirm-password')?.toString() ?? '';

  const inputData = {
    password: password,
    'confirm-password': confirmPassword,
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
