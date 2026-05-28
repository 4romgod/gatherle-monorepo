import { config } from 'dotenv';
import { resolve } from 'path';
import { APPLICATION_STAGES } from '@gatherle/commons';
import type { UserWithToken } from '@gatherle/commons/types';
import { API_E2E_REMOTE_WARMUP_REQUESTS } from './config';
import { getLoginUserMutation, getReadEventCategoriesQuery } from '@/test/utils';
import { getSeededTestUsers, type SeededUserCredentials } from './utils/helpers';
import { clearRuntimeContext, writeRuntimeContext } from './runtimeContext';
import { getConfigValue } from '@/clients';
import { JWT_SECRET, SECRET_KEYS } from '@/constants';
import { generateToken } from '@/utils/auth';

// Load the API .env so GRAPHQL_URL is available in the globalSetup process
config({ path: resolve(__dirname, '../../.env') });

const WARMUP_QUERY = JSON.stringify({ query: '{ __typename }' });

const assertUrlResponds = async (
  input: URL | string,
  init: RequestInit,
  failureLabel: string,
  timeoutMs: number,
): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${failureLabel} returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === 'object' && error !== null) {
    const name = String((error as { name?: unknown }).name ?? 'Error');
    const message = String((error as { message?: unknown }).message ?? error);
    return `${name}: ${message}`;
  }

  return String(error);
};

const hasRetryableMessage = (value: unknown): boolean =>
  typeof value === 'string' && /(internal server error|timed out|timeout|temporarily unavailable)/i.test(value);

const isRetryableSecretFetchError = (error: unknown): boolean =>
  /(timed out|timeout|ECONNRESET|socket hang up|fetch failed|AbortError|TooManyRequests|Throttl|ServiceUnavailable)/i.test(
    describeError(error),
  );

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

const postGraphQL = async (
  url: string,
  payload: object,
  timeoutMs: number = 20_000,
): Promise<{ status: number; body: any }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = (await response.json()) as any;
    return { status: response.status, body };
  } catch (error) {
    // Network/abort/timeout errors — return a retryable status so the caller's retry loop handles it
    const message = error instanceof Error ? error.message : String(error);
    return { status: 503, body: { message } };
  } finally {
    clearTimeout(timeout);
  }
};

const getReadSeededUserByUsernameQuery = (username: string) => ({
  query: `query ReadSeededUserByUsername($username: String!) {
    readUserByUsername(username: $username) {
      userId
      email
      username
    }
  }`,
  variables: { username },
});

const isLocalGraphqlUrl = (graphqlUrl: string): boolean => new URL(graphqlUrl).hostname.includes('localhost');

const resolveE2eJwtSecret = async (): Promise<string | undefined> => {
  if (JWT_SECRET?.trim()) {
    return JWT_SECRET.trim();
  }

  if (process.env.STAGE === APPLICATION_STAGES.DEV) {
    return undefined;
  }

  if (!process.env.SECRET_ARN?.trim() || !process.env.AWS_REGION?.trim()) {
    return undefined;
  }

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return (await getConfigValue(SECRET_KEYS.JWT_SECRET)).trim();
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isRetryableSecretFetchError(error);

      if (!shouldRetry) {
        throw error;
      }

      console.warn(
        `[setup] jwt secret fetch retry ${attempt}/${maxAttempts} after transient failure: ${describeError(error)}`,
      );
      await sleep(750 * attempt);
    }
  }

  return undefined;
};

const getRetryAfterSeconds = (body: unknown): number | undefined => {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const payload = body as {
    errors?: Array<{ extensions?: { retryAfterSeconds?: unknown } }>;
  };

  const retryAfterSeconds = payload.errors?.find((error) => typeof error.extensions?.retryAfterSeconds === 'number')
    ?.extensions?.retryAfterSeconds;

  return typeof retryAfterSeconds === 'number' ? retryAfterSeconds : undefined;
};

