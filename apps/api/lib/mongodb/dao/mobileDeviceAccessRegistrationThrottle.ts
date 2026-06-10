import { GraphQLError } from 'graphql';
import MobileDeviceAccessRegistrationThrottleModel from '@/mongodb/models/mobileDeviceAccessRegistrationThrottle';
import { CustomError, ErrorTypes, KnownCommonError, logDaoError } from '@/utils';

const REGISTRATION_THROTTLE_TTL_MS_FLOOR = 5 * 60 * 1000;
const DUPLICATE_KEY_ERROR_CODES = new Set([11000, 11001]);

export interface MobileDeviceAccessRegistrationRateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const isThrottleError = (error: unknown): boolean =>
  error instanceof GraphQLError && ((error.extensions?.http as { status?: number } | undefined)?.status ?? 0) === 429;

const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: number }).code;
  return typeof code === 'number' && DUPLICATE_KEY_ERROR_CODES.has(code);
};

const buildThrottleError = (
  scopeKey: string,
  retryAfterSeconds: number,
  config: MobileDeviceAccessRegistrationRateLimitConfig,
) =>
  CustomError('Too many device access checks. Please wait before retrying.', ErrorTypes.BAD_REQUEST, {
    http: { status: 429 },
    maxRequests: config.maxRequests,
    retryAfterSeconds,
    scopeKey,
    windowSeconds: Math.ceil(config.windowMs / 1000),
  });

const buildExpiry = (now: Date, windowMs: number): Date =>
  new Date(now.getTime() + Math.max(windowMs * 2, REGISTRATION_THROTTLE_TTL_MS_FLOOR));

class MobileDeviceAccessRegistrationThrottleDAO {
  static buildDeviceInstallationScopeKey(deviceInstallationId: string): string {
    return `installation:${deviceInstallationId.trim()}`;
  }

  static buildIpScopeKey(ipAddress: string): string {
    return `ip:${ipAddress.trim()}`;
  }

  private static async upsertThrottleRecord(
    scopeKey: string,
    config: MobileDeviceAccessRegistrationRateLimitConfig,
    now: Date,
    allowDuplicateRetry = true,
  ) {
    const windowExpiryCutoff = new Date(now.getTime() - config.windowMs);
    const expiresAt = buildExpiry(now, config.windowMs);

    try {
      const updatedRecord =
        (await MobileDeviceAccessRegistrationThrottleModel.findOneAndUpdate(
          {
            scopeKey,
            windowStartedAt: { $gte: windowExpiryCutoff },
          },
          {
            $inc: { attemptCount: 1 },
            $set: { expiresAt },
          },
          { new: true, lean: true },
        ).exec()) ??
        (await MobileDeviceAccessRegistrationThrottleModel.findOneAndUpdate(
          {
            scopeKey,
            $or: [{ windowStartedAt: { $lt: windowExpiryCutoff } }, { windowStartedAt: { $exists: false } }],
          },
          {
            $set: {
              attemptCount: 1,
              expiresAt,
              scopeKey,
              windowStartedAt: now,
            },
          },
          { upsert: true, new: true, lean: true },
        ).exec());

      if (!updatedRecord) {
        throw new Error(`Failed to upsert mobile device registration throttle record for ${scopeKey}`);
      }

      return updatedRecord;
    } catch (error) {
      if (allowDuplicateRetry && isDuplicateKeyError(error)) {
        return this.upsertThrottleRecord(scopeKey, config, now, false);
      }

      throw error;
    }
  }

  static async assertAllowed(
    scopeKey: string,
    config: MobileDeviceAccessRegistrationRateLimitConfig,
    now = new Date(),
  ): Promise<void> {
    try {
      const record = await this.upsertThrottleRecord(scopeKey, config, now);
      if (!record.windowStartedAt || record.attemptCount <= config.maxRequests) {
        return;
      }

      const retryAt = new Date(record.windowStartedAt).getTime() + config.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now.getTime()) / 1000));
      throw buildThrottleError(scopeKey, retryAfterSeconds, config);
    } catch (error) {
      if (isThrottleError(error)) {
        throw error;
      }

      logDaoError('Error enforcing mobile device registration throttle', { config, error, scopeKey });
      throw KnownCommonError(error);
    }
  }
}

export default MobileDeviceAccessRegistrationThrottleDAO;
