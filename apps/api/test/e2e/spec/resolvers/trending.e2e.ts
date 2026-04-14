import request from 'supertest';
import { eventsMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
import { EventLifecycleStatus, EventStatus, EventVisibility } from '@gatherle/commons/types';
import {
  getDeleteEventByIdMutation,
  getReadTrendingEventsQuery,
  getRefreshFeedMutation,
  getReadRecommendedFeedQuery,
  getUpsertEventParticipantMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import { createEventOnServer } from '@/test/e2e/utils/eventResolverHelpers';

describe('readTrendingEvents e2e', () => {
  const url = process.env.GRAPHQL_URL!;
  let actorUser: UserWithToken;
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    actorUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);

    const category = await readFirstEventCategory(url);
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...baseEventData } = eventsMockData[0];

    // Create a Published, Public, Upcoming event to ensure at least one result
    const eventInput: CreateEventInput = {
      ...baseEventData,
      title: `Trending E2E Test Event ${Date.now()}`,
      description: 'A published public event for trending e2e tests',
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
  });

  it('returns 200 with an array for an unauthenticated request (public query)', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery());

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(Array.isArray(response.body.data.readTrendingEvents)).toBe(true);
  });

  it('returns 200 with an array for an authenticated request', async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getReadTrendingEventsQuery());

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(Array.isArray(response.body.data.readTrendingEvents)).toBe(true);
  });

  it('returns events with the expected shape', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery());

    expect(response.status).toBe(200);
    const events: unknown[] = response.body.data.readTrendingEvents;

    for (const event of events) {
      expect(event).toHaveProperty('eventId');
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('lifecycleStatus');
      expect(event).toHaveProperty('status');
      expect(event).toHaveProperty('visibility');
      expect(event).toHaveProperty('rsvpCount');
      expect(event).toHaveProperty('savedByCount');
    }
  });

  it('only returns Published events', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery());

    expect(response.status).toBe(200);
    const events: Array<{ lifecycleStatus: string }> = response.body.data.readTrendingEvents;

    for (const event of events) {
      expect(event.lifecycleStatus).toBe('Published');
    }
  });

  it('only returns Upcoming or Ongoing events', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery());

    expect(response.status).toBe(200);
    const events: Array<{ status: string }> = response.body.data.readTrendingEvents;

    for (const event of events) {
      expect(['Upcoming', 'Ongoing']).toContain(event.status);
    }
  });

  it('only returns Public or Unlisted events', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery());

    expect(response.status).toBe(200);
    const events: Array<{ visibility: string }> = response.body.data.readTrendingEvents;

    for (const event of events) {
      expect(['Public', 'Unlisted']).toContain(event.visibility);
    }
  });

  it('respects the limit parameter', async () => {
    const limit = 1;
    const response = await request(url).post('').send(getReadTrendingEventsQuery(limit));

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.readTrendingEvents.length).toBeLessThanOrEqual(limit);
  });

  it('clamps limit=0 to 1 (safe limit)', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery(0));

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.readTrendingEvents.length).toBeLessThanOrEqual(1);
  });

  it('returns null limit result with the default limit (10)', async () => {
    const response = await request(url).post('').send({
      query: `query { readTrendingEvents { eventId } }`,
    });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.readTrendingEvents.length).toBeLessThanOrEqual(10);
  });

  it('includes the created Published event in the results', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery(50));

    expect(response.status).toBe(200);
    const eventIds = response.body.data.readTrendingEvents.map((e: { eventId: string }) => e.eventId);

    expect(eventIds).toContain(createdEventIds[0]);
  });

  it('rsvpCount is a non-negative integer', async () => {
    const response = await request(url).post('').send(getReadTrendingEventsQuery());

    expect(response.status).toBe(200);
    const events: Array<{ rsvpCount: number; savedByCount: number }> = response.body.data.readTrendingEvents;

    for (const event of events) {
      expect(typeof event.rsvpCount).toBe('number');
      expect(event.rsvpCount).toBeGreaterThanOrEqual(0);
      expect(typeof event.savedByCount).toBe('number');
      expect(event.savedByCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('after RSVPing to the event, rsvpCount increases by 1', async () => {
    const eventId = createdEventIds[0];
    if (!eventId) return;

    // Get baseline count
    const before = await request(url).post('').send(getReadTrendingEventsQuery(50));
    const beforeEvent = before.body.data.readTrendingEvents.find((e: { eventId: string }) => e.eventId === eventId);
    const baselineRsvp = beforeEvent?.rsvpCount ?? 0;

    // RSVP
    const rsvpResponse = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + actorUser.token)
      .send(getUpsertEventParticipantMutation({ userId: actorUser.userId, eventId, status: 'Going' }));
    expect(rsvpResponse.status).toBe(200);
    expect(rsvpResponse.body.errors).toBeUndefined();

    // Verify count increased
    const after = await request(url).post('').send(getReadTrendingEventsQuery(50));
    const afterEvent = after.body.data.readTrendingEvents.find((e: { eventId: string }) => e.eventId === eventId);

    expect(afterEvent?.rsvpCount).toBe(baselineRsvp + 1);
  });
});

describe('cold-start feed fallback e2e', () => {
  const url = process.env.GRAPHQL_URL!;
  let freshUser: UserWithToken;
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    // Use a different seeded user to simulate a fresh account with no social signals
    const seededUsers = getSeededTestUsers();
    freshUser = await loginSeededUser(url, seededUsers.user2.email, seededUsers.user2.password);

    const category = await readFirstEventCategory(url);
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...baseEventData } = eventsMockData[0];

    // Create a Published event so there are candidates for any cold-start path
    const eventInput: CreateEventInput = {
      ...baseEventData,
      title: `Cold Start E2E Event ${Date.now()}`,
      description: 'Feed fallback integration test event',
      eventCategories: [category.eventCategoryId],
      organizers: [{ user: freshUser.userId, role: 'Host' }],
      status: EventStatus.Upcoming,
      lifecycleStatus: EventLifecycleStatus.Published,
      visibility: EventVisibility.Public,
      location: baseEventData.location,
      recurrenceRule: baseEventData.recurrenceRule,
    };

    await createEventOnServer(url, freshUser.token, eventInput, createdEventIds);
  });

  afterAll(async () => {
    await Promise.all(
      createdEventIds.map((id) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + freshUser.token)
          .send(getDeleteEventByIdMutation(id))
          .catch(() => {}),
      ),
    );
  });

  it('refreshFeed succeeds for a user with no personalisation signals', async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + freshUser.token)
      .send(getRefreshFeedMutation());

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.refreshFeed).toBe(true);
  });

  it('readRecommendedFeed returns an array after a cold-start refresh', async () => {
    // Trigger feed computation
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + freshUser.token)
      .send(getRefreshFeedMutation());

    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + freshUser.token)
      .send(getReadRecommendedFeedQuery());

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(Array.isArray(response.body.data.readRecommendedFeed)).toBe(true);
  });

  it('cold-start feed items have only valid reason codes', async () => {
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + freshUser.token)
      .send(getRefreshFeedMutation());

    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + freshUser.token)
      .send(getReadRecommendedFeedQuery());

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();

    const items: Array<{ reasons: string[] }> = response.body.data.readRecommendedFeed;
    const validReasons = [
      'CategoryMatch',
      'FriendAttending',
      'FollowedOrgHosting',
      'NetworkSaved',
      'TimeUrgency',
      'Freshness',
      'Popularity',
    ];

    for (const item of items) {
      expect(Array.isArray(item.reasons)).toBe(true);
      expect(item.reasons.length).toBeGreaterThan(0);
      for (const reason of item.reasons) {
        expect(validReasons).toContain(reason);
      }
    }
  });

  it('cold-start feed items have the expected shape', async () => {
    await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + freshUser.token)
      .send(getRefreshFeedMutation());

    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + freshUser.token)
      .send(getReadRecommendedFeedQuery());

    expect(response.status).toBe(200);
    const items: unknown[] = response.body.data.readRecommendedFeed;

    for (const item of items) {
      expect(item).toHaveProperty('feedItemId');
      expect(item).toHaveProperty('eventId');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('reasons');
      expect(item).toHaveProperty('computedAt');
    }
  });
});
