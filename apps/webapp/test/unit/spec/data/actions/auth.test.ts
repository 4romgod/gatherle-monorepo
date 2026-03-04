jest.mock('@/data/graphql', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), action: jest.fn() },
}));

import { getClient } from '@/data/graphql';
import { forgotPasswordAction } from '@/data/actions/server/auth/forgot-password';
import { requestEmailVerificationAction, verifyEmailAction } from '@/data/actions/server/auth/verify-email';
import { resetPasswordAction } from '@/data/actions/server/auth/reset-password';

const mockMutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ mutate: mockMutate });
});

describe('forgotPasswordAction', () => {
  const makeFormData = (email: string) => {
    const fd = new FormData();
    fd.append('email', email);
    return fd;
  };

  it('returns zodErrors when the email is invalid', async () => {
    const result = await forgotPasswordAction({}, makeFormData('not-an-email'));
    expect(result.zodErrors).toBeDefined();
    expect(result.zodErrors!.email).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('returns { data: { sent: true } } on success', async () => {
    mockMutate.mockResolvedValue({ data: { forgotPassword: true } });
    const result = await forgotPasswordAction({}, makeFormData('user@example.com'));
    expect(result.data).toEqual({ sent: true });
    expect(result.apiError).toBeNull();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('returns apiError when the mutation throws a GraphQL error', async () => {
    const apolloError = Object.assign(new Error('User not found'), {
      graphQLErrors: [{ message: 'User not found', extensions: { code: 'NOT_FOUND' } }],
      networkError: null,
    });
    mockMutate.mockRejectedValue(apolloError);

    const result = await forgotPasswordAction({}, makeFormData('user@example.com'));

    expect(result.apiError).toBe('User not found');
    expect(result.data).toBeUndefined();
  });

  it('returns a fallback apiError when no message is extractable', async () => {
    const apolloError = Object.assign(new Error(''), {
      graphQLErrors: [],
      networkError: null,
    });
    mockMutate.mockRejectedValue(apolloError);

    const result = await forgotPasswordAction({}, makeFormData('user@example.com'));

    expect(result.apiError).toBeTruthy();
  });
});

describe('requestEmailVerificationAction', () => {
  const makeFormData = (email: string) => {
    const fd = new FormData();
    fd.append('email', email);
    return fd;
  };

  it('returns zodErrors when email is blank', async () => {
    const result = await requestEmailVerificationAction({}, makeFormData(''));
    expect(result.zodErrors?.email).toBeDefined();
    expect(result.apiError).toBeNull();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('returns zodErrors when email is invalid', async () => {
    const result = await requestEmailVerificationAction({}, makeFormData('not-an-email'));
    expect(result.zodErrors?.email).toBeDefined();
    expect(result.apiError).toBeNull();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('returns { data: { sent: true } } on success', async () => {
    mockMutate.mockResolvedValue({ data: { requestEmailVerification: true } });
    const result = await requestEmailVerificationAction({}, makeFormData('user@example.com'));
    expect(result.data).toEqual({ sent: true });
    expect(result.apiError).toBeNull();
  });

  it('returns apiError when the mutation throws', async () => {
    const apolloError = Object.assign(new Error('Server error'), {
      graphQLErrors: [{ message: 'Something went wrong', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
      networkError: null,
    });
    mockMutate.mockRejectedValue(apolloError);

    const result = await requestEmailVerificationAction({}, makeFormData('user@example.com'));
    expect(result.apiError).toBe('Something went wrong');
  });
});

describe('verifyEmailAction', () => {
  it('returns { success: false } when given an empty token', async () => {
    const result = await verifyEmailAction('');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('returns { success: true } on successful verification', async () => {
    mockMutate.mockResolvedValue({ data: { verifyEmail: { userId: 'u1', emailVerified: true } } });
    const result = await verifyEmailAction('valid-token');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('returns { success: false, error: message } when the mutation throws', async () => {
    mockMutate.mockRejectedValue(new Error('Token expired'));
    const result = await verifyEmailAction('expired-token');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('resetPasswordAction', () => {
  const makeFormData = (password: string, confirm: string) => {
    const fd = new FormData();
    fd.append('password', password);
    fd.append('confirm-password', confirm);
    return fd;
  };

  it('returns zodErrors when the password is too short', async () => {
    const result = await resetPasswordAction('valid-token', {}, makeFormData('short', 'short'));
    expect(result.zodErrors).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('returns apiError when the token is missing', async () => {
    const result = await resetPasswordAction('', {}, makeFormData('newPassword123', 'newPassword123'));
    expect(result.apiError).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('returns { data: { reset: true } } on success', async () => {
    mockMutate.mockResolvedValue({ data: { resetPassword: true } });
    const result = await resetPasswordAction('valid-token', {}, makeFormData('newPassword123', 'newPassword123'));
    expect(result.data).toEqual({ reset: true });
    expect(result.apiError).toBeNull();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('returns a user-friendly message when token is invalid (BAD_USER_INPUT)', async () => {
    const apolloError = Object.assign(new Error('Token invalid'), {
      graphQLErrors: [{ message: 'Token invalid or expired', extensions: { code: 'BAD_USER_INPUT' } }],
      networkError: null,
    });
    mockMutate.mockRejectedValue(apolloError);

    const result = await resetPasswordAction('bad-token', {}, makeFormData('newPassword123', 'newPassword123'));
    expect(result.apiError).toContain('invalid or has expired');
  });

  it('returns generic apiError for non-BAD_USER_INPUT errors', async () => {
    const apolloError = Object.assign(new Error('Internal error'), {
      graphQLErrors: [{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
      networkError: null,
    });
    mockMutate.mockRejectedValue(apolloError);

    const result = await resetPasswordAction('valid-token', {}, makeFormData('newPassword123', 'newPassword123'));
    expect(result.apiError).toBe('Internal server error');
  });
});
