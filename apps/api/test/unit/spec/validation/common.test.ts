import type { ZodSchema } from 'zod';
import { z } from 'zod';
import {
  validateMongodbId,
  validateInput,
  validateDate,
  ERROR_MESSAGES,
  validateEmail,
  validateUsername,
} from '@/validation';
import { EventStatus } from '@gatherle/commons/types/event';
import mongoose from 'mongoose';

jest.mock('@/utils/exceptions', () => ({
  CustomError: jest.fn((message, type, extra) => ({ message, type, extra })),
  ErrorTypes: {
    NOT_FOUND: 'NotFound',
    BAD_USER_INPUT: 'BadUserInput',
  },
}));

describe('Validation functions', () => {
  describe('validateMongodbId', () => {
    it('should validate a correct MongoDB ID', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      expect(validateMongodbId(validId)).toBe(true);
    });

    it('should throw an error for an invalid MongoDB ID', () => {
      const invalidId = 'invalid_id';
      expect(() => validateMongodbId(invalidId)).toThrow({
        message: `ID '${invalidId}' does not exist`,
        name: 'NotFound',
      });
    });

    it('should throw a custom error message for an invalid MongoDB ID', () => {
      const invalidId = 'invalid_id';
      const customMessage = 'Custom error message';
      expect(() => validateMongodbId(invalidId, customMessage)).toThrow({
        message: customMessage,
        name: 'NotFound',
      });
    });
  });

  describe('validateEmail', () => {
    it('should validate a correct email format', () => {
      expect(validateEmail('email@example.com')).toBe(true);
    });

    it('should throw an error for an invalid email format', () => {
      const invalidEmail = 'invalid_email';
      expect(() => validateEmail(invalidEmail)).toThrow({
        message: ERROR_MESSAGES.INVALID_EMAIL,
        name: 'BadInput',
      });
    });

    it('should throw a custom error message for an invalid email format', () => {
      const invalidEmail = 'invalid_id';
      const customMessage = 'Custom error message';
      expect(() => validateEmail(invalidEmail, customMessage)).toThrow({
        message: customMessage,
        name: 'BadInput',
      });
    });
  });

  describe('validateUsername', () => {
    it('should validate a correct username format', () => {
      expect(validateUsername('username')).toBe(true);
    });

    it('should throw an error for an invalid email format', () => {
      const invalidUsername = 'in';
      expect(() => validateUsername(invalidUsername)).toThrow({
        message: ERROR_MESSAGES.INVALID_USERNAME,
        name: 'BadInput',
      });
    });

    it('should throw a custom error message for an invalid username format', () => {
      const invalidUsername = 'in';
      const customMessage = 'Custom error message';
      expect(() => validateUsername(invalidUsername, customMessage)).toThrow({
        message: customMessage,
        name: 'BadInput',
      });
    });
  });

  describe('validateInput', () => {
    const schema: ZodSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should validate correct input', () => {
      const input = { name: 'John', age: 30 };
      expect(() => validateInput(schema, input)).not.toThrow();
    });

    it('should throw an error for invalid input', () => {
      const input = { name: 'John', age: 'invalid' };
      expect(() => validateInput(schema, input)).toThrow({
        message: 'Expected number, received string',
        name: 'BadUserInput',
      });
    });
  });

  describe('validateDate', () => {
    it('should validate a correct date string', () => {
      const date = '2021-08-10';
      expect(validateDate(date)).toBe(true);
    });

    it('should invalidate an incorrect date string', () => {
      const date = 'invalid-date';
      expect(validateDate(date)).toBe(false);
    });

    it('should invalidate an incorrectly formatted date string', () => {
      const date = '10-08-2021';
      expect(validateDate(date)).toBe(false);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should generate correct error messages', () => {
      expect(ERROR_MESSAGES.ATLEAST_ONE('item')).toBe('Atleast one item is required');
      expect(ERROR_MESSAGES.NOT_FOUND('User', 'ID', '123')).toBe('User with ID 123 does not exist');
    });

    it('should generate correct INVALID_EVENT_STATUS message', () => {
      const expectedMessage = `Invalid event status, should be ${Object.values(EventStatus).slice(0, -1).join(', ') + ', or ' + Object.values(EventStatus).slice(-1)}`;
      expect(ERROR_MESSAGES.INVALID_EVENT_STATUS).toBe(expectedMessage);
    });

    it('should generate correct INVALID_GENDER message', () => {
      const expectedMessage = `Invalid gender input, should be ${['Male', 'Female', 'Other'].join(', ')}`;
      expect(ERROR_MESSAGES.INVALID_GENDER).toBe(expectedMessage);
    });
  });
});
