import type { ApolloError } from '@apollo/client';
import { getApolloAuthContext, getAuthHeader } from '@/lib/auth';
import { getApolloErrorCode, getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  toFieldErrors,
} from '@/lib/auth/validation';

describe('mobile auth helpers', () => {
  it('builds authorization headers only when a token exists', () => {
    expect(getAuthHeader(null)).toEqual({});
    expect(getAuthHeader(undefined)).toEqual({});
    expect(getAuthHeader('token-123')).toEqual({ Authorization: 'Bearer token-123' });
    expect(getApolloAuthContext('token-123')).toEqual({ context: { headers: { Authorization: 'Bearer token-123' } } });
  });

  it('validates login and forgot-password email formats', () => {
    expect(loginSchema.safeParse({ email: 'person@example.com', password: 'password1' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'bad-email', password: 'password1' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'person@example.com', password: 'short' }).success).toBe(false);

    expect(forgotPasswordSchema.safeParse({ email: 'person@example.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'person' }).success).toBe(false);
  });

  it('validates registration password strength and real YYYY-MM-DD dates', () => {
    const validInput = {
      birthdate: '1990-02-28',
      email: 'person@example.com',
      family_name: 'User',
      given_name: 'Test',
      password: 'Strong1!',
    };

    expect(registerSchema.safeParse(validInput).success).toBe(true);
    expect(registerSchema.safeParse({ ...validInput, birthdate: '1990-02-30' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, birthdate: '2026-99-99' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, birthdate: '02/28/1990' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'lowercase1!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'NOLOWERCASE1!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'NoNumber!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validInput, password: 'NoSpecial1' }).success).toBe(false);
  });

  it('validates reset-password confirmation and exposes field errors', () => {
    expect(resetPasswordSchema.safeParse({ password: 'Strong1!', confirmPassword: 'Strong1!' }).success).toBe(true);

    const result = resetPasswordSchema.safeParse({ password: 'Strong1!', confirmPassword: 'Different1!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).confirmPassword).toContain('Passwords do not match');
    }
  });

  it('extracts Apollo GraphQL and network error details', () => {
    const graphQLError = {
      graphQLErrors: [{ message: 'Not verified', extensions: { code: 'UNAUTHENTICATED' } }],
      message: 'GraphQL error',
    } as unknown as ApolloError;
    expect(getApolloErrorCode(graphQLError)).toBe('UNAUTHENTICATED');
    expect(getApolloErrorMessage(graphQLError)).toBe('Not verified');

    const networkError = {
      graphQLErrors: [],
      message: 'Network wrapper',
      networkError: {
        result: { errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }] },
      },
    } as unknown as ApolloError;
    expect(getApolloErrorCode(networkError)).toBe('FORBIDDEN');
    expect(getApolloErrorMessage(networkError)).toBe('Forbidden');

    const plainError = { graphQLErrors: [], message: 'Plain failure' } as unknown as ApolloError;
    expect(getApolloErrorCode(plainError)).toBeNull();
    expect(getApolloErrorMessage(plainError)).toBe('Plain failure');
  });
});
