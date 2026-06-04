import request from 'supertest';
import {
  requireSystemUserPasswordFromEnv,
  testAdminSystemUser,
  testUserSystemUser,
  testUser2SystemUser,
} from '@/mongodb/data/system';
import type { UserWithToken } from '@gatherle/commons/server/types';
import type { UserRole } from '@gatherle/commons/server/types';
import { getLoginUserMutation, getReadEventCategoriesQuery } from '@/test/utils';
import { readRuntimeContext } from '../runtimeContext';

export type SeededUserCredentials = {
  email: string;
  password: string;
  userRole: UserRole;
  username: string;
};

export type SeededTestUsers = {
  admin: SeededUserCredentials;
  user: SeededUserCredentials;
  user2: SeededUserCredentials;
};

export type EventCategoryRef = {
  eventCategoryId: string;
  slug: string;
};

const MAX_HELPER_ATTEMPTS = 3;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const hasRetryableMessage = (value: unknown): boolean =>
  typeof value === 'string' && /(internal server error|timed out|timeout|temporarily unavailable)/i.test(value);

const isRetryableFailure = (status: number, body: unknown): boolean => {
  if (status === 429 || status >= 500) {
    return true;
  }

  if (!body || typeof body !== 'object') {
    return false;
  }

  const payload = body as {
    message?: unknown;
    errors?: Array<{ message?: unknown }>;
  };

  if (hasRetryableMessage(payload.message)) {
    return true;
  }

  return Array.isArray(payload.errors) && payload.errors.some((error) => hasRetryableMessage(error.message));
};

export const getSeededTestUsers = (): SeededTestUsers => ({
  admin: {
    email: testAdminSystemUser.email,
    password: requireSystemUserPasswordFromEnv(testAdminSystemUser),
    username: testAdminSystemUser.username!,
    userRole: testAdminSystemUser.userRole!,
  },
  user: {
    email: testUserSystemUser.email,
    password: requireSystemUserPasswordFromEnv(testUserSystemUser),
    username: testUserSystemUser.username!,
    userRole: testUserSystemUser.userRole!,
  },
  user2: {
    email: testUser2SystemUser.email,
    password: requireSystemUserPasswordFromEnv(testUser2SystemUser),
    username: testUser2SystemUser.username!,
    userRole: testUser2SystemUser.userRole!,
  },
});

export const loginSeededUser = async (url: string, email: string, password: string): Promise<UserWithToken> => {
  const runtimeContext = readRuntimeContext();
  const cachedUser = runtimeContext?.seededUsersByEmail[email];
  if (cachedUser) {
    return cachedUser;
  }

  for (let attempt = 1; attempt <= MAX_HELPER_ATTEMPTS; attempt++) {
    const response = await request(url)
      .post('')
      .timeout({ response: 15_000, deadline: 20_000 })
      .send(getLoginUserMutation({ email, password }));

    if (response.status === 200 && !response.body.errors && response.body.data?.loginUser?.token) {
      return response.body.data.loginUser as UserWithToken;
    }

    const failure = JSON.stringify(response.body.errors ?? response.body);
    const shouldRetry = attempt < MAX_HELPER_ATTEMPTS && isRetryableFailure(response.status, response.body);

    if (shouldRetry) {
      console.warn(
        `[loginSeededUser] transient failure for ${email} on attempt ${attempt}/${MAX_HELPER_ATTEMPTS}: ${failure}`,
      );
      await sleep(500 * attempt);
      continue;
    }

    throw new Error(`Failed to login seeded user ${email}: ${failure}`);
  }

  throw new Error(`Failed to login seeded user ${email} after retrying transient errors.`);
};

export const readFirstEventCategory = async (url: string): Promise<EventCategoryRef> => {
  const runtimeContext = readRuntimeContext();
  if (runtimeContext?.firstEventCategory?.eventCategoryId) {
    return runtimeContext.firstEventCategory;
  }

  for (let attempt = 1; attempt <= MAX_HELPER_ATTEMPTS; attempt++) {
    const categoriesResponse = await request(url)
      .post('')
      .timeout({ response: 15_000, deadline: 20_000 })
      .send(getReadEventCategoriesQuery());

    if (categoriesResponse.status === 200 && !categoriesResponse.body.errors) {
      const [firstCategory] = categoriesResponse.body.data?.readEventCategories ?? [];
      if (!firstCategory?.eventCategoryId) {
        throw new Error('No seeded event categories were found. Run the seed script before e2e tests.');
      }

      return {
        eventCategoryId: firstCategory.eventCategoryId,
        slug: firstCategory.slug,
      };
    }

    const failure = JSON.stringify(categoriesResponse.body.errors ?? categoriesResponse.body);
    const shouldRetry =
      attempt < MAX_HELPER_ATTEMPTS && isRetryableFailure(categoriesResponse.status, categoriesResponse.body);

    if (shouldRetry) {
      console.warn(
        `[readFirstEventCategory] transient failure on attempt ${attempt}/${MAX_HELPER_ATTEMPTS}: ${failure}`,
      );
      await sleep(500 * attempt);
      continue;
    }

    throw new Error(`Failed to read seeded event categories: ${failure}`);
  }

  throw new Error('Failed to read seeded event categories after retrying transient errors.');
};
