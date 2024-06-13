import mongoose from 'mongoose';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ZodSchema} from 'zod';
import {EventStatus, Gender} from '@/graphql/types';
import {isValid, parseISO} from 'date-fns';

export const validateMongodbId = (id: string, message?: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw CustomError(message || `id: ${id} does not exist`, ErrorTypes.NOT_FOUND);
    }
    return true;
};

// https://www.apollographql.com/docs/apollo-server/data/errors/
export const validateInput = <Type>(schema: ZodSchema, input: Type) => {
    const {error, success} = schema.safeParse(input);
    if (!success && error) {
        const {message, path} = error.issues[0];
        throw CustomError(message, ErrorTypes.BAD_USER_INPUT, {argumentName: path[0]});
    }
};

export const validateDate = (date: string) => {
    return isValid(parseISO(date));
};

const transforomEnumToErrorMessage = (enumType: any) => {
    return Object.values(enumType).slice(0, -1).join(', ') + ', or ' + Object.values(enumType).slice(-1);
};

export const ERROR_MESSAGES = {
    ATLEAST_ONE: (type: string) => `Atleast one ${type} is required`,
    INVALID: 'is invalid',
    INVALID_DATE: 'should be in YYYY-MM-DD format',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_EVENT_STATUS: `Invalid event status, should be ${Object.values(EventStatus).slice(0, -1).join(', ') + ', or ' + Object.values(EventStatus).slice(-1)}`,
    INVALID_GENDER: `Invalid gender input, should be ${transforomEnumToErrorMessage(Gender)}`,
    INVALID_PASSWORD: 'Password should be at least 8 characters long',
    INVALID_PHONE_NUMBER: 'Invalid phone number format',
    INVALID_QUERY: "Your query doesn't match the schema. Try double-checking it!",
    INVALID_TIME: 'should be in HH:mm format',
    NOT_FOUND: (searchedItemType: string, searchParamType: string, searchParamValue: string) =>
        `${searchedItemType} with ${searchParamType} ${searchParamValue} does not exist`,
    PASSWORD_MISSMATCH: 'Email and Password do not match',
    REQUIRED: 'is required',
    TOO_SHORT: 'is too short',
    UNAUTHENTICATED: 'You must be logged in to access this resource.',
    UNAUTHORIZED: "You don't have permission to access this resource.",
};
