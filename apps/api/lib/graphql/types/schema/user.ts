import {z} from 'zod';
import {REGEX_DATE, REGEX_PHONE_NUMBER} from '@/constants';
import {Gender} from '@/graphql/types';
import {ERROR_MESSAGES, validateMongodbId} from '@/utils/validators/common';

export const CreateUserInputTypeSchema = z.object({
    address: z
        .string()
        .min(3, {message: `Address ${ERROR_MESSAGES.TOO_SHORT}`})
        .optional(),
    birthdate: z.string().regex(REGEX_DATE, {message: `Birthdate ${ERROR_MESSAGES.INVALID_DATE}`}),
    email: z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}),
    family_name: z.string().min(1, {message: `Last name ${ERROR_MESSAGES.REQUIRED}`}),
    gender: z.nativeEnum(Gender, {message: ERROR_MESSAGES.INVALID_GENDER}),
    given_name: z.string().min(1, {message: `First name ${ERROR_MESSAGES.REQUIRED}`}),
    password: z.string().min(8, {message: ERROR_MESSAGES.INVALID_PASSWORD}),
    phone_number: z.string().regex(REGEX_PHONE_NUMBER, {message: ERROR_MESSAGES.INVALID_PHONE_NUMBER}),
    profile_picture: z.string().optional(),
    username: z.string().min(3, `username ${ERROR_MESSAGES.TOO_SHORT}`).optional(),
});

export const UpdateUserInputTypeSchema = z.object({
    id: z.string().refine(validateMongodbId),
    address: z.string().optional(),
    birthdate: z
        .string()
        .regex(REGEX_DATE, {message: `Birthdate ${ERROR_MESSAGES.INVALID_DATE}`})
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
});

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
