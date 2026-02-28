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

  try {
    const requests = Array.from({ length: count }, (_, i) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: WARMUP_QUERY,
        signal: controller.signal,
      })
        .then((res) => console.log(`  ✓ warm-up ${i + 1}/${count} → ${res.status}`))
        .catch((err) => console.warn(`  ✗ warm-up ${i + 1}/${count} failed: ${(err as Error).message}`)),
    );

    await Promise.all(requests);
  } finally {
    clearTimeout(timeout);
  }
};

const setup = async () => {
  console.log('\nSetting up e2e tests...');

  const graphqlUrl = process.env.GRAPHQL_URL;
  const isRemote = graphqlUrl && process.env.STAGE && process.env.STAGE !== 'Dev';

  if (isRemote) {
    // Warm up Lambda containers before Jest workers start their beforeAll hooks.
    // 5 concurrent requests provisions 5 execution environments, preventing the
    // thundering-herd cold-start problem that causes flaky first-run failures.
    const concurrency = 5;
    console.log(`Warming up ${concurrency} Lambda containers at ${graphqlUrl}...`);
    await warmUpLambda(graphqlUrl, concurrency);
    console.log('Lambda warm-up complete.');
  }

  console.log('Done setting up e2e tests!');
};

export default setup;
