import { config } from 'dotenv';
import { resolve } from 'path';
import { testAdminSeedUser } from '../../lib/mongodb/mockData/index';
import { clearRuntimeContext } from './runtimeContext';

// Load the API .env so GRAPHQL_URL is available in the globalTeardown process
config({ path: resolve(__dirname, '../../.env') });

/**
 * Title prefixes used in e2e test events. Any event whose title starts with
 * one of these strings is assumed to be test data and safe to delete.
 */
const TEST_TITLE_PREFIXES = [
  'Test EventSeries Title',
  'Trending E2E Test EventSeries',
  'Feed Test EventSeries',
  'Cold Start E2E EventSeries',
];

type JsonBody = Record<string, unknown>;
type ReadEventsResult = Array<{ eventId: string; title: string }>;

const graphqlPost = async (url: string, body: JsonBody, token?: string): Promise<JsonBody> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json() as Promise<JsonBody>;
};

const teardown = async (): Promise<void> => {
  clearRuntimeContext();

  const graphqlUrl = process.env.GRAPHQL_URL;
  if (!graphqlUrl) {
    console.warn('[teardown] GRAPHQL_URL not set — skipping orphaned event cleanup');
    return;
  }

  const adminEmail = testAdminSeedUser.email;
  const adminPassword = testAdminSeedUser.password;
  if (!adminPassword) {
    console.warn('[teardown] testAdminSeedUser has no password — skipping orphaned event cleanup');
    return;
  }

  // Login as admin so we can delete any event regardless of ownership
  const loginBody = await graphqlPost(graphqlUrl, {
    query: `mutation LoginUser($input: LoginUserInput!) { loginUser(input: $input) { token } }`,
    variables: { input: { email: adminEmail, password: adminPassword } },
  });

  const adminToken = (loginBody as { data?: { loginUser?: { token: string } } }).data?.loginUser?.token;
  if (!adminToken) {
    console.warn('[teardown] Failed to login as admin — skipping orphaned event cleanup');
    return;
  }

  let totalDeleted = 0;

  for (const prefix of TEST_TITLE_PREFIXES) {
    const searchBody = await graphqlPost(
      graphqlUrl,
      {
        query: `query ReadEvents($options: EventsQueryOptionsInput!) {
          readEvents(options: $options) {
            eventId
            title
          }
        }`,
        variables: {
          options: {
            search: { fields: ['title'], value: prefix },
            pagination: { limit: 100 },
          },
        },
      },
      adminToken,
    );

    const events = (searchBody as { data?: { readEvents?: ReadEventsResult } }).data?.readEvents;
    const matchingEvents = events?.filter(({ title }) => title.startsWith(prefix)) ?? [];

    if (matchingEvents.length === 0) continue;

    console.log(`[teardown] Found ${matchingEvents.length} orphaned event(s) matching "${prefix}" — deleting...`);

    await Promise.all(
      matchingEvents.map(async ({ eventId, title }) => {
        const deleteBody = await graphqlPost(
          graphqlUrl,
          {
            query: `mutation DeleteEventById($eventId: String!) { deleteEventById(eventId: $eventId) { eventId } }`,
            variables: { eventId },
          },
          adminToken,
        );

        const errors = (deleteBody as { errors?: Array<{ message: string }> }).errors;
        if (errors && errors.length > 0) {
          console.warn(`[teardown] Failed to delete event ${eventId} ("${title}"): ${JSON.stringify(errors)}`);
        } else {
          totalDeleted++;
        }
      }),
    );
  }

  if (totalDeleted > 0) {
    console.log(`[teardown] Deleted ${totalDeleted} orphaned test event(s)`);
  } else {
    console.log('[teardown] No orphaned test events found');
  }
};

export default teardown;
