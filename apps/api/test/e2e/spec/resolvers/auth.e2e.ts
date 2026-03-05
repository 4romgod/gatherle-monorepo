import request from 'supertest';
import { usersMockData } from '@/mongodb/mockData';
import {
  getForgotPasswordMutation,
  getRequestEmailVerificationMutation,
  getResetPasswordMutation,
  getVerifyEmailMutation,
} from '@/test/utils';
import type { CreateUserInput, UserWithToken } from '@gatherle/commons/types';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

describe('Auth Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  const testPassword = 'testPassword';
  let adminToken: string;
  const createdUserIds: string[] = [];

  const newUserInput = (suffix = uniqueSuffix()): CreateUserInput =>
    buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, testPassword, suffix);

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    const admin: UserWithToken = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
    adminToken = admin.token;
  });

  afterEach(async () => {
    await cleanupUsersById(url, adminToken, createdUserIds);
    createdUserIds.length = 0;
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
  });
});
