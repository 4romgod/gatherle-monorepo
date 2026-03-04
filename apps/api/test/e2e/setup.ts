import { config } from 'dotenv';
import { resolve } from 'path';

// Load the API .env so GRAPHQL_URL is available in the globalSetup process
config({ path: resolve(__dirname, '../../.env') });

/**
 * Lightweight GraphQL query used to trigger Lambda cold starts before tests run.
 * Uses `__typename` so it doesn't require authentication or real data.
 */
const WARMUP_QUERY = JSON.stringify({ query: '{ __typename }' });

/**
 * Fire `count` concurrent POST requests to the GraphQL endpoint.
 * Each concurrent request provisions a separate Lambda execution environment,
 * so the test workers that start right after will hit warm containers.
 */
const warmUpLambda = async (url: string, count: number): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  const warmUpOne = async (i: number): Promise<void> => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: WARMUP_QUERY,
        signal: controller.signal,
      });

      // Always consume the body so the underlying connection is released back
      // to the pool. Leaving it unread holds the socket open and can cause
      // open-handle warnings or flaky Jest shutdowns.
      await res.arrayBuffer();

      if (res.ok) {
        console.log(`  ✓ warm-up ${i + 1}/${count} → ${res.status}`);
      } else {
        console.warn(`  ✗ warm-up ${i + 1}/${count} → unexpected status ${res.status}`);
      }
    } catch (err) {
      console.warn(`  ✗ warm-up ${i + 1}/${count} failed: ${(err as Error).message}`);
    }
  };

  try {
    await Promise.all(Array.from({ length: count }, (_, i) => warmUpOne(i)));
  } finally {
    clearTimeout(timeout);
  }
};

const setup = async () => {
  console.log('\nSetting up e2e tests...');

  const graphqlUrl = process.env.GRAPHQL_URL;

  if (!graphqlUrl) {
    throw new Error(
      'GRAPHQL_URL environment variable is required to run e2e tests. ' +
        'For local dev, start the server with `npm run dev:api` then set GRAPHQL_URL=http://localhost:9000/v1/graphql.',
    );
  }

  const isRemote = !new URL(graphqlUrl).hostname.includes('localhost');

  if (isRemote) {
    // Warm up Lambda containers before Jest workers start their beforeAll hooks.
    // 5 concurrent requests provisions 5 execution environments, preventing the
    // thundering-herd cold-start problem that causes flaky first-run failures.
    const concurrency = 5;
    console.log(`Warming up ${concurrency} Lambda containers at ${graphqlUrl}...`);
    await warmUpLambda(graphqlUrl, concurrency);
    console.log('Lambda warm-up complete.');
  }

  console.log('Done setting up e2e tests...');
};

export default setup;
