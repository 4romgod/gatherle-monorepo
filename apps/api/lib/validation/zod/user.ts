import {z} from 'zod';
import {REGEX_PHONE_NUMBER} from '@/constants';
import {Gender, FollowPolicy, SocialVisibility} from '@ntlango/commons/types/user';
import {ERROR_MESSAGES, validateDate} from '@/validation/common';
import mongoose from 'mongoose';

export const UserSchema = z.object({
  userId: z.string().refine(mongoose.Types.ObjectId.isValid, {message: `User with ID ${ERROR_MESSAGES.DOES_NOT_EXIST}`}),

  birthdate: z
    .string()
    .refine(validateDate, {message: `Birth date ${ERROR_MESSAGES.INVALID_DATE}`})
    .describe('The birth date of the user'),

  email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),

  family_name: z.string().min(1, {message: `Last name ${ERROR_MESSAGES.REQUIRED}`}),

  given_name: z.string().min(1, {message: `First name ${ERROR_MESSAGES.REQUIRED}`}),

  location: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      coordinates: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
    })
    .optional(),

  gender: z.nativeEnum(Gender, {message: ERROR_MESSAGES.INVALID_GENDER}).optional(),

  phone_number: z.string().regex(REGEX_PHONE_NUMBER, {message: ERROR_MESSAGES.INVALID_PHONE_NUMBER}).optional(),

  profile_picture: z.string().optional(),

  username: z.string().min(3, `username ${ERROR_MESSAGES.TOO_SHORT}`).optional(),

  // Privacy settings
  followPolicy: z.nativeEnum(FollowPolicy).optional(),
  followersListVisibility: z.nativeEnum(SocialVisibility).optional(),
  followingListVisibility: z.nativeEnum(SocialVisibility).optional(),
  defaultVisibility: z.nativeEnum(SocialVisibility).optional(),
  socialVisibility: z.nativeEnum(SocialVisibility).optional(),
  shareRSVPByDefault: z.boolean().optional(),
  shareCheckinsByDefault: z.boolean().optional(),
  primaryTimezone: z.string().optional(),
  // Preferences (communication, notifications)
  preferences: z.object({
    communicationPrefs: z.object({
      emailEnabled: z.boolean(),
      pushEnabled: z.boolean(),
    }).optional(),
  }).optional(),
});

export const CreateUserInputSchema = UserSchema.extend({
  password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
}).omit({userId: true});

export const UpdateUserInputSchema = UserSchema.partial().extend({
  userId: z.string().refine(mongoose.Types.ObjectId.isValid, {message: `User with UserId ${ERROR_MESSAGES.DOES_NOT_EXIST}`}),
  password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}).optional(),
});

export const LoginUserInputSchema = z.object({
  email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),
  password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
});

export const ForgotPasswordInputTypeSchema = z.object({
  email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),
});

export const ResetPasswordInputTypeSchema = z.object({
  password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
});
