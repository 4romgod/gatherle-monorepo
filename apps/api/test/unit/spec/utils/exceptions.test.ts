import type { CustomErrorType } from '@/utils';
import {
  CustomError,
  KnownCommonError,
  ErrorTypes,
  duplicateFieldMessage,
  extractValidationErrorMessage,
  logDaoError,
} from '@/utils';
import { ERROR_MESSAGES } from '@/validation';
import { GraphQLError } from 'graphql';
import { logger } from '@/utils/logger';

jest.mock('@/utils/logger', () => ({
  ...jest.requireActual('@/utils/logger'),
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

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
      const extensions = { additional: 'Additional extension' };

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
      const error = { code: 11000, keyValue: { email: 'test@example.com' } };
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
        message:
          'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "test@example.com" }',
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
      const error = { code: 10334 };
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
      const error = { code: 'unknown' };
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
        message:
          'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "test@example.com" }',
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

  describe('extractValidationErrorMessage', () => {
    it('should extract validation message from ValidationError with field errors', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          email: { message: 'Email is required' },
          name: { message: 'Name must be at least 3 characters' },
        },
      };
      const result = extractValidationErrorMessage(error);
      expect(result).toBe('Email is required');
    });

    it('should extract validation message from ValidatorError', () => {
      const error = {
        name: 'ValidatorError',
        message: 'validation failed: email is invalid',
        errors: {
          email: { message: 'Email format is invalid' },
        },
      };
      const result = extractValidationErrorMessage(error);
      expect(result).toBe('Email format is invalid');
    });

    it('should extract validation message when error message contains "validation failed"', () => {
      const error = {
        name: 'SomeError',
        message: 'Event validation failed: age must be positive',
        errors: {
          age: { message: 'Age must be a positive number' },
        },
      };
      const result = extractValidationErrorMessage(error);
      expect(result).toBe('Age must be a positive number');
    });

    it('should return default message when no validation errors found', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {},
      };
      const result = extractValidationErrorMessage(error, 'Custom default');
      expect(result).toBe('Custom default');
    });

    it('should return default message when error is not a validation error', () => {
      const error = {
        name: 'MongoError',
        message: 'Connection failed',
      };
      const result = extractValidationErrorMessage(error, 'Default validation message');
      expect(result).toBe('Default validation message');
    });

    it('should return default message when errors array is empty', () => {
      const error = {
        name: 'ValidationError',
        message: 'validation failed',
        errors: {
          field1: {},
          field2: { message: undefined },
        },
      };
      const result = extractValidationErrorMessage(error);
      expect(result).toBe('Validation failed');
    });

    it('should handle null or undefined error gracefully', () => {
      const result1 = extractValidationErrorMessage(null);
      expect(result1).toBe('Validation failed');

      const result2 = extractValidationErrorMessage(undefined);
      expect(result2).toBe('Validation failed');
    });

    it('should use custom default message when provided', () => {
      const error = { name: 'SomeError' };
      const result = extractValidationErrorMessage(error, 'Event validation failed');
      expect(result).toBe('Event validation failed');
    });
  });

  describe('logDaoError', () => {
    const mockWarn = logger.warn as jest.Mock;
    const mockError = logger.error as jest.Mock;

    beforeEach(() => {
      mockWarn.mockClear();
      mockError.mockClear();
    });

    describe('routes to logger.warn for expected client errors', () => {
      it('logs at warn level for a NOT_FOUND GraphQLError', () => {
        const error = new GraphQLError('Not found', { extensions: { code: 'NOT_FOUND' } });
        logDaoError('resource missing', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockWarn).toHaveBeenCalledWith('resource missing', { error });
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a BAD_USER_INPUT GraphQLError', () => {
        const error = new GraphQLError('bad input', { extensions: { code: 'BAD_USER_INPUT' } });
        logDaoError('validation failed', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a BAD_REQUEST GraphQLError', () => {
        const error = new GraphQLError('bad request', { extensions: { code: 'BAD_REQUEST' } });
        logDaoError('bad request', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a CONFLICT GraphQLError', () => {
        const error = new GraphQLError('conflict', { extensions: { code: 'CONFLICT' } });
        logDaoError('conflict', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for an UNAUTHENTICATED GraphQLError', () => {
        const error = new GraphQLError('unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
        logDaoError('unauthenticated', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for an UNAUTHORIZED GraphQLError', () => {
        const error = new GraphQLError('unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        logDaoError('unauthorized', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a MongoDB duplicate-key error (code 11000)', () => {
        const error = { code: 11000, keyValue: { email: 'test@example.com' } };
        logDaoError('duplicate key', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a MongoDB duplicate-key error (code 11001)', () => {
        const error = { code: 11001 };
        logDaoError('duplicate key', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a MongoDB content-too-large error (code 10334)', () => {
        const error = { code: 10334 };
        logDaoError('content too large', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a Mongoose ValidationError', () => {
        const error = {
          name: 'ValidationError',
          message: 'validation failed',
          errors: { email: { message: 'Email is required' } },
        };
        logDaoError('mongoose validation', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });

      it('logs at warn level for a Mongoose ValidatorError', () => {
        const error = { name: 'ValidatorError', message: 'Path is required' };
        logDaoError('mongoose validator', { error });
        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockError).not.toHaveBeenCalled();
      });
    });

    describe('routes to logger.error for unexpected server errors', () => {
      it('logs at error level for a generic Error', () => {
        const error = new Error('connection timed out');
        logDaoError('db failure', { error });
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockError).toHaveBeenCalledWith('db failure', { error });
        expect(mockWarn).not.toHaveBeenCalled();
      });

      it('logs at error level for an unknown object error', () => {
        const error = { code: 99999, message: 'unknown' };
        logDaoError('unknown failure', { error });
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockWarn).not.toHaveBeenCalled();
      });

      it('logs at error level for a GraphQLError with an INTERNAL_SERVER_ERROR code', () => {
        const error = new GraphQLError('internal', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
        logDaoError('internal error', { error });
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockWarn).not.toHaveBeenCalled();
      });

      it('logs at error level when error is null', () => {
        logDaoError('null error', { error: null });
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockWarn).not.toHaveBeenCalled();
      });

      it('logs at error level when error is undefined', () => {
        logDaoError('no error object', {});
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockWarn).not.toHaveBeenCalled();
      });
    });

    describe('passes context through to the logger', () => {
      it('includes all extra context fields in the warn call', () => {
        const error = new GraphQLError('not found', { extensions: { code: 'NOT_FOUND' } });
        logDaoError('read failed', { error, userId: 'u-123', eventId: 'e-456' });
        expect(mockWarn).toHaveBeenCalledWith('read failed', { error, userId: 'u-123', eventId: 'e-456' });
      });

      it('includes all extra context fields in the error call', () => {
        const error = new Error('timeout');
        logDaoError('db timeout', { error, connectionId: 'c-789' });
        expect(mockError).toHaveBeenCalledWith('db timeout', { error, connectionId: 'c-789' });
      });
    });
  });
});
