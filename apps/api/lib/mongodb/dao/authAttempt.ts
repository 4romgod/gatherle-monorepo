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
      const attempts = await AuthAttemptModel.find({ scopeKey: { $in: scopeKeys } }).exec();
      const attemptsByScope = new Map(attempts.map((attempt) => [attempt.scopeKey, attempt]));

      await Promise.all(
        scopeKeys.map(async (scopeKey) => {
          const existing = attemptsByScope.get(scopeKey);

          if (!existing) {
            await AuthAttemptModel.create({
              scopeKey,
              attemptCount: 1,
              windowStartedAt: now,
              expiresAt: buildExpiry(now),
            });
            return;
          }

          const windowExpired = now.getTime() - existing.windowStartedAt.getTime() > FAILURE_WINDOW_MS;
          if (windowExpired) {
            existing.attemptCount = 1;
            existing.windowStartedAt = now;
            existing.blockedUntil = undefined;
            existing.expiresAt = buildExpiry(now);
            await existing.save();
            return;
          }

          existing.attemptCount += 1;
          existing.expiresAt = buildExpiry(now);

          if (existing.attemptCount >= MAX_FAILED_ATTEMPTS) {
            existing.blockedUntil = new Date(now.getTime() + LOCKOUT_MS);
          }

          await existing.save();
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
