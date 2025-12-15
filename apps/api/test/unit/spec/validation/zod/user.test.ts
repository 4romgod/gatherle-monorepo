import {
  UserSchema,
  CreateUserInputSchema,
  UpdateUserInputSchema,
  LoginUserInputSchema,
  ForgotPasswordInputTypeSchema,
  ResetPasswordInputTypeSchema,
  ERROR_MESSAGES,
} from '@/validation';
import {Gender} from '@ntlango/commons/types/user';
import mongoose from 'mongoose';

describe('User', () => {
  const mockID = new mongoose.Types.ObjectId().toString();
  const validDate = '2000-01-01';
  const validPhoneNumber = '+27764567890';

  const getValidUserInput = () => ({
    userId: mockID,
    address: {
      country: 'South Africa',
      city: 'Sandton',
    },
    birthdate: validDate,
    email: 'user@example.com',
    family_name: 'Doe',
    gender: Gender.Male,
    given_name: 'John',
    phone_number: validPhoneNumber,
    profile_picture: 'https://example.com/pic.jpg',
    username: 'johndoe',
  });

  describe('UserSchema', () => {
    it('should validate valid UserSchema', () => {
      const validInput = getValidUserInput();
      const {success} = UserSchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const {success, error} = UserSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should invalidate invalid email format', () => {
      const invalidInput = {
        ...getValidUserInput(),
        email: 'invalid-email',
      };
      const {success, error} = UserSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe(ERROR_MESSAGES.INVALID_EMAIL);
      }
    });

    it('should invalidate invalid phone number format', () => {
      const invalidInput = {
        ...getValidUserInput(),
        phone_number: 'invalid-phone',
      };
      const {success, error} = UserSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PHONE_NUMBER);
      }
    });
  });

  describe('CreateUserInputSchema', () => {
    it('should validate valid CreateUserInputSchema', () => {
      const validInput = {
        ...getValidUserInput(),
        password: 'securepassword123',
        userId: undefined,
      };
      const {success} = CreateUserInputSchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const {success, error} = CreateUserInputSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('UpdateUserInputSchema', () => {
    it('should validate valid UpdateUserInputSchema', () => {
      const validInput = {
        userId: mockID,
        given_name: 'Updated Name',
      };
      const {success} = UpdateUserInputSchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate invalid id format', () => {
      const invalidInput = {
        userId: 'invalid-id-format',
        given_name: 'Updated Name',
      };
      const {success, error} = UpdateUserInputSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe(`User with UserId ${ERROR_MESSAGES.DOES_NOT_EXIST}`);
      }
    });
  });

  describe('LoginUserInputSchema', () => {
    it('should validate valid LoginUserInputSchema', () => {
      const validInput = {
        email: 'user@example.com',
        password: 'securepassword123',
      };
      const {success} = LoginUserInputSchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const {success, error} = LoginUserInputSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should invalidate invalid email format', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'securepassword123',
      };
      const {success, error} = LoginUserInputSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe(ERROR_MESSAGES.INVALID_EMAIL);
      }
    });
  });

  describe('ForgotPasswordInputTypeSchema', () => {
    it('should validate valid ForgotPasswordInputTypeSchema', () => {
      const validInput = {
        email: 'user@example.com',
      };
      const {success} = ForgotPasswordInputTypeSchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const {success, error} = ForgotPasswordInputTypeSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should invalidate invalid email format', () => {
      const invalidInput = {
        email: 'invalid-email',
      };
      const {success, error} = ForgotPasswordInputTypeSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe(ERROR_MESSAGES.INVALID_EMAIL);
      }
    });
  });

  describe('ResetPasswordInputTypeSchema', () => {
    it('should validate valid ResetPasswordInputTypeSchema', () => {
      const validInput = {
        password: 'newsecurepassword123',
      };
      const {success} = ResetPasswordInputTypeSchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const {success, error} = ResetPasswordInputTypeSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should invalidate invalid password format', () => {
      const invalidInput = {
        password: 'short',
      };
      const {success, error} = ResetPasswordInputTypeSchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe(ERROR_MESSAGES.INVALID_PASSWORD);
      }
    });
  });
});
