'use server';

import { UpdateUserInput, UpdateUserDocument, Gender } from '@/data/graphql/types/graphql';
import { UpdateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';
import { ApolloError } from '@apollo/client';
import { getApolloErrorMessage } from '@/data/actions/types';
import { logger } from '@/lib/utils';
import type { ActionState } from '@/data/actions/types';

export async function updateUserProfileAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user.userId;
  const token = session?.user.token;

  logger.debug('🔐 Update Profile Action - Session check:', {
    hasSession: !!session,
    userId: userId,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
  });

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
  const interestsStr = formData.get('interests')?.toString();
  const interests = interestsStr ? JSON.parse(interestsStr) : undefined;

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
    interests: interests,
  };

  inputData = Object.fromEntries(Object.entries(inputData).filter(([_, v]) => v !== undefined)) as UpdateUserInput;

  logger.debug('Validating input data', { fields: Object.keys(inputData) });
  const validatedFields = UpdateUserInputSchema.safeParse(inputData);
  if (!validatedFields.success) {
    logger.warn('Validation failed', { errors: validatedFields.error.flatten().fieldErrors });
    return {
      ...prevState,
      apiError: null,
      zodErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    logger.debug('Sending UpdateUser mutation');
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

    logger.info('User profile updated successfully', { userId });

    const responseData = updateResponse.data?.updateUser;
    return {
      ...prevState,
      data: responseData,
      apiError: null,
      zodErrors: null,
    };
  } catch (error) {
    logger.error('Failed to update user profile', { error, userId });
    const errorMessage = getApolloErrorMessage(error as ApolloError);

    if (errorMessage) {
      logger.error('GraphQL error message', { errorMessage });
      return {
        ...prevState,
        apiError: errorMessage,
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
