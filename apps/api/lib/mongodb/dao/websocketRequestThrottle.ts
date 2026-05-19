import { GraphQLError } from 'graphql';
import { WebSocketRequestThrottle as WebSocketRequestThrottleModel } from '@/mongodb/models';
import { CustomError, ErrorTypes, KnownCommonError, logDaoError } from '@/utils';

const WEBSOCKET_THROTTLE_TTL_MS_FLOOR = 5 * 60 * 1000;
const DUPLICATE_KEY_ERROR_CODES = new Set([11000, 11001]);

const isThrottleError = (error: unknown): boolean =>
  error instanceof GraphQLError && ((error.extensions?.http as { status?: number } | undefined)?.status ?? 0) === 429;

const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: number }).code;
  return typeof code === 'number' && DUPLICATE_KEY_ERROR_CODES.has(code);
};

const buildThrottleError = (routeKey: string, retryAfterSeconds: number, maxRequests: number, windowMs: number) =>
  CustomError(`Too many websocket requests for ${routeKey}. Please wait before retrying.`, ErrorTypes.BAD_REQUEST, {
    http: { status: 429 },
    retryAfterSeconds,
    maxRequests,
    windowSeconds: Math.ceil(windowMs / 1000),
  });

const buildExpiry = (now: Date, windowMs: number): Date =>
  new Date(now.getTime() + Math.max(windowMs * 2, WEBSOCKET_THROTTLE_TTL_MS_FLOOR));

export interface WebSocketRequestRateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class WebSocketRequestThrottleDAO {
  private static async upsertThrottleRecord(
    scopeKey: string,
    routeKey: string,
    config: WebSocketRequestRateLimitConfig,
    now: Date,
    allowDuplicateRetry = true,
  ) {
    const windowExpiryCutoff = new Date(now.getTime() - config.windowMs);
    const expiresAt = buildExpiry(now, config.windowMs);

    try {
      const updatedRecord =
        (await WebSocketRequestThrottleModel.findOneAndUpdate(
          {
            scopeKey,
            windowStartedAt: { $gte: windowExpiryCutoff },
          },
          {
            $inc: { attemptCount: 1 },
            $set: { routeKey, expiresAt },
          },
          { new: true, lean: true },
        ).exec()) ??
        (await WebSocketRequestThrottleModel.findOneAndUpdate(
          {
            scopeKey,
            $or: [{ windowStartedAt: { $lt: windowExpiryCutoff } }, { windowStartedAt: { $exists: false } }],
          },
          {
            $set: {
              scopeKey,
              routeKey,
              attemptCount: 1,
              windowStartedAt: now,
              expiresAt,
            },
          },
          { upsert: true, new: true, lean: true },
        ).exec());

      if (!updatedRecord) {
        throw new Error(`Failed to upsert websocket throttle record for ${scopeKey}`);
      }

      return updatedRecord;
    } catch (error) {
      if (allowDuplicateRetry && isDuplicateKeyError(error)) {
        return this.upsertThrottleRecord(scopeKey, routeKey, config, now, false);
      }

      throw error;
    }
  }

  static buildScopeKey(routeKey: string, scopeType: 'connection' | 'user', scopeValue: string): string {
    return `${routeKey}:${scopeType}:${scopeValue.trim()}`;
  }

  static async assertAllowed(
    routeKey: string,
    scopeKeys: string[],
    config: WebSocketRequestRateLimitConfig,
    now = new Date(),
  ): Promise<void> {
    try {
      const throttleRecords = await Promise.all(
        scopeKeys.map((scopeKey) => this.upsertThrottleRecord(scopeKey, routeKey, config, now)),
      );

      const violatingRecord = throttleRecords.find((record) => record.attemptCount > config.maxRequests);
      if (!violatingRecord?.windowStartedAt) {
        return;
      }

      const retryAt = violatingRecord.windowStartedAt.getTime() + config.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now.getTime()) / 1000));
      throw buildThrottleError(routeKey, retryAfterSeconds, config.maxRequests, config.windowMs);
    } catch (error) {
      if (isThrottleError(error)) {
        throw error;
      }

      logDaoError('Error enforcing websocket request throttle', { error, routeKey, scopeKeys });
      throw KnownCommonError(error);
    }
  }
}

export default WebSocketRequestThrottleDAO;
