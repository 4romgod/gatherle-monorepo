import 'reflect-metadata';
import { GraphQLError } from 'graphql';
import { UserResolver } from '@/graphql/resolvers/user';
import { AuthAttemptDAO, UserDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

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
  },
}));

jest.mock('@/services', () => ({
  EmailService: {
    sendEmailVerification: jest.fn(),
  },
  UserService: {},
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
    expect(logger.warn).toHaveBeenCalledWith('[UserResolver] Failed to record auth attempt after login failure', {
      scopeKeys: ['email:user@example.com', 'ip:203.0.113.10'],
      error: recordError,
    });
  });
});
