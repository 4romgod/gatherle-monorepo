import { GraphQLError } from 'graphql';
import { AuthAttempt as AuthAttemptModel } from '@/mongodb/models';
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

class AuthAttemptDAO {
  static buildEmailScopeKey(email: string): string {
    return `email:${email.trim().toLowerCase()}`;
  }

  static buildIpScopeKey(ipAddress: string): string {
    return `ip:${ipAddress.trim()}`;
  }

  static async assertAllowedForScopes(scopeKeys: string[], now = new Date()): Promise<void> {
    try {
      const attempts = await AuthAttemptModel.find({ scopeKey: { $in: scopeKeys } }).lean();
      const blockingAttempt = attempts.find(
        (attempt) => attempt.blockedUntil && attempt.blockedUntil.getTime() > now.getTime(),
      );

      if (!blockingAttempt?.blockedUntil) {
        return;
      }

      const retryAfterSeconds = Math.max(1, Math.ceil((blockingAttempt.blockedUntil.getTime() - now.getTime()) / 1000));
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

      await Promise.all(
        scopeKeys.map(async (scopeKey) => {
          const windowExpiredExpression = buildWindowExpiredExpression(windowExpiryCutoff);
          const nextAttemptCountExpression = {
            $cond: [windowExpiredExpression, 1, { $add: [{ $ifNull: ['$attemptCount', 0] }, 1] }],
          };

          await AuthAttemptModel.findOneAndUpdate(
            { scopeKey },
            [
              {
                $set: {
                  scopeKey,
                  attemptCount: nextAttemptCountExpression,
                  windowStartedAt: {
                    $cond: [windowExpiredExpression, now, { $ifNull: ['$windowStartedAt', now] }],
                  },
                  blockedUntil: {
                    $cond: [{ $gte: [nextAttemptCountExpression, MAX_FAILED_ATTEMPTS] }, blockedUntil, '$$REMOVE'],
                  },
                  expiresAt: buildExpiry(now),
                },
              },
            ],
            { upsert: true, new: true },
          );
        }),
      );
    } catch (error) {
      logDaoError('Error recording auth failure attempt', { error, scopeKeys });
      throw KnownCommonError(error);
    }
  }

  static async clearScopes(scopeKeys: string[]): Promise<void> {
    try {
      await AuthAttemptModel.deleteMany({ scopeKey: { $in: scopeKeys } });
    } catch (error) {
      logDaoError('Error clearing auth attempt state', { error, scopeKeys });
      throw KnownCommonError(error);
    }
  }
}

export default AuthAttemptDAO;