const canFallbackToLocalToken = (status: number, body: unknown): boolean => {
  if (status !== 429) {
    return false;
  }

  const payload = body as { errors?: Array<{ message?: unknown }> };
  return Array.isArray(payload.errors) && payload.errors.some((error) => `${error.message ?? ''}`.includes('Too many'));
};

const mintSeededUserToken = async (
  graphqlUrl: string,
  user: SeededUserCredentials,
  jwtSecret: string,
): Promise<UserWithToken> => {
  const response = await postGraphQL(graphqlUrl, getReadSeededUserByUsernameQuery(user.username), 20_000);
  const seededUser = response.body.data?.readUserByUsername;

  if (response.status !== 200 || response.body.errors || !seededUser?.userId) {
    throw new Error(
      `Failed to read seeded user ${user.email} for token minting: ${JSON.stringify(response.body.errors ?? response.body)}`,
    );
  }

  const token = await generateToken(
    {
      userId: seededUser.userId,
      email: user.email,
      username: user.username,
      userRole: user.userRole,
      isTestUser: true,
    },
    jwtSecret,
  );

  return {
    ...seededUser,
    email: user.email,
    username: user.username,
    userRole: user.userRole,
    token,
  } as UserWithToken;
};

const warmUpLambda = async (url: string, count: number): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  const warmUpOne = async (index: number): Promise<void> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: WARMUP_QUERY,
        signal: controller.signal,
      });

      await response.arrayBuffer();

      if (!response.ok) {
        console.warn(`  [warm-up ${index + 1}/${count}] unexpected status ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  [warm-up ${index + 1}/${count}] failed: ${message}`);
    }
  };

  try {
    await Promise.all(Array.from({ length: count }, (_, index) => warmUpOne(index)));
  } finally {
    clearTimeout(timeout);
  }
};

