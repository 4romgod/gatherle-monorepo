import { GraphQLError } from 'graphql';
import AuthAttemptDAO from '@/mongodb/dao/authAttempt';
import { AuthAttempt as AuthAttemptModel } from '@/mongodb/models';
import { logDaoError } from '@/utils';

jest.mock('@/mongodb/models', () => ({
  AuthAttempt: {
    find: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('@/utils', () => {
  const actual = jest.requireActual('@/utils');
  return {
    ...actual,
    logDaoError: jest.fn(),
  };
});

const createLeanQuery = <T>(value: T, shouldReject = false) => ({
  lean: jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value))),
});

const createExecQuery = <T>(value: T, shouldReject = false) => ({
  exec: jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value))),
});

const createAttemptDocument = (overrides: Record<string, unknown> = {}) => ({
  scopeKey: 'email:user@example.com',
  attemptCount: 1,
  windowStartedAt: new Date('2026-05-16T12:00:00.000Z'),
  blockedUntil: undefined,
  expiresAt: new Date('2026-05-17T12:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('AuthAttemptDAO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes email and ip scope keys', () => {
    expect(AuthAttemptDAO.buildEmailScopeKey('  USER@Example.com ')).toBe('email:user@example.com');
    expect(AuthAttemptDAO.buildIpScopeKey(' 203.0.113.1 ')).toBe('ip:203.0.113.1');
  });

  describe('assertAllowedForScopes', () => {
    it('allows login when there is no active block', async () => {
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(
        createLeanQuery([
          createAttemptDocument({
            blockedUntil: new Date('2026-05-16T11:59:00.000Z'),
          }),
        ]),
      );

      await expect(
        AuthAttemptDAO.assertAllowedForScopes(['email:user@example.com'], new Date('2026-05-16T12:00:00.000Z')),
      ).resolves.toBeUndefined();
    });

    it('throws a 429 GraphQLError when a scope is currently blocked', async () => {
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(
        createLeanQuery([
          createAttemptDocument({
            blockedUntil: new Date('2026-05-16T12:03:30.000Z'),
          }),
        ]),
      );

      await expect(
        AuthAttemptDAO.assertAllowedForScopes(['email:user@example.com'], new Date('2026-05-16T12:00:00.000Z')),
      ).rejects.toMatchObject({
        extensions: {
          code: 'BAD_REQUEST',
          http: { status: 429 },
          retryAfterSeconds: 210,
        },
      });
    });

    it('wraps unexpected lookup failures', async () => {
      const error = new Error('lookup failed');
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createLeanQuery(error, true));

      await expect(AuthAttemptDAO.assertAllowedForScopes(['email:user@example.com'])).rejects.toBeInstanceOf(
        GraphQLError,
      );
      expect(logDaoError).toHaveBeenCalledWith('Error checking auth attempt lockout state', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });

    it('does not treat non-429 GraphQLErrors as throttle errors', async () => {
      const error = new GraphQLError('validation failed', {
        extensions: {
          code: 'BAD_REQUEST',
          http: { status: 400 },
        },
      });
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createLeanQuery(error, true));

      await expect(AuthAttemptDAO.assertAllowedForScopes(['email:user@example.com'])).rejects.toBe(error);
      expect(logDaoError).toHaveBeenCalledWith('Error checking auth attempt lockout state', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });

    it('does not treat GraphQLErrors without an http status as throttle errors', async () => {
      const error = new GraphQLError('validation failed', {
        extensions: {
          code: 'BAD_REQUEST',
        },
      });
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createLeanQuery(error, true));

      await expect(AuthAttemptDAO.assertAllowedForScopes(['email:user@example.com'])).rejects.toBe(error);
      expect(logDaoError).toHaveBeenCalledWith('Error checking auth attempt lockout state', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });
  });

  describe('recordFailureForScopes', () => {
    it('creates new auth-attempt documents when scopes have no existing state', async () => {
      const now = new Date('2026-05-16T12:00:00.000Z');
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery([]));

      await AuthAttemptDAO.recordFailureForScopes(['email:user@example.com', 'ip:203.0.113.1'], now);

      expect(AuthAttemptModel.create).toHaveBeenCalledTimes(2);
      expect(AuthAttemptModel.create).toHaveBeenNthCalledWith(1, {
        scopeKey: 'email:user@example.com',
        attemptCount: 1,
        windowStartedAt: now,
        expiresAt: new Date('2026-05-17T12:00:00.000Z'),
      });
    });

    it('resets expired windows back to a single fresh failure', async () => {
      const now = new Date('2026-05-16T12:30:00.000Z');
      const attempt = createAttemptDocument({
        attemptCount: 5,
        blockedUntil: new Date('2026-05-16T12:10:00.000Z'),
        windowStartedAt: new Date('2026-05-16T12:00:00.000Z'),
      });
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery([attempt]));

      await AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'], now);

      expect(attempt.attemptCount).toBe(1);
      expect(attempt.windowStartedAt).toBe(now);
      expect(attempt.blockedUntil).toBeUndefined();
      expect(attempt.expiresAt).toEqual(new Date('2026-05-17T12:30:00.000Z'));
      expect(attempt.save).toHaveBeenCalled();
    });

    it('increments in-window failures without blocking before the threshold', async () => {
      const now = new Date('2026-05-16T12:10:00.000Z');
      const attempt = createAttemptDocument({
        attemptCount: 3,
        windowStartedAt: new Date('2026-05-16T12:00:00.000Z'),
      });
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery([attempt]));

      await AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'], now);

      expect(attempt.attemptCount).toBe(4);
      expect(attempt.blockedUntil).toBeUndefined();
      expect(attempt.save).toHaveBeenCalled();
    });

    it('sets a temporary block when the failure threshold is reached', async () => {
      const now = new Date('2026-05-16T12:10:00.000Z');
      const attempt = createAttemptDocument({
        attemptCount: 7,
        windowStartedAt: new Date('2026-05-16T12:00:00.000Z'),
      });
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery([attempt]));

      await AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'], now);

      expect(attempt.attemptCount).toBe(8);
      expect(attempt.blockedUntil).toEqual(new Date('2026-05-16T12:25:00.000Z'));
      expect(attempt.save).toHaveBeenCalled();
    });

    it('wraps unexpected persistence failures', async () => {
      const error = new Error('create failed');
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery([]));
      (AuthAttemptModel.create as jest.Mock).mockRejectedValue(error);

      await expect(AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'])).rejects.toBeInstanceOf(
        GraphQLError,
      );
      expect(logDaoError).toHaveBeenCalledWith('Error recording auth failure attempt', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });
  });

  describe('clearScopes', () => {
    it('deletes all matching scope records', async () => {
      (AuthAttemptModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });

      await AuthAttemptDAO.clearScopes(['email:user@example.com', 'ip:203.0.113.1']);

      expect(AuthAttemptModel.deleteMany).toHaveBeenCalledWith({
        scopeKey: { $in: ['email:user@example.com', 'ip:203.0.113.1'] },
      });
    });

    it('wraps unexpected deletion failures', async () => {
      const error = new Error('delete failed');
      (AuthAttemptModel.deleteMany as jest.Mock).mockRejectedValue(error);

      await expect(AuthAttemptDAO.clearScopes(['email:user@example.com'])).rejects.toBeInstanceOf(GraphQLError);
      expect(logDaoError).toHaveBeenCalledWith('Error clearing auth attempt state', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });
  });
});
