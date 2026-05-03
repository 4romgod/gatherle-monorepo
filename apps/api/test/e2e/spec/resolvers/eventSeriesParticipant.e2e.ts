import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
import { ParticipantStatus } from '@gatherle/commons/types';
import {
  getCancelEventParticipantMutation,
  getDeleteEventByIdMutation,
  getReadEventParticipantsQuery,
  getUpsertEventParticipantMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import {
  assertNoCleanupFailures,
  cleanupTrackedEntities,
  createEventOnServer,
} from '@/test/e2e/utils/eventSeriesResolverHelpers';

describe('EventSeriesParticipant Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  let participantUser: UserWithToken;
  let participantUser2: UserWithToken;
  let eventCreatorToken = '';
  let eventCategoryId = '';
  const allCreatedEventIds: string[] = [];
  const placeholderEventId = '507f1f77bcf86cd799439011';
  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventSeriesMockData[0];
    return rest;
  })();

  const buildEventInput = (): CreateEventInput => ({
    ...baseEventData,
    title: `Participant EventSeries ${Date.now()}`,
    description: 'Testing participants',
    eventCategories: [eventCategoryId],
    organizers: [{ user: participantUser.userId, role: 'Host' }],
  });

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const postGraphQl = async (token: string | undefined, payload: object, withTimeout: boolean = false) => {
    try {
      let req = request(url).post('');
      if (withTimeout) {
        req = req.timeout({ response: 15_000, deadline: 20_000 });
      }
      if (token) {
        req = req.set('Authorization', 'Bearer ' + token);
      }
      const response = await req.send(payload);
      return {
        status: response.status,
        body: response.body,
      };
    } catch (error) {
      return {
        status: 503,
        body: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  };

  const waitForParticipantReadiness = async (eventId: string): Promise<void> => {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + participantUser.token)
        .send(getReadEventParticipantsQuery(eventId));

      if (response.status === 200 && !response.body.errors) {
        return;
      }

      const body = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < maxAttempts &&
        (response.status === 404 ||
          response.status >= 500 ||
          /Representative occurrence not found|timed out|timeout/i.test(body));

      if (!shouldRetry) {
        throw new Error(`Event ${eventId} is not ready for participant operations: ${body}`);
      }

      await sleep(500 * attempt);
    }

    throw new Error(`Event ${eventId} did not become participant-ready in time.`);
  };

  const readEventParticipantsWithRetry = async (eventId: string) => {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await postGraphQl(participantUser.token, getReadEventParticipantsQuery(eventId), true);

      if (response.status === 200 && !response.body.errors) {
        return response;
      }

      const body = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < maxAttempts &&
        (response.status >= 500 || /Representative occurrence not found|timed out|timeout/i.test(body));

      if (!shouldRetry) {
        return response;
      }

      await sleep(500 * attempt);
    }

    throw new Error(`Failed to read participants for event ${eventId} after retrying transient errors.`);
  };

  const upsertEventParticipantWithRetry = async (
    eventId: string,
    userToken: string,
    input: {
      userId: string;
      status?: ParticipantStatus;
      quantity?: number;
      invitedBy?: string;
      sharedVisibility?: boolean;
    },
  ) => {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await postGraphQl(
        userToken,
        getUpsertEventParticipantMutation({
          eventId,
          userId: input.userId,
          status: input.status,
          quantity: input.quantity,
          invitedBy: input.invitedBy,
          sharedVisibility: input.sharedVisibility,
        }),
        true,
      );

      if (response.status === 200 && !response.body.errors) {
        return response;
      }

      const body = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < maxAttempts && (response.status >= 500 || /timed out|timeout|temporarily unavailable/i.test(body));

      if (!shouldRetry) {
        return response;
      }

      await sleep(500 * attempt);
    }

    throw new Error(`Failed to upsert participant for event ${eventId} after retrying transient errors.`);
  };

  const createEventId = async (): Promise<string> => {
    const createdEvent = await createEventOnServer(url, participantUser.token, buildEventInput(), allCreatedEventIds);
    await waitForParticipantReadiness(createdEvent.eventId);
    return createdEvent.eventId;
  };

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    const [user, user2, category] = await Promise.all([
      loginSeededUser(url, seededUsers.user.email, seededUsers.user.password),
      loginSeededUser(url, seededUsers.user2.email, seededUsers.user2.password),
      readFirstEventCategory(url),
    ]);
    participantUser = user;
    participantUser2 = user2;
    eventCategoryId = category.eventCategoryId;
    eventCreatorToken = participantUser.token;
  });

  afterEach(async () => {
    await cleanupTrackedEntities({
      url,
      ids: allCreatedEventIds,
      deleteRequest: getDeleteEventByIdMutation,
      token: () => eventCreatorToken,
      label: 'event',
    });
  });

  afterAll(async () => {
    const failures = await cleanupTrackedEntities({
      url,
      ids: allCreatedEventIds,
      deleteRequest: getDeleteEventByIdMutation,
      token: () => eventCreatorToken,
      label: 'event',
      phase: 'afterAll',
    });
    assertNoCleanupFailures(failures);
  });

  it('upserts a participant', async () => {
    const eventId = await createEventId();
    const response = await upsertEventParticipantWithRetry(eventId, participantUser.token, {
      userId: participantUser.userId,
      status: ParticipantStatus.Going,
    });
    expect(response.status).toBe(200);
    expect(response.body.data.upsertEventParticipant.eventId).toBe(eventId);
  });

  it('reads participants for an event', async () => {
    const eventId = await createEventId();
    await upsertEventParticipantWithRetry(eventId, participantUser.token, {
      userId: participantUser.userId,
      status: ParticipantStatus.Going,
    });

    const response = await readEventParticipantsWithRetry(eventId);
    expect(response.status).toBe(200);
    expect(response.body.data.readEventParticipants.length).toBeGreaterThan(0);
  });

  it('cancels a participant', async () => {
    const eventId = await createEventId();
    await upsertEventParticipantWithRetry(eventId, participantUser.token, {
      userId: participantUser.userId,
    });
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(getCancelEventParticipantMutation({ eventId, userId: participantUser.userId }));
    expect(response.status).toBe(200);
    expect(response.body.data.cancelEventParticipant.status).toBe(ParticipantStatus.Cancelled);
  });

  it('updates participant status from Going to Interested', async () => {
    const eventId = await createEventId();
    await upsertEventParticipantWithRetry(eventId, participantUser.token, {
      userId: participantUser.userId,
      status: ParticipantStatus.Going,
    });

    const updateResponse = await upsertEventParticipantWithRetry(eventId, participantUser.token, {
      userId: participantUser.userId,
      status: ParticipantStatus.Interested,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.upsertEventParticipant.status).toBe(ParticipantStatus.Interested);
  });

  it('handles multiple participants for same event', async () => {
    const eventId = await createEventId();
    await Promise.all([
      upsertEventParticipantWithRetry(eventId, participantUser.token, {
        userId: participantUser.userId,
        status: ParticipantStatus.Going,
      }),
      upsertEventParticipantWithRetry(eventId, participantUser2.token, {
        userId: participantUser2.userId,
        status: ParticipantStatus.Going,
      }),
    ]);

    const response = await readEventParticipantsWithRetry(eventId);

    expect(response.status).toBe(200);
    expect(response.body.data.readEventParticipants.length).toBeGreaterThanOrEqual(2);
  });

  it('returns error when event ID is invalid', async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getUpsertEventParticipantMutation({
          eventId: 'invalid-id',
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );

    expect([400, 404]).toContain(response.status);
  });

  it('returns error when cancelling non-existent participant', async () => {
    const eventId = await createEventId();
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + participantUser.token)
      .send(
        getCancelEventParticipantMutation({
          eventId,
          userId: participantUser2.userId,
        }),
      );

    expect([403, 404]).toContain(response.status);
  });

  it('requires authentication for upserting participant', async () => {
    const response = await request(url)
      .post('')
      .send(
        getUpsertEventParticipantMutation({
          eventId: placeholderEventId,
          userId: participantUser.userId,
          status: ParticipantStatus.Going,
        }),
      );

    expect(response.status).toBe(401);
  });

  it('requires authentication for cancelling participant', async () => {
    const response = await request(url)
      .post('')
      .send(
        getCancelEventParticipantMutation({
          eventId: placeholderEventId,
          userId: participantUser.userId,
        }),
      );

    expect(response.status).toBe(401);
  });
});
