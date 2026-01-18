import {z} from 'zod';
import {ERROR_MESSAGES, REGEX_PHONE_NUMBER} from '../constants';
import {validateDate, validateMongodbId} from '../utils';
import {Gender, FollowPolicy, SocialVisibility} from '../types';

export const CreateUserInputSchema = z.object({
    address: z
        .string()
        .min(3, {message: `Address ${ERROR_MESSAGES.TOO_SHORT}`})
        .optional(),
    birthdate: z.string().refine(validateDate, {message: `Birth date ${ERROR_MESSAGES.INVALID}`}), // TODO Should be greater than Date.now()
    email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),
    family_name: z.string().min(1, {message: `Last name ${ERROR_MESSAGES.REQUIRED}`}),
    gender: z.nativeEnum(Gender, {message: ERROR_MESSAGES.INVALID_GENDER}),
    given_name: z.string().min(1, {message: `First name ${ERROR_MESSAGES.REQUIRED}`}),
    password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
    phone_number: z.string().regex(REGEX_PHONE_NUMBER, {message: ERROR_MESSAGES.INVALID_PHONE_NUMBER}),
    profile_picture: z.string().optional(),
    username: z.string().min(3, `username ${ERROR_MESSAGES.TOO_SHORT}`).optional(),
});

export const UpdateUserInputSchema = z.object({
    id: z.string().refine(validateMongodbId),
    address: z.string().optional(),
    birthdate: z
        .string()
        .refine(validateDate, {message: `Birth date ${ERROR_MESSAGES.INVALID_DATE}`}) // TODO Should be greater than Date.now()
        .optional(),
    email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}).optional(),
    family_name: z
        .string()
        .min(1, {message: `Last name ${ERROR_MESSAGES.INVALID}`})
        .optional(),
    given_name: z
        .string()
        .min(1, {message: `First name ${ERROR_MESSAGES.INVALID}`})
        .optional(),
    password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}).optional(),
    phone_number: z.string().regex(REGEX_PHONE_NUMBER, {message: ERROR_MESSAGES.INVALID_PHONE_NUMBER}).optional(),
    profile_picture: z.string().optional(),
    username: z.string().optional(),
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
            emailNotifications: z.boolean(),
            pushNotifications: z.boolean(),
        }).optional(),
    }).optional(),
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
