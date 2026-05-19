import { GraphQLError } from 'graphql';
import AuthAttemptDAO from '@/mongodb/dao/authAttempt';
import { AuthAttempt as AuthAttemptModel } from '@/mongodb/models';
import { emitAuthAbuseMetric } from '@/utils/authAbuseMetrics';
import { logDaoError } from '@/utils';

jest.mock('@/mongodb/models', () => ({
  AuthAttempt: {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
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

jest.mock('@/utils/authAbuseMetrics', () => ({
  emitAuthAbuseMetric: jest.fn(),
}));

const createLeanQuery = <T>(value: T, shouldReject = false) => ({
  lean: jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value))),
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
      expect(emitAuthAbuseMetric).toHaveBeenCalledWith('LoginLockout');
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
    it('uses atomic upserts when scopes have no existing state', async () => {
      const now = new Date('2026-05-16T12:00:00.000Z');
      (AuthAttemptModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await AuthAttemptDAO.recordFailureForScopes(['email:user@example.com', 'ip:203.0.113.1'], now);

      expect(AuthAttemptModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(AuthAttemptModel.findOneAndUpdate).toHaveBeenNthCalledWith(
        1,
        { scopeKey: 'email:user@example.com' },
        [
          {
            $set: expect.objectContaining({
              scopeKey: 'email:user@example.com',
              attemptCount: expect.any(Object),
              windowStartedAt: expect.any(Object),
              blockedUntil: expect.any(Object),
              expiresAt: new Date('2026-05-17T12:00:00.000Z'),
            }),
          },
        ],
        { upsert: true, new: true },
      );
    });

    it('wraps unexpected persistence failures', async () => {
      const error = new Error('upsert failed');
      (AuthAttemptModel.findOneAndUpdate as jest.Mock).mockRejectedValue(error);

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
