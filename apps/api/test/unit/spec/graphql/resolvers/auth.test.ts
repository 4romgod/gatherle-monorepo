import 'reflect-metadata';
import { AuthResolver } from '@/graphql/resolvers/auth';
import { EmailVerificationTokenDAO, PasswordResetTokenDAO, UserDAO } from '@/mongodb/dao';
import { EmailService } from '@/services';
import { validateInput } from '@/validation';
import { verifyExternalIdentityToken } from '@/utils';

// Keep the real validation module exports so transitive schema imports still work.
jest.mock('@/validation', () => {
  const actual = jest.requireActual('@/validation');
  return {
    ...actual,
    validateEmail: jest.fn().mockImplementation((email: string) => {
      if (!email || !email.includes('@') || !email.includes('.')) {
        const err: any = new Error('Invalid email format');
        err.extensions = { code: 'BAD_USER_INPUT' };
        throw err;
      }
      return true;
    }),
    validateInput: jest.fn(),
  };
});

jest.mock('@/constants', () => ({
  RESOLVER_DESCRIPTIONS: { USER: { requestEmailVerification: '', verifyEmail: '' } },
}));

jest.mock('@/mongodb/dao', () => ({
  UserDAO: {
    readUserByEmail: jest.fn(),
    setEmailVerified: jest.fn(),
    updatePassword: jest.fn(),
    loginWithOAuth: jest.fn(),
  },
  EmailVerificationTokenDAO: {
    create: jest.fn(),
    verify: jest.fn(),
    deleteByUserId: jest.fn(),
  },
  PasswordResetTokenDAO: {
    create: jest.fn(),
    verify: jest.fn(),
    deleteByUserId: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  verifyExternalIdentityToken: jest.fn(),
}));

jest.mock('@/services', () => ({
  EmailService: {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/exceptions', () => ({
  CustomError: jest.fn((message: string, type: string) => {
    const err: any = new Error(message);
    err.extensions = { code: type };
    return err;
  }),
  ErrorTypes: {
    BAD_USER_INPUT: 'BAD_USER_INPUT',
    NOT_FOUND: 'NOT_FOUND',
  },
}));

jest.mock('@/utils/logger', () => {
  enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
  }
  return {
    LogLevel,
    LOG_LEVEL_MAP: { debug: LogLevel.DEBUG, info: LogLevel.INFO, warn: LogLevel.WARN, error: LogLevel.ERROR },
    initLogger: jest.fn(),
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };
});

const mockUser = {
  userId: 'user-1',
  email: 'user@example.com',
  username: 'testuser',
  emailVerified: false,
};

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  beforeEach(() => {
    resolver = new AuthResolver();
    jest.clearAllMocks();
  });

  describe('requestEmailVerification', () => {
    it('returns true and sends an email for a registered, unverified user', async () => {
      (UserDAO.readUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (EmailVerificationTokenDAO.create as jest.Mock).mockResolvedValue('plainToken123');

      const result = await resolver.requestEmailVerification('user@example.com');

      expect(result).toBe(true);
      expect(EmailVerificationTokenDAO.create).toHaveBeenCalledWith(mockUser.userId);
      expect(EmailService.sendEmailVerification).toHaveBeenCalledWith('user@example.com', 'plainToken123');
    });

    it('returns true silently when the email is not registered (no info leakage)', async () => {
      (UserDAO.readUserByEmail as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await resolver.requestEmailVerification('unknown@example.com');

      expect(result).toBe(true);
      expect(EmailVerificationTokenDAO.create).not.toHaveBeenCalled();
      expect(EmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('returns true immediately when the user is already verified', async () => {
      (UserDAO.readUserByEmail as jest.Mock).mockResolvedValue({ ...mockUser, emailVerified: true });

      const result = await resolver.requestEmailVerification('user@example.com');

      expect(result).toBe(true);
      expect(EmailVerificationTokenDAO.create).not.toHaveBeenCalled();
      expect(EmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('throws BAD_USER_INPUT for a malformed email address', async () => {
      await expect(resolver.requestEmailVerification('not-an-email')).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });
  });

  describe('verifyEmail', () => {
    it('returns the updated user when the token is valid', async () => {
      const updatedUser = { ...mockUser, emailVerified: true };
      (EmailVerificationTokenDAO.verify as jest.Mock).mockResolvedValue(mockUser.userId);
      (UserDAO.setEmailVerified as jest.Mock).mockResolvedValue(updatedUser);
      (EmailVerificationTokenDAO.deleteByUserId as jest.Mock).mockResolvedValue(undefined);

      const result = await resolver.verifyEmail('valid-token');

      expect(EmailVerificationTokenDAO.verify).toHaveBeenCalledWith('valid-token');
      expect(UserDAO.setEmailVerified).toHaveBeenCalledWith(mockUser.userId);
      expect(EmailVerificationTokenDAO.deleteByUserId).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(updatedUser);
    });

    it('throws BAD_USER_INPUT for an empty token', async () => {
      await expect(resolver.verifyEmail('')).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(EmailVerificationTokenDAO.verify).not.toHaveBeenCalled();
    });

    it('throws BAD_USER_INPUT for a whitespace-only token', async () => {
      await expect(resolver.verifyEmail('   ')).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });

    it('propagates errors thrown by EmailVerificationTokenDAO.verify', async () => {
      const verifyError = new Error('Token invalid or expired');
      (EmailVerificationTokenDAO.verify as jest.Mock).mockRejectedValue(verifyError);

      await expect(resolver.verifyEmail('bad-token')).rejects.toThrow('Token invalid or expired');
      expect(UserDAO.setEmailVerified).not.toHaveBeenCalled();
    });

    it('cleans up the token even when setEmailVerified succeeds', async () => {
      const updatedUser = { ...mockUser, emailVerified: true };
      (EmailVerificationTokenDAO.verify as jest.Mock).mockResolvedValue(mockUser.userId);
      (UserDAO.setEmailVerified as jest.Mock).mockResolvedValue(updatedUser);
      (EmailVerificationTokenDAO.deleteByUserId as jest.Mock).mockResolvedValue(undefined);

      await resolver.verifyEmail('valid-token');

      expect(EmailVerificationTokenDAO.deleteByUserId).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('forgotPassword', () => {
    it('returns true and sends a reset email for a registered user', async () => {
      (UserDAO.readUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (PasswordResetTokenDAO.create as jest.Mock).mockResolvedValue('resetToken123');

      const result = await resolver.forgotPassword('user@example.com');

      expect(result).toBe(true);
      expect(PasswordResetTokenDAO.create).toHaveBeenCalledWith(mockUser.userId);
      expect(EmailService.sendPasswordReset).toHaveBeenCalledWith('user@example.com', 'resetToken123');
    });

    it('returns true silently when the email is not registered (no info leakage)', async () => {
      (UserDAO.readUserByEmail as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await resolver.forgotPassword('unknown@example.com');

      expect(result).toBe(true);
      expect(PasswordResetTokenDAO.create).not.toHaveBeenCalled();
      expect(EmailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('throws BAD_USER_INPUT for a malformed email address', async () => {
      await expect(resolver.forgotPassword('not-an-email')).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });
  });

  describe('resetPassword', () => {
    it('verifies the token, updates the password, deletes the token, and returns true', async () => {
      (PasswordResetTokenDAO.verify as jest.Mock).mockResolvedValue(mockUser.userId);
      (UserDAO.updatePassword as jest.Mock).mockResolvedValue(undefined);
      (PasswordResetTokenDAO.deleteByUserId as jest.Mock).mockResolvedValue(undefined);

      const result = await resolver.resetPassword('valid-token', 'newPassword123');

      expect(result).toBe(true);
      expect(PasswordResetTokenDAO.verify).toHaveBeenCalledWith('valid-token');
      expect(UserDAO.updatePassword).toHaveBeenCalledWith(mockUser.userId, 'newPassword123');
      expect(PasswordResetTokenDAO.deleteByUserId).toHaveBeenCalledWith(mockUser.userId);
    });

    it('throws BAD_USER_INPUT for an empty token', async () => {
      await expect(resolver.resetPassword('', 'newPassword123')).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(PasswordResetTokenDAO.verify).not.toHaveBeenCalled();
    });

    it('throws BAD_USER_INPUT for a whitespace-only token', async () => {
      await expect(resolver.resetPassword('   ', 'newPassword123')).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
    });

    it('throws BAD_USER_INPUT for a password shorter than 8 characters', async () => {
      await expect(resolver.resetPassword('valid-token', 'short')).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(PasswordResetTokenDAO.verify).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by PasswordResetTokenDAO.verify', async () => {
      const verifyError = new Error('Token invalid or expired');
      (PasswordResetTokenDAO.verify as jest.Mock).mockRejectedValue(verifyError);

      await expect(resolver.resetPassword('bad-token', 'newPassword123')).rejects.toThrow('Token invalid or expired');
      expect(UserDAO.updatePassword).not.toHaveBeenCalled();
    });

    it('cleans up the token after a successful password update', async () => {
      (PasswordResetTokenDAO.verify as jest.Mock).mockResolvedValue(mockUser.userId);
      (UserDAO.updatePassword as jest.Mock).mockResolvedValue(undefined);
      (PasswordResetTokenDAO.deleteByUserId as jest.Mock).mockResolvedValue(undefined);

      await resolver.resetPassword('valid-token', 'newPassword123');

      expect(PasswordResetTokenDAO.deleteByUserId).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('loginWithOAuth', () => {
    it('validates input, verifies the provider token, and returns the DAO response', async () => {
      const input = {
        provider: 'Google',
        idToken: 'valid-google-id-token',
        email: 'user@example.com',
      };
      const verifiedIdentity = {
        provider: 'Google',
        providerUserId: 'google-subject-1',
        email: 'user@example.com',
        emailVerified: true,
        givenName: 'Test',
        familyName: 'User',
      };
      const daoResponse = {
        userId: 'user-1',
        email: 'user@example.com',
        username: 'testuser',
        token: 'jwt-token',
      };

      (verifyExternalIdentityToken as jest.Mock).mockResolvedValue(verifiedIdentity);
      (UserDAO.loginWithOAuth as jest.Mock).mockResolvedValue(daoResponse);

      const result = await resolver.loginWithOAuth(input as any);

      expect(validateInput).toHaveBeenCalled();
      expect(verifyExternalIdentityToken).toHaveBeenCalledWith(input);
      expect(UserDAO.loginWithOAuth).toHaveBeenCalledWith(verifiedIdentity);
      expect(result).toEqual(daoResponse);
    });

    it('does not call the DAO when provider verification fails', async () => {
      const input = {
        provider: 'Google',
        idToken: 'bad-token',
      };
      const verifyError = new Error('Google identity token is invalid.');

      (verifyExternalIdentityToken as jest.Mock).mockRejectedValue(verifyError);

      await expect(resolver.loginWithOAuth(input as any)).rejects.toThrow('Google identity token is invalid.');
      expect(UserDAO.loginWithOAuth).not.toHaveBeenCalled();
    });
  });
});
