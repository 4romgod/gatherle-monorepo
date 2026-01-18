'use server';

import { z } from 'zod';
import { UpdateUserInput, UpdateUserDocument, Gender, FollowPolicy, SocialVisibility } from '@/data/graphql/types/graphql';
import { UpdateUserInputSchema } from '@/data/validation';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';
import { extractApolloErrorMessage } from '@/lib/utils/apollo-error';
import { safeJsonParse } from '@/lib/utils/json-parse';
import { logger } from '@/lib/utils/logger';
import { getAuthHeader } from '@/lib/utils/auth';
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

// Preferences schema - matches the structure used in EventSettingsPage
const CommunicationPrefsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
}).optional();

const PreferencesSchema = z.object({
  communicationPrefs: CommunicationPrefsSchema,
}).optional();

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

  // Parse privacy fields
  const followPolicyStr = formData.get('followPolicy')?.toString();
  const followPolicy = Object.values(FollowPolicy).includes(followPolicyStr as FollowPolicy) 
    ? (followPolicyStr as FollowPolicy) 
    : undefined;
  
  const followersListVisibilityStr = formData.get('followersListVisibility')?.toString();
  const followersListVisibility = Object.values(SocialVisibility).includes(followersListVisibilityStr as SocialVisibility) 
    ? (followersListVisibilityStr as SocialVisibility) 
    : undefined;
  
  const followingListVisibilityStr = formData.get('followingListVisibility')?.toString();
  const followingListVisibility = Object.values(SocialVisibility).includes(followingListVisibilityStr as SocialVisibility) 
    ? (followingListVisibilityStr as SocialVisibility) 
    : undefined;

  const defaultVisibilityStr = formData.get('defaultVisibility')?.toString();
  const defaultVisibility = Object.values(SocialVisibility).includes(defaultVisibilityStr as SocialVisibility)
    ? (defaultVisibilityStr as SocialVisibility)
    : undefined;

  // Parse boolean fields (from hidden inputs, they come as strings)
  const shareRSVPStr = formData.get('shareRSVPByDefault')?.toString();
  const shareRSVPByDefault = shareRSVPStr !== undefined ? shareRSVPStr === 'true' : undefined;
  
  const shareCheckinsStr = formData.get('shareCheckinsByDefault')?.toString();
  const shareCheckinsByDefault = shareCheckinsStr !== undefined ? shareCheckinsStr === 'true' : undefined;

  // Parse timezone
  const primaryTimezone = formData.get('primaryTimezone')?.toString() || undefined;

  // Parse preferences JSON (for communication prefs, notification prefs, etc.)
  const preferencesStr = formData.get('preferences')?.toString();
  const preferences = safeJsonParse(preferencesStr, PreferencesSchema, 'preferences');

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
    // Privacy fields
    followPolicy: followPolicy,
    followersListVisibility: followersListVisibility,
    followingListVisibility: followingListVisibility,
    defaultVisibility: defaultVisibility,
    shareRSVPByDefault: shareRSVPByDefault,
    shareCheckinsByDefault: shareCheckinsByDefault,
    primaryTimezone: primaryTimezone,
    preferences: preferences,
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
        headers: getAuthHeader(token),
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
    const errorMessage = extractApolloErrorMessage(error, 'An error occurred while updating your profile');

    logger.error('GraphQL error message', { errorMessage });
    return {
      ...prevState,
      apiError: errorMessage,
      zodErrors: null,
    };
  }
}
