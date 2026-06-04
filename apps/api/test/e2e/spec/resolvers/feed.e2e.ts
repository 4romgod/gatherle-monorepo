import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/data/mock';
import { usersMockData } from '@/mongodb/data/mock';
import type { CreateEventInput, CreateUserInput, UserWithToken } from '@gatherle/commons/server/types';
import { EventLifecycleStatus, EventStatus, EventVisibility } from '@gatherle/commons/server/types';
import {
  getDeleteEventByIdMutation,
  getReadEventParticipantsQuery,
  getReadRecommendedFeedQuery,
  getRefreshFeedMutation,
  getUpsertEventParticipantMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import {
  createEventOnServer,
  cleanupTrackedEntities,
  assertNoCleanupFailures,
} from '@/test/e2e/utils/eventSeriesResolverHelpers';
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

const FEED_RESOLVER_HOOK_TIMEOUT_MS = 180_000;

describe('Feed resolver e2e', () => {
  const url = process.env.GRAPHQL_URL!;
  let adminUser: UserWithToken;
  let actorUser: UserWithToken;
  let feedEventId = '';
  const createdEventIds: string[] = [];
  const createdUserIds: string[] = [];
  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const readRecommendedFeedWithRetry = async (limit?: number, skip?: number) => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await request(url)
        .post('')
        .timeout({ response: 30_000, deadline: 40_000 })
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery(limit, skip));

      if (response.status === 200 && !response.body.errors) {
        return response;
      }

      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < 5 && (response.status >= 500 || /internal server error|timed out|timeout/i.test(failure));

      if (!shouldRetry) {
        return response;
      }

      await sleep(750 * attempt);
    }

    throw new Error('Failed to read recommended feed after retrying transient errors.');
  };

  const refreshFeedWithRetry = async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await request(url)
        .post('')
        .timeout({ response: 30_000, deadline: 40_000 })
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getRefreshFeedMutation());

      if (response.status === 200 && !response.body.errors) {
        return response;
      }

      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < 5 && (response.status >= 500 || /internal server error|timed out|timeout/i.test(failure));

      if (!shouldRetry) {
        return response;
      }

      await sleep(750 * attempt);
    }

    throw new Error('Failed to refresh the feed after retrying transient errors.');
  };

  const waitForParticipantReadiness = async (eventId: string): Promise<void> => {
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await request(url)
        .post('')
        .timeout({ response: 30_000, deadline: 40_000 })
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadEventParticipantsQuery(eventId));

      if (response.status === 200 && !response.body.errors) {
        return;
      }

      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < maxAttempts &&
        (response.status === 404 ||
          response.status >= 500 ||
          /representative occurrence not found|timed out|timeout|temporarily unavailable/i.test(failure));

      if (!shouldRetry) {
        throw new Error(`Feed event ${eventId} is not participant-ready: ${failure}`);
      }

      await sleep(750 * attempt);
    }

    throw new Error(`Feed event ${eventId} did not become participant-ready in time.`);
  };

  const upsertParticipantWithRetry = async (eventId: string) => {
    await waitForParticipantReadiness(eventId);

    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await request(url)
        .post('')
        .timeout({ response: 30_000, deadline: 40_000 })
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(
          getUpsertEventParticipantMutation({
            userId: actorUser.userId,
            eventId,
            status: 'Going',
          }),
        );

      if (response.status === 200 && !response.body.errors) {
        return response;
      }

      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < 5 &&
        (response.status === 404 ||
          response.status >= 500 ||
          /internal server error|representative occurrence not found|timed out|timeout|temporarily unavailable/i.test(
            failure,
          ));

      if (!shouldRetry) {
        return response;
      }

      await sleep(750 * attempt);
    }

    throw new Error(`Failed to RSVP to feed event ${eventId} after retrying transient errors.`);
  };

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    const [admin, category] = await Promise.all([
      loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password),
      readFirstEventCategory(url),
    ]);
    adminUser = admin;
    actorUser = await createUserOnServer(
      url,
      buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, 'feed-test-password', uniqueSuffix()),
      createdUserIds,
    );
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, title: _seedTitle, ...baseEventData } = eventSeriesMockData[0];
    const eventSuffix = uniqueSuffix();

    const eventInput: CreateEventInput = {
      ...baseEventData,
      title: `Feed Test EventSeries ${eventSuffix}`,
      description: 'An event for feed testing',
      eventCategories: [category.eventCategoryId],
      organizers: [{ user: actorUser.userId, role: 'Host' }],
      status: EventStatus.Upcoming,
      lifecycleStatus: EventLifecycleStatus.Published,
      visibility: EventVisibility.Public,
      location: baseEventData.location,
    };

    const createdEvent = await createEventOnServer(url, actorUser.token, eventInput, createdEventIds);
    feedEventId = createdEvent.eventId;
  }, FEED_RESOLVER_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    const eventFailures = await cleanupTrackedEntities({
      url,
      ids: createdEventIds,
      deleteRequest: getDeleteEventByIdMutation,
      token: () => actorUser.token,
      label: 'event',
      phase: 'afterAll',
    });
    const userFailures =
      adminUser?.token && createdUserIds.length > 0
        ? await cleanupUsersById(url, adminUser.token, createdUserIds, 'afterAll')
        : [];
    assertNoCleanupFailures([...eventFailures, ...userFailures]);
  }, FEED_RESOLVER_HOOK_TIMEOUT_MS);

  describe('readRecommendedFeed', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(url).post('').send(getReadRecommendedFeedQuery());

      expect(response.status).toBe(401);
    });

    it('returns an array for an authenticated user', async () => {
      const response = await readRecommendedFeedWithRetry();

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.readRecommendedFeed)).toBe(true);
    });

    it('respects the limit parameter', async () => {
      const limit = 1;
      const response = await readRecommendedFeedWithRetry(limit);

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.readRecommendedFeed.length).toBeLessThanOrEqual(limit);
    });

    it('returns feed items with expected shape when the feed is populated', async () => {
      // First refresh to ensure feed is computed
      await refreshFeedWithRetry();

      const response = await readRecommendedFeedWithRetry();

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      const items: unknown[] = response.body.data.readRecommendedFeed;
      // Feed may be empty for a user with no social signals — just assert shape of items if present
      for (const item of items) {
        expect(item).toHaveProperty('feedItemId');
        expect(item).toHaveProperty('eventId');
        expect(item).toHaveProperty('score');
        expect(item).toHaveProperty('reasons');
        expect(item).toHaveProperty('computedAt');
      }
    });

    it('returns skip=0 and skip=1 with consistent results', async () => {
      const refreshResponse = await refreshFeedWithRetry();

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.errors).toBeUndefined();

      const firstPage = await readRecommendedFeedWithRetry(10, 0);
      const secondPage = await readRecommendedFeedWithRetry(10, 1);

      expect(firstPage.status).toBe(200);
      expect(secondPage.status).toBe(200);
      expect(firstPage.body.errors).toBeUndefined();
      expect(secondPage.body.errors).toBeUndefined();

      const first: unknown[] = firstPage.body.data.readRecommendedFeed;
      const second: unknown[] = secondPage.body.data.readRecommendedFeed;

      // skip=1 offsets by one item: second[0] should equal first[1]
      if (first.length >= 2 && second.length >= 1) {
        expect((second[0] as any).feedItemId).toBe((first[1] as any).feedItemId);
      } else {
        // Fewer than 2 items in the feed — second page (skip=1) must be empty
        expect(second.length).toBe(0);
      }
    });
  });

  describe('refreshFeed', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(url).post('').send(getRefreshFeedMutation());

      expect(response.status).toBe(401);
    });

    it('returns true for an authenticated user', async () => {
      const response = await refreshFeedWithRetry();

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.refreshFeed).toBe(true);
    });

    it('subsequent readRecommendedFeed after refreshFeed returns an array', async () => {
      const refreshResponse = await refreshFeedWithRetry();

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.refreshFeed).toBe(true);

      const feedResponse = await readRecommendedFeedWithRetry();

      expect(feedResponse.status).toBe(200);
      expect(feedResponse.body.errors).toBeUndefined();
      expect(Array.isArray(feedResponse.body.data.readRecommendedFeed)).toBe(true);
    });
  });

  describe('feed integration with event participation', () => {
    it('RSVP to an event triggers a feed recomputation without error', async () => {
      const eventId = feedEventId;
      if (!eventId) {
        return;
      }

      const rsvpResponse = await upsertParticipantWithRetry(eventId);

      expect(rsvpResponse.status).toBe(200);
      expect(rsvpResponse.body.errors).toBeUndefined();

      // After RSVP, feed query should still be valid (recomputation happens async)
      const feedResponse = await readRecommendedFeedWithRetry();

      expect(feedResponse.status).toBe(200);
      expect(feedResponse.body.errors).toBeUndefined();
      expect(Array.isArray(feedResponse.body.data.readRecommendedFeed)).toBe(true);
    });
  });
});
