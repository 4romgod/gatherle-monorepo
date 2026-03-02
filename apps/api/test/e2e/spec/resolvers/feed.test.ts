import request from 'supertest';
import type { E2EServer } from '@/test/e2e/utils/server';
import { startE2EServer, stopE2EServer } from '@/test/e2e/utils/server';
import { eventsMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
import { EventLifecycleStatus, EventStatus, EventVisibility } from '@gatherle/commons/types';
import {
  getDeleteEventByIdMutation,
  getReadRecommendedFeedQuery,
  getRefreshFeedMutation,
  getUpsertEventParticipantMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import { createEventOnServer } from '@/test/e2e/utils/eventResolverHelpers';

const TEST_PORT = 5011;

describe('Feed resolver e2e', () => {
  let server: E2EServer;
  let url = '';
  let actorUser: UserWithToken;
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    server = await startE2EServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    actorUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);

    const category = await readFirstEventCategory(url);
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...baseEventData } = eventsMockData[0];

    const eventInput: CreateEventInput = {
      ...baseEventData,
      title: `Feed Test Event ${Date.now()}`,
      description: 'An event for feed testing',
      eventCategories: [category.eventCategoryId],
      organizers: [{ user: actorUser.userId, role: 'Host' }],
      status: EventStatus.Upcoming,
      lifecycleStatus: EventLifecycleStatus.Published,
      visibility: EventVisibility.Public,
      location: baseEventData.location,
      recurrenceRule: baseEventData.recurrenceRule,
    };

    await createEventOnServer(url, actorUser.token, eventInput, createdEventIds);
  });

  afterAll(async () => {
    await Promise.all(
      createdEventIds.map((id) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + actorUser.token)
          .send(getDeleteEventByIdMutation(id))
          .catch(() => {}),
      ),
    );

    if (server) {
      await stopE2EServer(server);
    }
  });

  describe('readRecommendedFeed', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(url).post('').send(getReadRecommendedFeedQuery());

      expect(response.status).toBe(401);
    });

    it('returns an array for an authenticated user', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery());

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.readRecommendedFeed)).toBe(true);
    });

    it('respects the limit parameter', async () => {
      const limit = 1;
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery(limit));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.readRecommendedFeed.length).toBeLessThanOrEqual(limit);
    });

    it('returns feed items with expected shape when the feed is populated', async () => {
      // First refresh to ensure feed is computed
      await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getRefreshFeedMutation());

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery());

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
      const firstPage = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery(10, 0));

      const secondPage = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery(10, 1));

      expect(firstPage.status).toBe(200);
      expect(secondPage.status).toBe(200);
      expect(firstPage.body.errors).toBeUndefined();
      expect(secondPage.body.errors).toBeUndefined();

      const first: unknown[] = firstPage.body.data.readRecommendedFeed;
      const second: unknown[] = secondPage.body.data.readRecommendedFeed;

      // Second page should have at most (first.length - 1) items (or be empty)
      expect(second.length).toBeLessThanOrEqual(Math.max(0, first.length - 1));
    });
  });

  describe('refreshFeed', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(url).post('').send(getRefreshFeedMutation());

      expect(response.status).toBe(401);
    });

    it('returns true for an authenticated user', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getRefreshFeedMutation());

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.refreshFeed).toBe(true);
    });

    it('subsequent readRecommendedFeed after refreshFeed returns an array', async () => {
      const refreshResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getRefreshFeedMutation());

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.refreshFeed).toBe(true);

      const feedResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery());

      expect(feedResponse.status).toBe(200);
      expect(feedResponse.body.errors).toBeUndefined();
      expect(Array.isArray(feedResponse.body.data.readRecommendedFeed)).toBe(true);
    });
  });

  describe('feed integration with event participation', () => {
    it('RSVP to an event triggers a feed recomputation without error', async () => {
      const eventId = createdEventIds[0];
      if (!eventId) {
        return;
      }

      const rsvpResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(
          getUpsertEventParticipantMutation({
            userId: actorUser.userId,
            eventId,
            status: 'Going',
          }),
        );

      expect(rsvpResponse.status).toBe(200);
      expect(rsvpResponse.body.errors).toBeUndefined();

      // After RSVP, feed query should still be valid (recomputation happens async)
      const feedResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actorUser.token)
        .send(getReadRecommendedFeedQuery());

      expect(feedResponse.status).toBe(200);
      expect(feedResponse.body.errors).toBeUndefined();
      expect(Array.isArray(feedResponse.body.data.readRecommendedFeed)).toBe(true);
    });
  });
});
