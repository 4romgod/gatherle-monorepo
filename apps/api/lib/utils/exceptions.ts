import {GraphQLError, GraphQLErrorExtensions} from 'graphql';
import {HttpStatusCode} from '@/constants';
import {ApolloServerErrorCode} from '@apollo/server/errors';
import {capitalize} from 'lodash';

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
    let message = 'Oops, something is broken';

    const {code, keyValue} = error;
    if (code) {
        switch (code) {
            case 11000: {
                const key = Object.keys(keyValue)[0];
                message = `${capitalize(key)} ${keyValue[key]} already exists`;
                return CustomError(message, ErrorTypes.CONFLICT);
            }
            case 11001:
                message = uniqueMessage(error);
                return CustomError(message, ErrorTypes.CONFLICT);
            case 10334:
                message = 'Your Content is Too Large, Max size is 15MB';
                return CustomError(message, ErrorTypes.BAD_USER_INPUT);
        }
    }

    return CustomError(message, ErrorTypes.INTERNAL_SERVER_ERROR);
};

/**
 * Get unique error field name
 */
export const uniqueMessage = (error: any) => {
    let output: string;
    try {
        const fieldName = error.message.substring(error.message.lastIndexOf('.$') + 2, error.message.lastIndexOf('_1'));
        output = `${capitalize(fieldName)} already exists`;
    } catch (ex) {
        output = 'Unique field already exists';
    }

    return output;
};
