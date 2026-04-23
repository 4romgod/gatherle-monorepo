import {
  CreateUserInputSchema,
  UpdateUserInputSchema,
  LoginUserInputSchema,
  ForgotPasswordInputTypeSchema,
  ResetPasswordInputTypeSchema,
  passwordSchema,
} from '@/data/validation/auth';
import { Gender, UserRole } from '@/data/graphql/types/graphql';

describe('passwordSchema', () => {
  it('should accept a password meeting all complexity requirements', () => {
    const result = passwordSchema.safeParse('Secure@123');
    expect(result.success).toBe(true);
  });

  it('should reject a password shorter than 8 characters', () => {
    const result = passwordSchema.safeParse('Ab1!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters long');
    }
  });

  it('should reject a password with no lowercase letter', () => {
    const result = passwordSchema.safeParse('SECURE@123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'Password must contain at least one lowercase letter')).toBe(
        true,
      );
    }
  });

  it('should reject a password with no uppercase letter', () => {
    const result = passwordSchema.safeParse('secure@123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'Password must contain at least one uppercase letter')).toBe(
        true,
      );
    }
  });

  it('should reject a password with no number', () => {
    const result = passwordSchema.safeParse('Secure@abc');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'Password must contain at least one number')).toBe(true);
    }
  });

  it('should reject a password with no special character', () => {
    const result = passwordSchema.safeParse('Secure123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === 'Password must contain at least one special character'),
      ).toBe(true);
    }
  });

  it('should reject a typical weak password like 123456789', () => {
    const result = passwordSchema.safeParse('123456789');
    expect(result.success).toBe(false);
  });

  it('should reject a typical weak password like password123', () => {
    const result = passwordSchema.safeParse('password123');
    expect(result.success).toBe(false);
  });
});

describe('CreateUserInputSchema', () => {
  const validInput = {
    email: 'test@example.com',
    password: 'Secure@123',
    given_name: 'John',
    family_name: 'Doe',
    birthdate: '1990-01-15',
  };

  it('should accept valid input', () => {
    const result = CreateUserInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = CreateUserInputSchema.safeParse({
      ...validInput,
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email format');
    }
  });

  it('should reject password shorter than 8 characters', () => {
    const result = CreateUserInputSchema.safeParse({
      ...validInput,
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters long');
    }
  });

  it('should reject empty given_name', () => {
    const result = CreateUserInputSchema.safeParse({
      ...validInput,
      given_name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('First name is required');
    }
  });

  it('should reject empty family_name', () => {
    const result = CreateUserInputSchema.safeParse({
      ...validInput,
      family_name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Last name is required');
    }
  });

  it('should reject invalid birthdate format', () => {
    const result = CreateUserInputSchema.safeParse({
      ...validInput,
      birthdate: '15-01-1990', // Invalid format
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Birthdate should be in YYYY-MM-DD format');
    }
  });

  it('should accept optional fields as undefined', () => {
    const result = CreateUserInputSchema.safeParse({
      ...validInput,
      phone_number: undefined,
      profile_picture: undefined,
      username: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateUserInputSchema', () => {
  it('should accept valid update with only userId', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid partial update', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      given_name: 'Jane',
      bio: 'Hello world',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty userId', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('User ID is required');
    }
  });

  it('should reject username shorter than 3 characters', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      username: 'ab',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Username must be at least 3 characters');
    }
  });

  it('should reject bio longer than 500 characters', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      bio: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Bio cannot exceed 500 characters');
    }
  });

  it('should accept valid birthdate format', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      birthdate: '1990-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid birthdate format', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      birthdate: '31-12-1990',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Date must be in YYYY-MM-DD format');
    }
  });

  it('should reject invalid profile_picture URL', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      profile_picture: 'not-a-url',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Must be a valid URL');
    }
  });

  it('should accept valid profile_picture URL', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      profile_picture: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid gender enum', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      gender: Gender.Male,
    });
    expect(result.success).toBe(true);
  });

  it('should accept interests array', () => {
    const result = UpdateUserInputSchema.safeParse({
      userId: 'user-123',
      interests: ['music', 'sports', 'tech'],
    });
    expect(result.success).toBe(true);
  });
});

describe('LoginUserInputSchema', () => {
  it('should accept valid login input', () => {
    const result = LoginUserInputSchema.safeParse({
      email: 'test@example.com',
      password: 'password123', // Login only checks min(8) — does not enforce complexity
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = LoginUserInputSchema.safeParse({
      email: 'invalid',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email format');
    }
  });

  it('should reject short password', () => {
    const result = LoginUserInputSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password should be at least 8 characters long');
    }
  });
});

describe('ForgotPasswordInputTypeSchema', () => {
  it('should accept valid email', () => {
    const result = ForgotPasswordInputTypeSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = ForgotPasswordInputTypeSchema.safeParse({
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('ResetPasswordInputTypeSchema', () => {
  it('should accept valid matching passwords', () => {
    const result = ResetPasswordInputTypeSchema.safeParse({
      password: 'Secure@123',
      'confirm-password': 'Secure@123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a weak password', () => {
    const result = ResetPasswordInputTypeSchema.safeParse({
      password: 'password123',
      'confirm-password': 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const result = ResetPasswordInputTypeSchema.safeParse({
      password: 'short',
      'confirm-password': 'short',
    });
    expect(result.success).toBe(false);
  });

  // Note: Schema doesn't enforce password match - that would be done at form level
  it('should accept passwords even if they do not match (schema does not validate match)', () => {
    const result = ResetPasswordInputTypeSchema.safeParse({
      password: 'Secure@123',
      'confirm-password': 'Different@456',
    });
    // The schema only validates individual field requirements, not cross-field validation
    expect(result.success).toBe(true);
  });
});
