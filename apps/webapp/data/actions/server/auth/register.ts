'use server';

import { CreateUserInputType, RegisterUserDocument } from '@/data/graphql/types/graphql';
import { CreateUserInputTypeSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';

export async function registerUserAction(prevState: any, formData: FormData) {
  const inputData: CreateUserInputType = {
    birthdate: formData.get('birthdate')?.toString() ?? '',
    email: formData.get('email')?.toString().toLowerCase() ?? '',
    family_name: formData.get('family_name')?.toString() ?? '',
    given_name: formData.get('given_name')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
  };

  console.log(inputData);

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
      variables: {
        input: inputData,
      },
    });

    const responseData = registerResponse.data?.createUser;
    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
    };
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
