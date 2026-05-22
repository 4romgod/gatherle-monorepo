import type { CreateUserInput, UserWithToken } from '@gatherle/commons/types';
import { UserRole } from '@gatherle/commons/types';
import { getCreateUserMutation, getDeleteUserByIdMutation, getLoginUserMutation } from '@/test/utils';
import { cleanupTrackedEntities, trackCreatedId } from './eventSeriesResolverHelpers';
import { generateToken } from '@/utils/auth';
import { JWT_SECRET } from '@/constants';

export const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const MAX_USER_HELPER_ATTEMPTS = 5;
const GRAPHQL_REQUEST_TIMEOUT_MS = 45_000;

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

const isRetryableRequestError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'object' && error !== null
        ? `${String((error as { name?: unknown }).name ?? '')}: ${String((error as { message?: unknown }).message ?? '')}`
        : String(error);

  return /(ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|timeout|aborted|AbortError)/i.test(message);
};

export type GraphQLTestResponse = {
  status: number;
  body: any;
};

export const postGraphQLWithRetry = async (
  url: string,
  payload: object,
  authToken?: string,
  maxAttempts: number = MAX_USER_HELPER_ATTEMPTS,
): Promise<GraphQLTestResponse> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GRAPHQL_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = (await response.json()) as any;
      const shouldRetry = attempt < maxAttempts && isRetryableFailure(response.status, body);

      if (shouldRetry) {
        await sleep(500 * attempt);
        continue;
      }

      return {
        status: response.status,
        body,
      };
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isRetryableRequestError(error);
      if (shouldRetry) {
        await sleep(500 * attempt);
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Failed to complete GraphQL request after retrying transient request errors.');
};

export const buildCreateUserInput = (
  template: CreateUserInput,
  password: string,
  suffix = uniqueSuffix(),
): CreateUserInput => ({
  ...template,
  email: `test-${suffix}@example.com`,
  username: `testUsername-${suffix}`,
  password,
});

const withE2eAuthToken = async (user: UserWithToken, input: CreateUserInput): Promise<UserWithToken> => {
  const token = await generateToken(
    {
      userId: user.userId,
      email: user.email,
      username: user.username,
      userRole: input.userRole ?? UserRole.User,
      isTestUser: true,
    },
    JWT_SECRET,
  );

  return { ...user, token };
};

const tryLoginExistingUser = async (
  url: string,
  input: CreateUserInput,
  createdUserIds: string[],
): Promise<UserWithToken | null> => {
  if (!input.email || !input.password) {
    return null;
  }

  try {
    const response = await postGraphQLWithRetry(
      url,
      getLoginUserMutation({ email: input.email, password: input.password }),
      undefined,
      1,
    );
    if (response.status === 200 && !response.body.errors && response.body.data?.loginUser?.userId) {
      const existingUser = response.body.data.loginUser as UserWithToken;
      trackCreatedId(createdUserIds, existingUser.userId);
      return existingUser;
    }
  } catch {
    // Ignore recovery failures and let the original create error surface.
  }

  return null;
};

export const createUserOnServer = async (
  url: string,
  input: CreateUserInput,
  createdUserIds: string[],
): Promise<UserWithToken> => {
  for (let attempt = 1; attempt <= MAX_USER_HELPER_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await postGraphQLWithRetry(url, getCreateUserMutation(input), undefined, 1);
    } catch (error) {
      const shouldRetry = attempt < MAX_USER_HELPER_ATTEMPTS && isRetryableRequestError(error);
      if (shouldRetry) {
        await sleep(500 * attempt);
        continue;
      }

      throw error;
    }

    if (response.status === 200 && !response.body.errors && response.body.data?.createUser?.userId) {
      const createdUser = response.body.data.createUser as UserWithToken;
      trackCreatedId(createdUserIds, createdUser.userId);
      return withE2eAuthToken(createdUser, input);
    }

    const failure = JSON.stringify(response.body.errors ?? response.body);
    const isConflict = response.status === 409 || /already exists/i.test(failure);
    if (isConflict) {
      const existingUser = await tryLoginExistingUser(url, input, createdUserIds);
      if (existingUser) {
        return existingUser;
      }
    }

    const shouldRetry = attempt < MAX_USER_HELPER_ATTEMPTS && isRetryableFailure(response.status, response.body);

    if (shouldRetry) {
      await sleep(500 * attempt);
      continue;
    }

    throw new Error(`Failed to create user: ${failure}`);
  }

  throw new Error('Failed to create user after retrying transient errors.');
};

export const loginUserOnServer = async (url: string, email: string, password: string): Promise<UserWithToken> => {
  for (let attempt = 1; attempt <= MAX_USER_HELPER_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await postGraphQLWithRetry(url, getLoginUserMutation({ email, password }), undefined, 1);
    } catch (error) {
      const shouldRetry = attempt < MAX_USER_HELPER_ATTEMPTS && isRetryableRequestError(error);
      if (shouldRetry) {
        await sleep(500 * attempt);
        continue;
      }

      throw error;
    }

    if (response.status === 200 && !response.body.errors && response.body.data?.loginUser?.token) {
      return response.body.data.loginUser as UserWithToken;
    }

    const failure = JSON.stringify(response.body.errors ?? response.body);
    const shouldRetry = attempt < MAX_USER_HELPER_ATTEMPTS && isRetryableFailure(response.status, response.body);

    if (shouldRetry) {
      await sleep(500 * attempt);
      continue;
    }

    throw new Error(`Failed to login user: ${failure}`);
  }

  throw new Error(`Failed to login user ${email} after retrying transient errors.`);
};

export const cleanupUsersById = async (url: string, adminToken: string, userIds: string[], phase?: string) =>
  cleanupTrackedEntities({
    url,
    ids: userIds,
    deleteRequest: getDeleteUserByIdMutation,
    token: adminToken,
    label: 'user',
    phase,
  });
