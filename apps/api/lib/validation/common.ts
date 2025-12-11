import mongoose from 'mongoose';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {z, ZodSchema} from 'zod';
import {EventStatus} from '@ntlango/commons/types/event';
import {Gender} from '@ntlango/commons/types/user';
import {isValid, parseISO} from 'date-fns';

export const validateMongodbId = (id: string, message?: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw CustomError(message || `ID '${id}' does not exist`, ErrorTypes.NOT_FOUND);
  }
  return true;
};

export const validateEmail = (email: string, message?: string) => {
  const {error, success} = z.string().email({message: ERROR_MESSAGES.INVALID_EMAIL}).safeParse(email);
  if (!success && error) {
    const {path} = error.issues[0];
    throw CustomError(message || ERROR_MESSAGES.INVALID_EMAIL, ErrorTypes.BAD_USER_INPUT, {argumentName: path[0]});
  }
  return true;
};

export const validateUsername = (username: string, message?: string) => {
  const {error, success} = z.string().min(3, {message: ERROR_MESSAGES.INVALID_USERNAME}).safeParse(username);
  if (!success && error) {
    const {path} = error.issues[0];
    throw CustomError(message || ERROR_MESSAGES.INVALID_USERNAME, ErrorTypes.BAD_USER_INPUT, {argumentName: path[0]});
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
  return Object.values(enumType).slice(0).join(', ');
};

export const ERROR_MESSAGES = {
  ATLEAST_ONE: (type: string) => `Atleast one ${type} is required`,
  CONTENT_TOO_LARGE: 'Your Content is Too Large, Max size is 15MB',
  DOES_NOT_EXIST: 'does not exist',
  INTERNAL_SERVER_ERROR: 'Oops, something is broken',
  INVALID: 'is invalid',
  INVALID_DATE: 'should be in YYYY-MM-DD format',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_EVENT_STATUS: `Invalid event status, should be ${Object.values(EventStatus).slice(0, -1).join(', ') + ', or ' + Object.values(EventStatus).slice(-1)}`,
  INVALID_GENDER: `Invalid gender input, should be ${transforomEnumToErrorMessage(Gender)}`,
  INVALID_PASSWORD: 'Password should be at least 8 characters long',
  INVALID_PHONE_NUMBER: 'Invalid phone number format',
  INVALID_QUERY: "Your query doesn't match the schema. Try double-checking it!",
  INVALID_TIME: 'should be in HH:mm format',
  INVALID_USERNAME: 'username length should be => 3 characters',
  NOT_FOUND: (searchedItemType: string, searchParamType: string, searchParamValue: string) =>
    `${searchedItemType} with ${searchParamType} ${searchParamValue} does not exist`,
  PASSWORD_MISSMATCH: 'Email and Password do not match',
  REQUIRED: 'is required',
  TOO_SHORT: 'is too short',
  UNAUTHENTICATED: 'You must be logged in to access this resource.',
  UNAUTHORIZED: "You don't have permission to access this resource.",
};
