import 'reflect-metadata';
import { GraphQLError } from 'graphql';
import { UserResolver } from '@/graphql/resolvers/user';
import { AuthAttemptDAO, EmailVerificationTokenDAO, UserDAO } from '@/mongodb/dao';
import { EmailService, UserService } from '@/services';
import { emitAuthAbuseMetric } from '@/utils/authAbuseMetrics';
import { logger } from '@/utils/logger';
import type { ServerContext } from '@/graphql';
import { UserRole } from '@gatherle/commons/server/types';

jest.mock('@/mongodb/dao', () => ({
  AuthAttemptDAO: {
    buildEmailScopeKey: jest.fn(),
    buildIpScopeKey: jest.fn(),
    assertAllowedForScopes: jest.fn(),
    clearScopes: jest.fn(),
    recordFailureForScopes: jest.fn(),
  },
  EmailVerificationTokenDAO: {
    create: jest.fn(),
  },
  FollowDAO: {
    countFollowers: jest.fn(),
  },
  UserDAO: {
    login: jest.fn(),
    readUserById: jest.fn(),
    updateUser: jest.fn(),
  },
}));

jest.mock('@/services', () => ({
  EmailService: {
    sendEmailVerification: jest.fn(),
  },
  UserService: {
    deleteById: jest.fn(),
    deleteByEmail: jest.fn(),
    deleteByUsername: jest.fn(),
  },
}));

jest.mock('@/utils/authAbuseMetrics', () => ({
  emitAuthAbuseMetric: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  initLogger: jest.fn(),
}));

const context = {
  req: {
    headers: {
      'x-forwarded-for': '203.0.113.10',
    },
  },
  loaders: {},
} as any;

