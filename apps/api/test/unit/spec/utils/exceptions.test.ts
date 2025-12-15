import type { CustomErrorType} from '@/utils';
import {CustomError, KnownCommonError, ErrorTypes, duplicateFieldMessage} from '@/utils';
import {ERROR_MESSAGES} from '@/validation';
import {GraphQLError} from 'graphql';

describe('exceptions', () => {
  describe('CustomError', () => {
    it('should create a GraphQLError with provided message and error type', () => {
      const errorMessage = 'Test error message';
      const errorType: CustomErrorType = {
        errorCode: 'TEST_ERROR_CODE',
        errorStatus: 400,
      };

      const error = CustomError(errorMessage, errorType);
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.message).toEqual(errorMessage);
      expect(error.extensions).toEqual({
        code: errorType.errorCode,
        http: {
          status: errorType.errorStatus,
        },
      });
    });

    it('should create a GraphQLError with provided message and error type, and any additional extensions', () => {
      const errorMessage = 'Test error message';
      const errorType: CustomErrorType = {
        errorCode: 'TEST_ERROR_CODE',
        errorStatus: 400,
      };
      const extensions = {additional: 'Additional extension'};

      const error = CustomError(errorMessage, errorType, extensions);
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.message).toEqual(errorMessage);
      expect(error.extensions).toEqual({
        code: errorType.errorCode,
        http: {
          status: errorType.errorStatus,
        },
        additional: 'Additional extension',
      });
    });
  });

  describe('KnownCommonError', () => {
    it('should handle MongoDB duplicate key error (11000)', () => {
      const error = {code: 11000, keyValue: {email: 'test@example.com'}};
      const graphQLError = KnownCommonError(error);

      expect(graphQLError).toBeInstanceOf(GraphQLError);
      expect(graphQLError.message).toContain('Email test@example.com already exists');
      expect(graphQLError.extensions).toEqual({
        code: ErrorTypes.CONFLICT.errorCode,
        http: {
          status: ErrorTypes.CONFLICT.errorStatus,
        },
      });
    });

    it('should handle MongoDB duplicate key error (11001)', () => {
      const error = {
        code: 11001,
        message: 'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "test@example.com" }',
      };
      const graphQLError = KnownCommonError(error);

      expect(graphQLError).toBeInstanceOf(GraphQLError);
      expect(graphQLError.message).toContain("The 'email' with value '\"test@example.com\"' already exists.");
      expect(graphQLError.extensions).toEqual({
        code: ErrorTypes.CONFLICT.errorCode,
        http: {
          status: ErrorTypes.CONFLICT.errorStatus,
        },
      });
    });

    it('should handle MongoDB Content Too Large error (10334)', () => {
      const error = {code: 10334};
      const graphQLError = KnownCommonError(error);

      expect(graphQLError).toBeInstanceOf(GraphQLError);
      expect(graphQLError.message).toContain(ERROR_MESSAGES.CONTENT_TOO_LARGE);
      expect(graphQLError.extensions).toEqual({
        code: ErrorTypes.BAD_USER_INPUT.errorCode,
        http: {
          status: ErrorTypes.BAD_USER_INPUT.errorStatus,
        },
      });
    });

    it('should handle Unknown error', () => {
      const error = {code: 'unknown'};
      const graphQLError = KnownCommonError(error);

      expect(graphQLError).toBeInstanceOf(GraphQLError);
      expect(graphQLError.message).toContain(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      expect(graphQLError.extensions).toEqual({
        code: ErrorTypes.INTERNAL_SERVER_ERROR.errorCode,
        http: {
          status: ErrorTypes.INTERNAL_SERVER_ERROR.errorStatus,
        },
      });
    });
  });

  describe('duplicateFieldMessage', () => {
    it('should return the correct message for a duplicate key error', () => {
      const mongoError = {
        message: 'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "test@example.com" }',
      };
      const result = duplicateFieldMessage(mongoError);
      expect(result).toBe("The 'email' with value '\"test@example.com\"' already exists.");
    });

    it('should return a generic error message for non-duplicate key errors', () => {
      const mongoError = {
        message: 'Some other error',
      };
      const result = duplicateFieldMessage(mongoError);
      expect(result).toBe('An error occurred.');
    });

    it('should return a generic error message for malformed duplicate key errors', () => {
      const mongoError = {
        message: 'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: }',
      };
      const result = duplicateFieldMessage(mongoError);
      expect(result).toBe('An error occurred.');
    });

    it('should handle unexpected input gracefully', () => {
      const mongoError = null;
      const result = duplicateFieldMessage(mongoError);
      expect(result).toBe('An error occurred while processing the error message.');
    });

    it('should handle unexpected message format gracefully', () => {
      const mongoError = {
        message: 'E11000 duplicate key error collection: test.users',
      };
      const result = duplicateFieldMessage(mongoError);
      expect(result).toBe('An error occurred.');
    });

    it('should handle error message without "dup key" part gracefully', () => {
      const mongoError = {
        message: 'E11000 duplicate key error collection: test.users index: email_1',
      };
      const result = duplicateFieldMessage(mongoError);
      expect(result).toBe('An error occurred.');
    });
  });
});
