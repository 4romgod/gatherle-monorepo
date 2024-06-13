import {z} from 'zod';
import {REGEX_PHONE_NUMBER} from '@/constants';
import {Gender} from '@/graphql/types';
import {ERROR_MESSAGES, validateDate, validateMongodbId} from '@/validation/common';

export const UserTypeSchema = z.object({
    id: z.string().refine(validateMongodbId),

    address: z
        .string()
        .min(3, {message: `Address ${ERROR_MESSAGES.TOO_SHORT}`})
        .optional(),

    birthdate: z
        .string()
        .refine(validateDate, {message: `Birth date ${ERROR_MESSAGES.INVALID_DATE}`})
        .describe('The birth date of the user'),

    email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),

    family_name: z.string().min(1, {message: `Last name ${ERROR_MESSAGES.REQUIRED}`}),

    gender: z.nativeEnum(Gender, {message: ERROR_MESSAGES.INVALID_GENDER}).optional(),

    given_name: z.string().min(1, {message: `First name ${ERROR_MESSAGES.REQUIRED}`}),

    encrypted_password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),

    phone_number: z.string().regex(REGEX_PHONE_NUMBER, {message: ERROR_MESSAGES.INVALID_PHONE_NUMBER}),

    profile_picture: z.string().optional(),

    username: z.string().min(3, `username ${ERROR_MESSAGES.TOO_SHORT}`).optional(),
});

export const CreateUserInputTypeSchema = UserTypeSchema.extend({
    password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
}).omit({id: true, encrypted_password: true});

export const UpdateUserInputTypeSchema = UserTypeSchema.partial()
    .extend({
        id: z.string().refine(validateMongodbId),
        password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}).optional(),
    })
    .omit({encrypted_password: true});

export const LoginUserInputTypeSchema = z.object({
    email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),
    password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
});

export const ForgotPasswordInputTypeSchema = z.object({
    email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),
});

export const ResetPasswordInputTypeSchema = z.object({
    password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
});
