import request from 'supertest';
import { usersMockData } from '@/mongodb/data/mock';
import {
  getForgotPasswordMutation,
  getLoginUserMutation,
  getRequestEmailVerificationMutation,
  getResetPasswordMutation,
  getUpdateUserMutation,
  getVerifyEmailMutation,
} from '@/test/utils';
import type { CreateUserInput, UserWithToken } from '@gatherle/commons/types';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';
import { assertNoCleanupFailures } from '@/test/e2e/utils/eventSeriesResolverHelpers';
import { ERROR_MESSAGES } from '@/validation';
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  postGraphQLWithRetry,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

describe('Auth Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  const testPassword = 'testPassword';
  let adminToken: string;
  const createdUserIds: string[] = [];

  const newUserInput = (suffix = uniqueSuffix()): CreateUserInput =>
    buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, testPassword, suffix);

  const nextForwardedIp = () => `auth-lockout-scope-${uniqueSuffix()}`;

  const attemptLogin = async (email: string, password: string, forwardedIp?: string) => {
    const requestBuilder = request(url).post('');
    if (forwardedIp) {
      requestBuilder.set('x-forwarded-for', forwardedIp);
    }

    return requestBuilder.send(getLoginUserMutation({ email, password }));
  };

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    const admin: UserWithToken = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
    adminToken = admin.token;
  });

  afterEach(async () => {
    await cleanupUsersById(url, adminToken, createdUserIds);
  });

  afterAll(async () => {
    const failures = await cleanupUsersById(url, adminToken, createdUserIds, 'afterAll');
    assertNoCleanupFailures(failures);
  });

  describe('requestEmailVerification', () => {
    it('returns true for a registered email', async () => {
      const input = newUserInput();
      const createdUser = await createUserOnServer(url, input, createdUserIds);

      const response = await request(url).post('').send(getRequestEmailVerificationMutation(createdUser.email));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.requestEmailVerification).toBe(true);
    });

    it('returns true silently for an unknown email (no info leakage)', async () => {
      const response = await request(url)
        .post('')
        .send(getRequestEmailVerificationMutation('unknown-nobody@example.com'));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.requestEmailVerification).toBe(true);
    });

    it('returns BAD_USER_INPUT for an invalid email format', async () => {
      const response = await request(url).post('').send(getRequestEmailVerificationMutation('not-an-email'));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });
  });

  // Happy path (token creation → verification) is covered by unit tests.
  // E2e tests verify the API contract for error cases only.
  describe('verifyEmail', () => {
    it('returns BAD_USER_INPUT for an invalid or expired token', async () => {
      const response = await request(url).post('').send(getVerifyEmailMutation('invalid-token-that-does-not-exist'));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('returns BAD_USER_INPUT for an empty token', async () => {
      const response = await request(url).post('').send(getVerifyEmailMutation(''));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('returns BAD_USER_INPUT for a whitespace-only token', async () => {
      const response = await request(url).post('').send(getVerifyEmailMutation('   '));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });
  });

  describe('forgotPassword', () => {
    it('returns true for a registered email', async () => {
      const input = newUserInput();
      const createdUser = await createUserOnServer(url, input, createdUserIds);

      const response = await request(url).post('').send(getForgotPasswordMutation(createdUser.email));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.forgotPassword).toBe(true);
    });

    it('returns true silently for an unknown email (no info leakage)', async () => {
      const response = await request(url).post('').send(getForgotPasswordMutation('unknown-nobody@example.com'));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.forgotPassword).toBe(true);
    });

    it('returns BAD_USER_INPUT for an invalid email format', async () => {
      const response = await request(url).post('').send(getForgotPasswordMutation('not-an-email'));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });
  });

  // Happy path (token creation → password reset) is covered by unit tests.
  // E2e tests verify the API contract for error cases only.
  describe('resetPassword', () => {
    it('returns BAD_USER_INPUT for an invalid or expired token', async () => {
      const response = await request(url)
        .post('')
        .send(getResetPasswordMutation('invalid-token-that-does-not-exist', 'newPassword123'));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('returns BAD_USER_INPUT for an empty token', async () => {
      const response = await request(url).post('').send(getResetPasswordMutation('', 'newPassword123'));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('returns BAD_USER_INPUT for a whitespace-only token', async () => {
      const response = await request(url).post('').send(getResetPasswordMutation('   ', 'newPassword123'));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('returns BAD_USER_INPUT for a password shorter than 8 characters', async () => {
      const response = await request(url).post('').send(getResetPasswordMutation('valid-token', 'short'));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });
  });

  describe('loginUser lockouts', () => {
    it('locks a login scope after repeated failures and rejects valid credentials during the active block', async () => {
      const input = newUserInput();
      const createdUser = await createUserOnServer(url, input, createdUserIds);
      const forwardedIp = nextForwardedIp();

      for (let attempt = 1; attempt <= 8; attempt++) {
        const response = await attemptLogin(createdUser.email, 'invalidPassword123', forwardedIp);

        expect(response.status).toBe(401);
        expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
        expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      }

      const lockedInvalidResponse = await attemptLogin(createdUser.email, 'invalidPassword123', forwardedIp);
      expect(lockedInvalidResponse.status).toBe(429);
      expect(lockedInvalidResponse.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      expect(lockedInvalidResponse.body.errors[0].message).toContain('Too many login attempts');
      expect(lockedInvalidResponse.body.errors[0].extensions.retryAfterSeconds).toEqual(expect.any(Number));
      expect(lockedInvalidResponse.body.errors[0].extensions.retryAfterSeconds).toBeGreaterThan(0);
      expect(lockedInvalidResponse.body.errors[0].extensions.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);

      const lockedValidResponse = await attemptLogin(createdUser.email, testPassword, forwardedIp);
      expect(lockedValidResponse.status).toBe(429);
      expect(lockedValidResponse.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      expect(lockedValidResponse.body.errors[0].message).toContain('Too many login attempts');
      expect(lockedValidResponse.body.errors[0].extensions.retryAfterSeconds).toEqual(expect.any(Number));
      expect(lockedValidResponse.body.errors[0].extensions.retryAfterSeconds).toBeGreaterThan(0);
      expect(lockedValidResponse.body.errors[0].extensions.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
    });

    it('clears prior failures after a successful login so the counter restarts from zero', async () => {
      const input = newUserInput();
      const loginSubject = await createUserOnServer(url, input, createdUserIds);
      const forwardedIp = nextForwardedIp();
      const verifyUserResponse = await postGraphQLWithRetry(
        url,
        getUpdateUserMutation({
          userId: loginSubject.userId,
          emailVerified: true,
        }),
        adminToken,
      );

      expect(verifyUserResponse.status).toBe(200);
      expect(verifyUserResponse.body.errors).toBeUndefined();
      expect(verifyUserResponse.body.data.updateUser.emailVerified).toBe(true);

      for (let attempt = 1; attempt <= 3; attempt++) {
        const failedResponse = await attemptLogin(loginSubject.email, 'invalidPassword123', forwardedIp);

        expect(failedResponse.status).toBe(401);
        expect(failedResponse.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      }

      const successResponse = await attemptLogin(loginSubject.email, input.password!, forwardedIp);
      expect(successResponse.status).toBe(200);
      expect(successResponse.body.errors).toBeUndefined();
      expect(successResponse.body.data.loginUser.email).toBe(loginSubject.email);
      expect(successResponse.body.data.loginUser.token).toBeTruthy();

      for (let attempt = 1; attempt <= 8; attempt++) {
        const failedResponse = await attemptLogin(loginSubject.email, 'invalidPassword123', forwardedIp);

        expect(failedResponse.status).toBe(401);
        expect(failedResponse.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
        expect(failedResponse.body.errors[0].message).toBe(ERROR_MESSAGES.PASSWORD_MISMATCH);
      }

      const finalSuccessResponse = await attemptLogin(loginSubject.email, input.password!, forwardedIp);
      expect(finalSuccessResponse.status).toBe(429);
      expect(finalSuccessResponse.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      expect(finalSuccessResponse.body.errors[0].message).toContain('Too many login attempts');
    });
  });
});
