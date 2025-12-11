'use server';

import { UpdateUserInput, UpdateUserDocument, Gender } from '@/data/graphql/types/graphql';
import { UpdateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';

export async function updateUserProfileAction(prevState: any, formData: FormData) {
  const session = await auth();
  const userId = session?.user.userId;
  const token = session?.user.token;

  if (!userId || !token) {
    return {
      ...prevState,
      apiError: 'User is not authenticated',
      zodErrors: null,
    };
  }

  const address = formData.get('address')?.toString();
  const genderStr = formData.get('gender')?.toString();
  const gender = Object.values(Gender).includes(genderStr as Gender) ? (genderStr as Gender) : undefined;

  let inputData: UpdateUserInput = {
    userId: userId,
    given_name: formData.get('given_name')?.toString() || undefined,
    family_name: formData.get('family_name')?.toString() || undefined,
    email: formData.get('email')?.toString() || undefined,
    username: formData.get('username')?.toString() || undefined,
    bio: formData.get('bio')?.toString() || undefined,
    phone_number: formData.get('phone_number')?.toString() || undefined,
    profile_picture: formData.get('profile_picture')?.toString() || undefined,
    birthdate: formData.get('birthdate')?.toString() || undefined,
    gender: gender,
    address: address ? JSON.parse(address) : undefined, // TODO validate before you parse
  };

  inputData = Object.fromEntries(Object.entries(inputData).filter(([_, v]) => v !== undefined)) as UpdateUserInput;

  console.log('input data', inputData);
  const validatedFields = UpdateUserInputSchema.safeParse(inputData);
  if (!validatedFields.success) {
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const updateResponse = await getClient().mutate({
      mutation: UpdateUserDocument,
      variables: {
        input: inputData,
      },
      context: {
        headers: {
          token: token,
        },
      },
    });

    // TODO after updating, also make sure the user session gets updated!
    const responseData = updateResponse.data?.updateUser;
    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    console.error('Failed when calling Update User Mutation', error);
    const networkError = (error as any).networkError;
    if (networkError) {
      console.error('Error Message', networkError.result.errors[0].message);
      return {
        ...prevState,
        apiError: networkError.result.errors[0].message,
        zodErrors: null,
      };
    }

    return {
      ...prevState,
      apiError: 'An error occurred while updating your profile',
      zodErrors: null,
    };
  }
}
