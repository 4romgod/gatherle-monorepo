import { GraphQLError } from 'graphql';
import { AuthAttempt as AuthAttemptModel } from '@/mongodb/models';
import { emitAuthAbuseMetric } from '@/utils/authAbuseMetrics';
import { CustomError, ErrorTypes, KnownCommonError, logDaoError } from '@/utils';

const AUTH_FAILURE_WINDOW_MINUTES = 15;
const AUTH_LOCKOUT_MINUTES = 15;
const AUTH_FAILURE_TTL_HOURS = 24;
const MAX_FAILED_ATTEMPTS = 8;

const FAILURE_WINDOW_MS = AUTH_FAILURE_WINDOW_MINUTES * 60 * 1000;
const LOCKOUT_MS = AUTH_LOCKOUT_MINUTES * 60 * 1000;
const TTL_MS = AUTH_FAILURE_TTL_HOURS * 60 * 60 * 1000;

const isThrottleError = (error: unknown): boolean =>
  error instanceof GraphQLError && ((error.extensions?.http as { status?: number } | undefined)?.status ?? 0) === 429;

const buildThrottleError = (retryAfterSeconds: number): GraphQLError =>
  CustomError('Too many login attempts. Please wait before trying again.', ErrorTypes.BAD_REQUEST, {
    http: { status: 429 },
    retryAfterSeconds,
  });

const buildExpiry = (now: Date): Date => new Date(now.getTime() + TTL_MS);
const buildWindowExpiredExpression = (windowExpiryCutoff: Date) => ({
  $lt: [{ $ifNull: ['$windowStartedAt', new Date(0)] }, windowExpiryCutoff],
});
const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;

class AuthAttemptDAO {
  static buildEmailScopeKey(email: string): string {
    return `email:${email.trim().toLowerCase()}`;
  }

  static buildIpScopeKey(ipAddress: string): string {
    return `ip:${ipAddress.trim()}`;
  }

  static async assertAllowedForScopes(scopeKeys: string[], now = new Date()): Promise<void> {
    try {
      const attempts = await AuthAttemptModel.find({ scopeKey: { $in: scopeKeys } }).exec();
      const blockingAttempt = attempts.find(
        (attempt) => attempt.blockedUntil && attempt.blockedUntil.getTime() > now.getTime(),
      );

      if (!blockingAttempt?.blockedUntil) {
        return;
      }

      const retryAfterSeconds = Math.max(1, Math.ceil((blockingAttempt.blockedUntil.getTime() - now.getTime()) / 1000));
      emitAuthAbuseMetric('LoginLockout');
      throw buildThrottleError(retryAfterSeconds);
    } catch (error) {
      if (isThrottleError(error)) {
        throw error;
      }

      logDaoError('Error checking auth attempt lockout state', { error, scopeKeys });
      throw KnownCommonError(error);
    }
  }

  static async recordFailureForScopes(scopeKeys: string[], now = new Date()): Promise<void> {
    try {
      const windowExpiryCutoff = new Date(now.getTime() - FAILURE_WINDOW_MS);
      const blockedUntil = new Date(now.getTime() + LOCKOUT_MS);
      const expiresAt = buildExpiry(now);

      await Promise.all(
        scopeKeys.map((scopeKey) =>
          this.recordFailureForScope(scopeKey, now, windowExpiryCutoff, blockedUntil, expiresAt),
        ),
      );
    } catch (error) {
      logDaoError('Error recording auth failure attempt', { error, scopeKeys });
      throw KnownCommonError(error);
    }
  }

  private static async recordFailureForScope(
    scopeKey: string,
    now: Date,
    windowExpiryCutoff: Date,
    blockedUntil: Date,
    expiresAt: Date,
  ): Promise<void> {
    for (let retry = 0; retry < 2; retry += 1) {
      const windowExpiredExpression = buildWindowExpiredExpression(windowExpiryCutoff);

      try {
        const updatedAttempt = await AuthAttemptModel.findOneAndUpdate(
          { scopeKey },
          [
            {
              $set: {
                scopeKey,
                _windowExpired: windowExpiredExpression,
                _attemptBase: { $ifNull: ['$attemptCount', 0] },
                _windowStartedBase: { $ifNull: ['$windowStartedAt', now] },
              },
            },
            {
              $set: {
                attemptCount: {
                  $cond: ['$_windowExpired', 1, { $add: ['$_attemptBase', 1] }],
                },
                windowStartedAt: {
                  $cond: ['$_windowExpired', now, '$_windowStartedBase'],
                },
              },
            },
            {
              $set: {
                blockedUntil: {
                  $cond: [{ $gte: ['$attemptCount', MAX_FAILED_ATTEMPTS] }, blockedUntil, null],
                },
                expiresAt,
              },
            },
            {
              $unset: ['_windowExpired', '_attemptBase', '_windowStartedBase'],
            },
          ],
          { upsert: true, returnDocument: 'after', updatePipeline: true },
        ).exec();

        if (!updatedAttempt) {
          throw new Error(`Failed to update auth attempt record for ${scopeKey}`);
        }

        return;
      } catch (error) {
        if (retry === 0 && isDuplicateKeyError(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  static async clearScopes(scopeKeys: string[]): Promise<void> {
    try {
      await AuthAttemptModel.deleteMany({ scopeKey: { $in: scopeKeys } }).exec();
    } catch (error) {
      logDaoError('Error clearing auth attempt state', { error, scopeKeys });
      throw KnownCommonError(error);
    }
  }
}

export default AuthAttemptDAO;
