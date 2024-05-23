'use server';

import { CreateUserInputType, RegisterUserDocument } from '@/data/graphql/types/graphql';
import { CreateUserInputTypeSchema } from '../validation';
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

  const validatedFields = CreateUserInputTypeSchema.safeParse(inputData);

  if (!validatedFields.success) {
    return {
      ...prevState,
      zodErrors: validatedFields.error.flatten().fieldErrors,
      strapiErrors: null,
      message: 'Missing Fields. Failed to Register.',
    };
  }

  try {
    const registerResponse = await getClient().mutate({
      mutation: RegisterUserDocument,
      variables: { input: inputData },
    });
    console.log('registerResponse', registerResponse);
  } catch (error) {
    console.log('Caught Error', error);
    const networkError = (error as any).networkError;
    if (networkError) {
      console.log('Error Message', networkError.result.errors[0].message);
    }
  }
}
