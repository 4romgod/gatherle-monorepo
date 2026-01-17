'use server';

import { z } from 'zod';
import { UpdateUserInput, UpdateUserDocument, Gender } from '@/data/graphql/types/graphql';
import { UpdateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';
import { ApolloError } from '@apollo/client';
import { getApolloErrorMessage } from '@/data/actions/types';
import { logger } from '@/lib/utils';
import type { ActionState } from '@/data/actions/types';

// Zod schemas for validating JSON-parsed fields (matches UserLocationInput GraphQL type)
const CoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
}).optional();

const LocationSchema = z.object({
  city: z.string(),
  state: z.string().optional(),
  country: z.string(),
  coordinates: CoordinatesSchema,
}).optional();

const InterestsSchema = z.array(z.string()).optional();

/**
 * Safely parse JSON with Zod validation.
 * Logs errors for debugging while returning undefined for graceful degradation.
 */
function safeJsonParse<T>(jsonStr: string | undefined, schema: z.ZodType<T>, fieldName: string): T | undefined {
  if (!jsonStr) return undefined;
  try {
    const parsed = JSON.parse(jsonStr);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      logger.warn(`Invalid ${fieldName} data submitted`, {
        field: fieldName,
        errors: result.error.flatten(),
        input: jsonStr.substring(0, 200), // Truncate to avoid logging huge payloads
      });
      return undefined;
    }
    return result.data;
  } catch (error) {
    logger.warn(`Failed to parse ${fieldName} JSON`, {
      field: fieldName,
      error: error instanceof Error ? error.message : 'Unknown error',
      input: jsonStr.substring(0, 200),
    });
    return undefined;
  }
}

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

  const locationStr = formData.get('location')?.toString();
  const genderStr = formData.get('gender')?.toString();
  const gender = Object.values(Gender).includes(genderStr as Gender) ? (genderStr as Gender) : undefined;
  const interestsStr = formData.get('interests')?.toString();
  
  // Safely parse JSON fields with validation
  const location = safeJsonParse(locationStr, LocationSchema, 'location');
  const interests = safeJsonParse(interestsStr, InterestsSchema, 'interests');

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
    location: location,
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