const assertServerReady = async (graphqlUrl: string): Promise<void> => {
  const graphQlEndpoint = new URL(graphqlUrl);
  const healthUrl = new URL(graphQlEndpoint);
  healthUrl.pathname = '/health';
  healthUrl.search = '';
  healthUrl.hash = '';

  const isLocal = graphQlEndpoint.hostname.includes('localhost');

  try {
    if (isLocal) {
      await assertUrlResponds(healthUrl, { method: 'GET' }, 'health check', 5_000);
      return;
    }

    const remoteAttempts = 3;

    for (let attempt = 1; attempt <= remoteAttempts; attempt++) {
      try {
        await assertUrlResponds(
          graphQlEndpoint,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ __typename }' }),
          },
          'GraphQL readiness check',
          15_000,
        );
        return;
      } catch (error) {
        if (attempt === remoteAttempts) {
          throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[setup] readiness probe attempt ${attempt}/${remoteAttempts} failed: ${message}`);
        await sleep(1_000 * attempt);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = isLocal
      ? 'Start it with `STAGE=Dev npm run dev:api` before running e2e tests.'
      : 'Ensure the deployed API is healthy and reachable before running e2e tests.';

    throw new Error(`API is not reachable at ${graphqlUrl}. ${hint} Original error: ${message}`);
  }
};

const primeRuntimeContext = async (graphqlUrl: string, jwtSecret?: string): Promise<void> => {
  const seededUsers = getSeededTestUsers();
  const usersByEmail = [seededUsers.admin, seededUsers.user, seededUsers.user2];
  const seededUsersByEmail: Record<string, UserWithToken> = {};
  const preferMintedSeededTokens = !isLocalGraphqlUrl(graphqlUrl) && Boolean(jwtSecret);

  for (const user of usersByEmail) {
    if (preferMintedSeededTokens && jwtSecret) {
      try {
        seededUsersByEmail[user.email] = await mintSeededUserToken(graphqlUrl, user, jwtSecret);
        continue;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[setup] direct seeded token mint failed for ${user.email}; falling back to login flow: ${message}`,
        );
      }
    }

    let lastFailure = '';

    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await postGraphQL(
        graphqlUrl,
        getLoginUserMutation({ email: user.email, password: user.password }),
        20_000,
      );

      if (response.status === 200 && !response.body.errors && response.body.data?.loginUser?.token) {
        seededUsersByEmail[user.email] = response.body.data.loginUser as UserWithToken;
        lastFailure = '';
        break;
      }

      lastFailure = JSON.stringify(response.body.errors ?? response.body);
      const retryAfterSeconds = getRetryAfterSeconds(response.body);
      if (canFallbackToLocalToken(response.status, response.body)) {
        if (jwtSecret) {
          try {
            console.warn(`[setup] seeded user ${user.email} is temporarily locked; minting local e2e token instead`);
            seededUsersByEmail[user.email] = await mintSeededUserToken(graphqlUrl, user, jwtSecret);
            lastFailure = '';
            break;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[setup] local token mint fallback failed for ${user.email}: ${message}`);
            lastFailure = `${lastFailure}; local token mint fallback failed: ${message}`;
          }
        } else {
          console.warn(
            `[setup] seeded user ${user.email} is temporarily locked, but local token mint fallback is not configured`,
          );
        }
      }

      if (retryAfterSeconds) {
        throw new Error(
          `Failed to prime seeded user ${user.email}: ${lastFailure}. Login is throttled for another ${retryAfterSeconds}s.`,
        );
      }

      const shouldRetry = attempt < 5 && isRetryableFailure(response.status, response.body);
      if (!shouldRetry) {
        throw new Error(`Failed to prime seeded user ${user.email}: ${lastFailure}`);
      }

      console.warn(`[setup] seeded login retry for ${user.email} attempt ${attempt}/5: ${lastFailure}`);
      await sleep(750 * attempt);
    }
  }

  let firstEventCategory:
    | {
        eventCategoryId: string;
        slug: string;
      }
    | undefined;

  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await postGraphQL(graphqlUrl, getReadEventCategoriesQuery(), 20_000);
    const [category] = response.body.data?.readEventCategories ?? [];

    if (response.status === 200 && !response.body.errors && category?.eventCategoryId) {
      firstEventCategory = {
        eventCategoryId: category.eventCategoryId,
        slug: category.slug,
      };
      break;
    }

    const failure = JSON.stringify(response.body.errors ?? response.body);
    const shouldRetry = attempt < 5 && isRetryableFailure(response.status, response.body);
    if (!shouldRetry) {
      throw new Error(`Failed to prime seeded event categories: ${failure}`);
    }

    console.warn(`[setup] seeded category retry attempt ${attempt}/5: ${failure}`);
    await sleep(750 * attempt);
  }

  if (!firstEventCategory) {
    throw new Error('Failed to prime seeded event categories.');
  }

  writeRuntimeContext({
    seededUsersByEmail,
    firstEventCategory,
    jwtSecret,
  });
};

const setup = async () => {
  console.log('\nSetting up e2e tests...');
  clearRuntimeContext();

  const graphqlUrl = process.env.GRAPHQL_URL;

  if (!graphqlUrl) {
    throw new Error(
      'GRAPHQL_URL environment variable is required to run e2e tests. ' +
        'For local dev, start the server with `npm run dev:api` then set GRAPHQL_URL=http://localhost:9000/v1/graphql.',
    );
  }

  await assertServerReady(graphqlUrl);

  if (!new URL(graphqlUrl).hostname.includes('localhost')) {
    console.log(`Warming up ${API_E2E_REMOTE_WARMUP_REQUESTS} Lambda containers at ${graphqlUrl}`);
    await warmUpLambda(graphqlUrl, API_E2E_REMOTE_WARMUP_REQUESTS);
  }

  const jwtSecret = await resolveE2eJwtSecret();
  await primeRuntimeContext(graphqlUrl, jwtSecret);

  console.log('Done setting up e2e tests...');
};

export default setup;