describe('UserResolver login hardening', () => {
  let resolver: UserResolver;
  const validUserId = '507f1f77bcf86cd799439011';
  const ownerContext = {
    ...context,
    user: {
      userId: validUserId,
      userRole: 'User',
    },
  } as any;

  beforeEach(() => {
    resolver = new UserResolver();
    jest.clearAllMocks();
    (AuthAttemptDAO.buildEmailScopeKey as jest.Mock).mockReturnValue('email:user@example.com');
    (AuthAttemptDAO.buildIpScopeKey as jest.Mock).mockReturnValue('ip:203.0.113.10');
    (AuthAttemptDAO.assertAllowedForScopes as jest.Mock).mockResolvedValue(undefined);
  });

  it('does not fail a successful login when auth-attempt cleanup fails', async () => {
    const loggedInUser = {
      userId: 'user-1',
      email: 'user@example.com',
      token: 'jwt-token',
    };
    const cleanupError = new Error('cleanup failed');
    (UserDAO.login as jest.Mock).mockResolvedValue(loggedInUser);
    (AuthAttemptDAO.clearScopes as jest.Mock).mockRejectedValue(cleanupError);

    await expect(
      resolver.loginUser({ email: 'user@example.com', password: 'correct-password' } as any, context),
    ).resolves.toEqual(loggedInUser);

    expect(AuthAttemptDAO.assertAllowedForScopes).toHaveBeenCalledWith(['email:user@example.com', 'ip:203.0.113.10']);
    expect(logger.warn).toHaveBeenCalledWith(
      '[UserResolver] Failed to clear auth attempt state after successful login',
      {
        scopeKeys: ['email:user@example.com', 'ip:203.0.113.10'],
        error: cleanupError,
      },
    );
    expect(emitAuthAbuseMetric).not.toHaveBeenCalled();
  });

  it('preserves the original unauthenticated error when failure recording also fails', async () => {
    const authError = new GraphQLError('Email and Password do not match', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
    const recordError = new Error('record failed');
    (UserDAO.login as jest.Mock).mockRejectedValue(authError);
    (AuthAttemptDAO.recordFailureForScopes as jest.Mock).mockRejectedValue(recordError);

    await expect(
      resolver.loginUser({ email: 'user@example.com', password: 'wrong-password' } as any, context),
    ).rejects.toBe(authError);

    expect(AuthAttemptDAO.recordFailureForScopes).toHaveBeenCalledWith(['email:user@example.com', 'ip:203.0.113.10']);
    expect(emitAuthAbuseMetric).toHaveBeenCalledWith('LoginFailure');
    expect(logger.warn).toHaveBeenCalledWith('[UserResolver] Failed to record auth attempt after login failure', {
      scopeKeys: ['email:user@example.com', 'ip:203.0.113.10'],
      error: recordError,
    });
  });

  describe('hasLocalPassword field resolver', () => {
    it('returns the stored value when the field is present', () => {
      expect(
        resolver.hasLocalPassword(
          {
            userId: validUserId,
            hasLocalPassword: false,
          } as any,
          ownerContext,
        ),
      ).toBe(false);
    });

    it('defaults legacy users without the field to true', () => {
      expect(
        resolver.hasLocalPassword(
          {
            userId: validUserId,
            googleSubject: 'google-subject',
          } as any,
          ownerContext,
        ),
      ).toBe(true);
    });

    it('returns null for viewers who should not see sensitive account fields', () => {
      expect(
        resolver.hasLocalPassword(
          {
            userId: validUserId,
            hasLocalPassword: true,
          } as any,
          {
            ...context,
            user: {
              userId: 'different-user',
              userRole: 'User',
            },
          } as any,
        ),
      ).toBeNull();
    });
  });

  describe('updateUser email verification flow', () => {
    it('sends a verification email when the email address changes', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue({
        userId: validUserId,
        email: 'before@example.com',
      });
      (UserDAO.updateUser as jest.Mock).mockResolvedValue({
        userId: validUserId,
        email: 'after@example.com',
        username: 'updated-user',
      });
      (EmailVerificationTokenDAO.create as jest.Mock).mockResolvedValue('verification-token');
      (EmailService.sendEmailVerification as jest.Mock).mockResolvedValue(undefined);

      const result = await resolver.updateUser(
        {
          userId: validUserId,
          email: 'after@example.com',
        } as any,
        ownerContext,
      );

      expect(UserDAO.readUserById).toHaveBeenCalledWith(validUserId);
      expect(UserDAO.updateUser).toHaveBeenCalledWith(
        {
          userId: validUserId,
          email: 'after@example.com',
        },
        { allowAdminFields: false },
      );
      expect(EmailVerificationTokenDAO.create).toHaveBeenCalledWith(validUserId);
      expect(EmailService.sendEmailVerification).toHaveBeenCalledWith('after@example.com', 'verification-token');
      expect(result.email).toBe('after@example.com');
    });

    it('does not send a verification email when the email address is unchanged', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue({
        userId: validUserId,
        email: 'same@example.com',
      });
      (UserDAO.updateUser as jest.Mock).mockResolvedValue({
        userId: validUserId,
        email: 'same@example.com',
        username: 'same-user',
      });

      await resolver.updateUser(
        {
          userId: validUserId,
          email: 'same@example.com',
        } as any,
        ownerContext,
      );

      expect(EmailVerificationTokenDAO.create).not.toHaveBeenCalled();
      expect(EmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('does not read the existing user when the update does not include email', async () => {
      (UserDAO.updateUser as jest.Mock).mockResolvedValue({
        userId: validUserId,
        username: 'same-user',
      });

      await resolver.updateUser(
        {
          userId: validUserId,
          username: 'same-user',
        } as any,
        ownerContext,
      );

      expect(UserDAO.readUserById).not.toHaveBeenCalled();
      expect(EmailVerificationTokenDAO.create).not.toHaveBeenCalled();
      expect(EmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('rejects admin-only fields for non-admin users before calling the dao', async () => {
      await expect(
        resolver.updateUser(
          {
            userId: validUserId,
            appAccessBlocked: true,
          } as any,
          ownerContext,
        ),
      ).rejects.toMatchObject({
        extensions: {
          code: 'UNAUTHORIZED',
        },
      });

      expect(UserDAO.updateUser).not.toHaveBeenCalled();
    });

    it('allows admins to update admin-only fields', async () => {
      const adminContext = {
        ...context,
        user: {
          userId: 'admin-1',
          userRole: UserRole.Admin,
        },
      } as any;

      (UserDAO.updateUser as jest.Mock).mockResolvedValue({
        userId: validUserId,
        appAccessBlocked: true,
      });

      await resolver.updateUser(
        {
          userId: validUserId,
          appAccessBlocked: true,
        } as any,
        adminContext,
      );

      expect(UserDAO.updateUser).toHaveBeenCalledWith(
        {
          userId: validUserId,
          appAccessBlocked: true,
        },
        { allowAdminFields: true },
      );
    });
  });
});

describe('UserResolver delete mutations', () => {
  let resolver: UserResolver;

  const validUserId = '507f1f77bcf86cd799439011';

  const mockUser = {
    userId: validUserId,
    username: 'testuser',
    email: 'test@example.com',
    userRole: UserRole.User,
  };

  const mockContext = {
    user: { userId: 'admin-001', userRole: UserRole.Admin },
  } as unknown as ServerContext;

  beforeEach(() => {
    resolver = new UserResolver();
    jest.clearAllMocks();
  });

  describe('deleteUserById', () => {
    it('calls UserService.deleteById with actor context', async () => {
      (UserService.deleteById as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolver.deleteUserById(validUserId, mockContext);

      expect(UserService.deleteById).toHaveBeenCalledWith(validUserId, 'admin-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUserByEmail', () => {
    it('calls UserService.deleteByEmail with actor context', async () => {
      (UserService.deleteByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolver.deleteUserByEmail('test@example.com', mockContext);

      expect(UserService.deleteByEmail).toHaveBeenCalledWith(
        'test@example.com',
        'admin-001',
        UserRole.Admin,
        undefined,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUserByUsername', () => {
    it('calls UserService.deleteByUsername with actor context', async () => {
      (UserService.deleteByUsername as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolver.deleteUserByUsername('testuser', mockContext);

      expect(UserService.deleteByUsername).toHaveBeenCalledWith('testuser', 'admin-001', UserRole.Admin, undefined);
      expect(result).toEqual(mockUser);
    });
  });
});
