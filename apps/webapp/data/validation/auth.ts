import { z } from 'zod';
import { isValid, parseISO } from 'date-fns';
import { Gender, UserRole, FollowPolicy, SocialVisibility } from '../graphql/types/graphql';

const InputMaybe = z.union([z.string(), z.undefined()]);

/**
 * Shared password complexity schema — mirrors packages/commons/lib/validation/auth.ts.
 * Rules: min 8 chars, at least one lowercase, one uppercase, one digit, one special character.
 * NOT applied to LoginUserInputSchema — doing so would lock out users with pre-existing weak passwords.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character' });

export const CreateUserInputSchema = z.object({
  birthdate: z.string().refine((date) => isValid(parseISO(date)), {
    message: 'Birthdate should be in YYYY-MM-DD format',
  }),
  email: z.string().email({ message: 'Invalid email format' }),
  family_name: z.string().min(1, { message: 'Last name is required' }),
  given_name: z.string().min(1, { message: 'First name is required' }),
  password: passwordSchema,
  phone_number: InputMaybe,
  profile_picture: InputMaybe,
  username: InputMaybe,
});

export const UpdateUserInputSchema = z.object({
  userId: z.string().min(1, { message: 'User ID is required' }),
  given_name: z.string().min(1, { message: 'First name is required' }).optional(),
  family_name: z.string().min(1, { message: 'Last name is required' }).optional(),
  email: z.string().email({ message: 'Invalid email address' }).optional(),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).optional(),
  bio: z.string().max(500, { message: 'Bio cannot exceed 500 characters' }).optional().nullable(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
    .optional(),
  phone_number: z.string().optional().nullable(),
  profile_picture: z.string().url({ message: 'Must be a valid URL' }).optional().nullable(),
  password: passwordSchema.optional(),
  address: z
    .union([z.string(), z.record(z.any())])
    .optional()
    .nullable(),
  gender: z.nativeEnum(Gender).optional(),
  userRole: z.nativeEnum(UserRole).optional(),
  interests: z.array(z.string()).optional().nullable(),
  // Privacy fields
  followPolicy: z.nativeEnum(FollowPolicy).optional(),
  followersListVisibility: z.nativeEnum(SocialVisibility).optional(),
  followingListVisibility: z.nativeEnum(SocialVisibility).optional(),
  defaultVisibility: z.nativeEnum(SocialVisibility).optional(),
  socialVisibility: z.nativeEnum(SocialVisibility).optional(),
  shareRSVPByDefault: z.boolean().optional(),
  shareCheckinsByDefault: z.boolean().optional(),
  // Timezone
  primaryTimezone: z.string().optional(),
  // Preferences (communication, notifications)
  preferences: z
    .object({
      communicationPrefs: z
        .object({
          emailEnabled: z.boolean(),
          pushEnabled: z.boolean(),
        })
        .optional(),
    })
    .optional(),
});

export const LoginUserInputSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(8, { message: 'Password should be at least 8 characters long' }),
});

export const ForgotPasswordInputTypeSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
});

export const ResetPasswordInputTypeSchema = z.object({
  password: passwordSchema,
  'confirm-password': passwordSchema,
});
