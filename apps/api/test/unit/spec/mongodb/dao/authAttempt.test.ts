import { GraphQLError } from 'graphql';
import AuthAttemptDAO from '@/mongodb/dao/authAttempt';
import { AuthAttempt as AuthAttemptModel } from '@/mongodb/models';
import { emitAuthAbuseMetric } from '@/utils/authAbuseMetrics';
import { logDaoError } from '@/utils';

jest.mock('@/mongodb/models', () => ({
  AuthAttempt: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
  }),
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

const createAttemptDocument = (overrides: Record<string, unknown> = {}) => ({
  scopeKey: 'email:user@example.com',
  attemptCount: 1,
  windowStartedAt: new Date('2026-05-16T12:00:00.000Z'),
  blockedUntil: undefined,
  expiresAt: new Date('2026-05-17T12:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createExecQuery = <T>(value: T, shouldReject = false) => ({
  exec: jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value))),
});

const AuthAttemptModelMock = AuthAttemptModel as unknown as jest.Mock & {
  find: jest.Mock;
  findOneAndUpdate: jest.Mock;
  deleteMany: jest.Mock;
};

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
        createExecQuery([
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
        createExecQuery([
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
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery(error, true));

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
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery(error, true));

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
      (AuthAttemptModel.find as jest.Mock).mockReturnValue(createExecQuery(error, true));

      await expect(AuthAttemptDAO.assertAllowedForScopes(['email:user@example.com'])).rejects.toBe(error);
      expect(logDaoError).toHaveBeenCalledWith('Error checking auth attempt lockout state', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });
  });

  describe('recordFailureForScopes', () => {
    it('uses atomic upserts for each scope', async () => {
      const now = new Date('2026-05-16T12:00:00.000Z');
      AuthAttemptModelMock.findOneAndUpdate
        .mockReturnValueOnce(createExecQuery(createAttemptDocument({ scopeKey: 'email:user@example.com' })))
        .mockReturnValueOnce(createExecQuery(createAttemptDocument({ scopeKey: 'ip:203.0.113.1' })));

      await AuthAttemptDAO.recordFailureForScopes(['email:user@example.com', 'ip:203.0.113.1'], now);

      expect(AuthAttemptModelMock.findOneAndUpdate).toHaveBeenNthCalledWith(
        1,
        { scopeKey: 'email:user@example.com' },
        expect.any(Array),
        { upsert: true, returnDocument: 'after', updatePipeline: true },
      );
      expect(AuthAttemptModelMock.findOneAndUpdate).toHaveBeenNthCalledWith(
        2,
        { scopeKey: 'ip:203.0.113.1' },
        expect.any(Array),
        { upsert: true, returnDocument: 'after', updatePipeline: true },
      );
      const pipeline = AuthAttemptModelMock.findOneAndUpdate.mock.calls[0][1];
      expect(pipeline[0].$set.scopeKey).toBe('email:user@example.com');
      expect(pipeline[3].$unset).toEqual(['_windowExpired', '_attemptBase', '_windowStartedBase']);
    });

    it('retries once on duplicate key races', async () => {
      const now = new Date('2026-05-16T12:00:00.000Z');
      AuthAttemptModelMock.findOneAndUpdate
        .mockReturnValueOnce(createExecQuery({ code: 11000 }, true))
        .mockReturnValueOnce(createExecQuery(createAttemptDocument()));

      await expect(AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'], now)).resolves.toBeUndefined();
      expect(AuthAttemptModelMock.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });

    it('throws when findOneAndUpdate returns null (upsert acknowledgment missing)', async () => {
      AuthAttemptModelMock.findOneAndUpdate.mockReturnValue(createExecQuery(null));

      await expect(AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'])).rejects.toBeInstanceOf(
        GraphQLError,
      );
      expect(logDaoError).toHaveBeenCalledWith('Error recording auth failure attempt', {
        error: expect.objectContaining({ message: expect.stringContaining('Failed to update auth attempt record') }),
        scopeKeys: ['email:user@example.com'],
      });
    });

    it('wraps unexpected persistence failures', async () => {
      const error = new Error('upsert failed');
      AuthAttemptModelMock.findOneAndUpdate.mockReturnValue(createExecQuery(error, true));

      await expect(AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'])).rejects.toBeInstanceOf(
        GraphQLError,
      );
      expect(logDaoError).toHaveBeenCalledWith('Error recording auth failure attempt', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });

    it('sets blockedUntil once the failure threshold is reached', async () => {
      const now = new Date('2026-05-16T12:00:00.000Z');
      AuthAttemptModelMock.findOneAndUpdate.mockReturnValue(createExecQuery(createAttemptDocument()));

      await AuthAttemptDAO.recordFailureForScopes(['email:user@example.com'], now);

      const pipeline = AuthAttemptModelMock.findOneAndUpdate.mock.calls[0][1];
      expect(pipeline[2].$set.blockedUntil.$cond[0]).toEqual({ $gte: ['$attemptCount', 8] });
      expect(pipeline[2].$set.blockedUntil.$cond[1]).toEqual(new Date('2026-05-16T12:15:00.000Z'));
      expect(pipeline[2].$set.expiresAt).toEqual(new Date('2026-05-17T12:00:00.000Z'));
    });
  });

  describe('clearScopes', () => {
    it('deletes all matching scope records', async () => {
      (AuthAttemptModel.deleteMany as jest.Mock).mockReturnValue(createExecQuery({ deletedCount: 2 }));

      await AuthAttemptDAO.clearScopes(['email:user@example.com', 'ip:203.0.113.1']);

      expect(AuthAttemptModel.deleteMany).toHaveBeenCalledWith({
        scopeKey: { $in: ['email:user@example.com', 'ip:203.0.113.1'] },
      });
    });

    it('wraps unexpected deletion failures', async () => {
      const error = new Error('delete failed');
      (AuthAttemptModel.deleteMany as jest.Mock).mockReturnValue(createExecQuery(error, true));

      await expect(AuthAttemptDAO.clearScopes(['email:user@example.com'])).rejects.toBeInstanceOf(GraphQLError);
      expect(logDaoError).toHaveBeenCalledWith('Error clearing auth attempt state', {
        error,
        scopeKeys: ['email:user@example.com'],
      });
    });
  });
});
