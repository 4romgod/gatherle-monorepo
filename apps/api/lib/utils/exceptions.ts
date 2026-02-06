import type { GraphQLErrorExtensions } from 'graphql';
import { GraphQLError } from 'graphql';
import { HttpStatusCode, REGEXT_MONGO_DB_ERROR } from '@/constants';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { capitalize } from 'lodash';
import { ERROR_MESSAGES } from '@/validation';

export type CustomErrorType = {
  errorCode: string;
  errorStatus: number;
};

export const ErrorTypes = {
  BAD_USER_INPUT: {
    errorCode: ApolloServerErrorCode.BAD_USER_INPUT,
    errorStatus: HttpStatusCode.BAD_REQUEST,
  },
  BAD_REQUEST: {
    errorCode: ApolloServerErrorCode.BAD_REQUEST,
    errorStatus: HttpStatusCode.BAD_REQUEST,
  },
  CONFLICT: {
    errorCode: 'CONFLICT',
    errorStatus: HttpStatusCode.CONFLICT,
  },
  NOT_FOUND: {
    errorCode: 'NOT_FOUND',
    errorStatus: HttpStatusCode.NOT_FOUND,
  },
  UNAUTHENTICATED: {
    errorCode: 'UNAUTHENTICATED',
    errorStatus: HttpStatusCode.UNAUTHENTICATED,
  },
  UNAUTHORIZED: {
    errorCode: 'UNAUTHORIZED',
    errorStatus: HttpStatusCode.UNAUTHORIZED,
  },
  INTERNAL_SERVER_ERROR: {
    errorCode: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
    errorStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
  },
};

export const CustomError = (
  errorMessage: string,
  errorType: CustomErrorType,
  extensions?: GraphQLErrorExtensions,
): GraphQLError => {
  const httpExtension = (extensions?.http ?? {}) as Record<string, unknown> & { status?: number };
  const overrideHttpStatus = httpExtension.status;
  const httpStatus = typeof overrideHttpStatus === 'number' ? overrideHttpStatus : errorType.errorStatus;
  return new GraphQLError(errorMessage, {
    extensions: {
      ...(extensions && { ...extensions }),
      code: errorType.errorCode,
      http: {
        ...httpExtension,
        status: httpStatus,
      },
    },
  });
};

/**
 * Get the errors that we are familiar with
 * //TODO Maybe use this in a middleware https://mongoosejs.com/docs/middleware.html
 */
export const KnownCommonError = (error: unknown): GraphQLError => {
  let message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  if (error && typeof error === 'object') {
    const { code, keyValue } = error as { code?: number; keyValue?: Record<string, string> };
    if (code) {
      switch (code) {
        case 11000: {
          const key = keyValue ? Object.keys(keyValue)[0] : undefined;
          if (key && keyValue?.[key]) {
            message = `${capitalize(key)} ${keyValue[key]} already exists`;
          } else {
            message = 'A duplicate value was detected';
          }
          return CustomError(message, ErrorTypes.CONFLICT);
        }
        case 11001: {
          message = duplicateFieldMessage(error);
          return CustomError(message, ErrorTypes.CONFLICT);
        }
        case 10334: {
          message = ERROR_MESSAGES.CONTENT_TOO_LARGE;
          return CustomError(message, ErrorTypes.BAD_USER_INPUT);
        }
      }
    }
  }

  return CustomError(message, ErrorTypes.INTERNAL_SERVER_ERROR);
};

/**
 * Extracts a user-friendly validation error message from Mongoose validation errors.
 * @param error The error object from Mongoose validation
 * @param defaultMessage The default message to return if no validation message is found
 * @returns A validation error message string
 */
export const extractValidationErrorMessage = (error: unknown, defaultMessage: string = 'Validation failed'): string => {
  type FieldError = { message?: string };
  const typedError = error as { name?: string; message?: string; errors?: Record<string, FieldError> };
  const errorName = typedError?.name;
  const errorMessage = typedError?.message;

  const isValidationError =
    errorName === 'ValidationError' ||
    errorName === 'ValidatorError' ||
    (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('validation failed'));

  if (!isValidationError) {
    return defaultMessage;
  }

  const fieldErrors = typedError.errors ? (Object.values(typedError.errors) as FieldError[]) : [];
  const validationMessage =
    fieldErrors
      .map((fieldError) => fieldError.message)
      .filter((message): message is string => typeof message === 'string')[0] ?? defaultMessage;

  return validationMessage;
};

/**
 * @param mongoError MongoDB Error
 * @returns An error message pointing to what value is being duplicated
 */
export const duplicateFieldMessage = (mongoError: unknown) => {
  try {
    if (!mongoError || typeof mongoError !== 'object') {
      throw new Error('Invalid error object');
    }
    if ('message' in mongoError) {
      const errorMessage = (mongoError as { message: unknown }).message;
      if (typeof errorMessage === 'string' && errorMessage.includes('duplicate key error')) {
        const splitError = errorMessage.split('dup key:');
        if (splitError.length > 1) {
          const fieldValuePart = splitError[1].trim();
          const match = fieldValuePart.match(REGEXT_MONGO_DB_ERROR);
          if (match) {
            const fieldName = match[1];
            const fieldValue = match[2];
            return `The '${fieldName}' with value '${fieldValue}' already exists.`;
          }
        }
      }
    }
    return 'An error occurred.';
  } catch (error) {
    return 'An error occurred while processing the error message.';
  }
};
