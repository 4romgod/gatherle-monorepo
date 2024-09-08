import {GraphQLError, GraphQLErrorExtensions} from 'graphql';
import {HttpStatusCode, REGEXT_MONGO_DB_ERROR} from '@/constants';
import {ApolloServerErrorCode} from '@apollo/server/errors';
import {capitalize} from 'lodash';
import {ERROR_MESSAGES} from '@/validation';

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

export const CustomError = (errorMessage: string, errorType: CustomErrorType, extensions?: GraphQLErrorExtensions): GraphQLError => {
  return new GraphQLError(errorMessage, {
    extensions: {
      ...(extensions && {...extensions}),
      code: errorType.errorCode,
      http: {
        status: errorType.errorStatus,
      },
    },
  });
};

/**
 * Get the errors that we are familiar with
 * //TODO Maybe use this in a middleware https://mongoosejs.com/docs/middleware.html
 */
export const KnownCommonError = (error: any): GraphQLError => {
  let message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  const {code, keyValue} = error;
  if (code) {
    switch (code) {
      case 11000:
        const key = Object.keys(keyValue)[0];
        message = `${capitalize(key)} ${keyValue[key]} already exists`;
        return CustomError(message, ErrorTypes.CONFLICT);
      case 11001:
        message = duplicateFieldMessage(error);
        return CustomError(message, ErrorTypes.CONFLICT);
      case 10334:
        message = ERROR_MESSAGES.CONTENT_TOO_LARGE;
        return CustomError(message, ErrorTypes.BAD_USER_INPUT);
    }
  }

  return CustomError(message, ErrorTypes.INTERNAL_SERVER_ERROR);
};

/**
 * @param mongoError MongoDB Error
 * @returns An error message pointing to what value is being duplicated
 */
export const duplicateFieldMessage = (mongoError: any) => {
  try {
    const errorMessage = mongoError.message;
    if (errorMessage.includes('duplicate key error')) {
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
    return 'An error occurred.';
  } catch (error) {
    return 'An error occurred while processing the error message.';
  }
};
