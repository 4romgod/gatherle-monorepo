import { GraphQLError } from 'graphql';
import MobileDeviceAccessRegistrationThrottleDAO from '@/mongodb/dao/mobileDeviceAccessRegistrationThrottle';
import MobileDeviceAccessRegistrationThrottleModel from '@/mongodb/models/mobileDeviceAccessRegistrationThrottle';
import { logDaoError } from '@/utils';

jest.mock('@/mongodb/models/mobileDeviceAccessRegistrationThrottle', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('@/utils', () => {
  const actual = jest.requireActual('@/utils');
  return {
    ...actual,
    logDaoError: jest.fn(),
  };
});

const createExecQuery = <T>(value: T, shouldReject = false) => ({
  exec: jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value))),
});

describe('MobileDeviceAccessRegistrationThrottleDAO', () => {
  const modelMock = MobileDeviceAccessRegistrationThrottleModel as unknown as {
    findOneAndUpdate: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds stable scope keys for installations and IP addresses', () => {
    expect(MobileDeviceAccessRegistrationThrottleDAO.buildDeviceInstallationScopeKey(' install-1 ')).toBe(
      'installation:install-1',
    );
    expect(MobileDeviceAccessRegistrationThrottleDAO.buildIpScopeKey(' 203.0.113.4 ')).toBe('ip:203.0.113.4');
  });

  it('allows registration traffic while counters remain within budget', async () => {
    modelMock.findOneAndUpdate.mockReturnValue(
      createExecQuery({
        attemptCount: 8,
        scopeKey: 'installation:install-1',
        windowStartedAt: new Date('2026-06-09T09:50:00.000Z'),
      }),
    );

    await expect(
      MobileDeviceAccessRegistrationThrottleDAO.assertAllowed(
        'installation:install-1',
        { maxRequests: 24, windowMs: 15 * 60 * 1000 },
        new Date('2026-06-09T10:00:00.000Z'),
      ),
    ).resolves.toBeUndefined();
  });

  it('throws a 429 GraphQLError when registration exceeds its configured budget', async () => {
    modelMock.findOneAndUpdate.mockReturnValue(
      createExecQuery({
        attemptCount: 25,
        scopeKey: 'installation:install-1',
        windowStartedAt: new Date('2026-06-09T09:50:00.000Z'),
      }),
    );

    await expect(
      MobileDeviceAccessRegistrationThrottleDAO.assertAllowed(
        'installation:install-1',
        { maxRequests: 24, windowMs: 15 * 60 * 1000 },
        new Date('2026-06-09T10:00:00.000Z'),
      ),
    ).rejects.toMatchObject({
      extensions: {
        code: 'BAD_REQUEST',
        http: { status: 429 },
        maxRequests: 24,
        retryAfterSeconds: 300,
        scopeKey: 'installation:install-1',
        windowSeconds: 900,
      },
    });
  });

  it('retries once when the initial upsert loses a duplicate-key race', async () => {
    const duplicateKeyError = { code: 11000, message: 'E11000 duplicate key error' };
    modelMock.findOneAndUpdate
      .mockReturnValueOnce(createExecQuery(null))
      .mockReturnValueOnce(createExecQuery(duplicateKeyError, true))
      .mockReturnValueOnce(
        createExecQuery({
          attemptCount: 4,
          scopeKey: 'ip:203.0.113.4',
          windowStartedAt: new Date('2026-06-09T09:50:00.000Z'),
        }),
      );

    await expect(
      MobileDeviceAccessRegistrationThrottleDAO.assertAllowed(
        'ip:203.0.113.4',
        { maxRequests: 120, windowMs: 15 * 60 * 1000 },
        new Date('2026-06-09T10:00:00.000Z'),
      ),
    ).resolves.toBeUndefined();

    expect(modelMock.findOneAndUpdate).toHaveBeenCalledTimes(3);
    expect(logDaoError).not.toHaveBeenCalled();
  });

  it('wraps unexpected persistence failures', async () => {
    const error = new Error('mongo down');
    modelMock.findOneAndUpdate.mockReturnValue(createExecQuery(error, true));

    await expect(
      MobileDeviceAccessRegistrationThrottleDAO.assertAllowed('ip:203.0.113.4', {
        maxRequests: 120,
        windowMs: 15 * 60 * 1000,
      }),
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(logDaoError).toHaveBeenCalledWith('Error enforcing mobile device registration throttle', {
      config: {
        maxRequests: 120,
        windowMs: 15 * 60 * 1000,
      },
      error,
      scopeKey: 'ip:203.0.113.4',
    });
  });
});
