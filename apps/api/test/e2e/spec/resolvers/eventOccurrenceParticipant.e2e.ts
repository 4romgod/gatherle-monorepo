import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/mockData';
import { usersMockData } from '@/mongodb/mockData';
import type { CreateEventInput, CreateUserInput, UserWithToken } from '@gatherle/commons/types';
import { ParticipantStatus, SortOrderInput } from '@gatherle/commons/types';
import {
  getCancelEventOccurrenceParticipantMutation,
  getDeleteEventByIdMutation,
  getMyEventOccurrenceRsvpStatusQuery,
  getReadEventOccurrenceParticipantsQuery,
  getUpsertEventOccurrenceParticipantMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser, readFirstEventCategory } from '@/test/e2e/utils/helpers';
import {
  assertNoCleanupFailures,
  cleanupTrackedEntities,
  createEventOnServer,
} from '@/test/e2e/utils/eventSeriesResolverHelpers';
import { buildOccurrenceId, buildWeeklyOccurrenceFixture } from '@/test/e2e/utils/occurrenceFixtures';
import {
  buildCreateUserInput,
  cleanupUsersById,
  createUserOnServer,
  uniqueSuffix,
} from '@/test/e2e/utils/userResolverHelpers';

describe('EventOccurrenceParticipant Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  const OCCURRENCE_PARTICIPANT_TEST_TIMEOUT_MS = 240_000;
  const OCCURRENCE_PARTICIPANT_HOOK_TIMEOUT_MS = 180_000;
  const OCCURRENCE_LOOKUP_RESPONSE_TIMEOUT_MS = 25_000;
  const OCCURRENCE_LOOKUP_DEADLINE_TIMEOUT_MS = 35_000;
  const OCCURRENCE_REQUEST_MAX_ATTEMPTS = 6;
  const occurrenceFixture = buildWeeklyOccurrenceFixture();
  let adminUser: UserWithToken;
  let participantUser: UserWithToken;
  let participantUser2: UserWithToken;
  let eventCategoryId = '';
  const createdEventIds: string[] = [];
  const createdUserIds: string[] = [];

  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventSeriesMockData[0];
    return rest;
  })();

  const buildRecurringEventInput = (): CreateEventInput => ({
    ...baseEventData,
    title: `Occurrence RSVP Series ${uniqueSuffix()}`,
    description: 'Testing occurrence-level RSVP flows',
    eventCategories: [eventCategoryId],
    organizers: [{ user: participantUser.userId, role: 'Host' }],
    rsvpLimit: 1,
    waitlistEnabled: true,
    primarySchedule: {
      anchorStartAt: occurrenceFixture.firstStartAt,
      occurrenceDurationMinutes: occurrenceFixture.weeklyDurationMinutes,
      timezone: 'Africa/Johannesburg',
      recurrenceRule: occurrenceFixture.weeklyRuleCount3,
    },
  });

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const postGraphQl = async (payload: object, token?: string) => {
    try {
      let req = request(url).post('').timeout({
        response: OCCURRENCE_LOOKUP_RESPONSE_TIMEOUT_MS,
        deadline: OCCURRENCE_LOOKUP_DEADLINE_TIMEOUT_MS,
      });

      if (token) {
        req = req.set('Authorization', `Bearer ${token}`);
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

  const sendGraphQlWithRetry = async (
    payload: object,
    token?: string,
    options: { maxAttempts?: number; retryOnNotFound?: boolean } = {},
  ) => {
    const { maxAttempts = OCCURRENCE_REQUEST_MAX_ATTEMPTS, retryOnNotFound = false } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await postGraphQl(payload, token);
      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < maxAttempts &&
        (response.status === 429 ||
          response.status >= 500 ||
          (retryOnNotFound && response.status === 404) ||
          /timed out|timeout|temporarily unavailable|aborted|endpoint request timed out|occurrence not found|representative occurrence not found/i.test(
            failure,
          ));

      if (!shouldRetry) {
        return response;
      }

      await sleep(1_000 * attempt);
    }

    throw new Error('Failed to complete occurrence participant GraphQL request after retrying transient errors.');
  };

  const waitForOccurrenceParticipantStatus = async (
    occurrenceId: string,
    token: string,
    expectedStatus: ParticipantStatus,
  ) => {
    const maxAttempts = 10;
    let lastResponse: Awaited<ReturnType<typeof sendGraphQlWithRetry>> | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await sendGraphQlWithRetry(getMyEventOccurrenceRsvpStatusQuery(occurrenceId), token, {
        maxAttempts: 1,
        retryOnNotFound: true,
      });
      lastResponse = response;

      const currentStatus = response.body.data?.myEventOccurrenceRsvpStatus?.status;
      if (response.status === 200 && !response.body.errors && currentStatus === expectedStatus) {
        return response;
      }

      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < maxAttempts &&
        (response.status === 404 ||
          response.status >= 500 ||
          currentStatus !== expectedStatus ||
          /timed out|timeout|temporarily unavailable|aborted|endpoint request timed out|occurrence not found|representative occurrence not found/i.test(
            failure,
          ));

      if (!shouldRetry) {
        return response;
      }

      await sleep(1_000 * attempt);
    }

    if (lastResponse) {
      return lastResponse;
    }

    throw new Error(`Occurrence participant status for ${occurrenceId} did not settle to ${expectedStatus}.`);
  };

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    const [seededAdmin, user, user2, category] = await Promise.all([
      loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password),
      createUserOnServer(
        url,
        buildCreateUserInput(usersMockData.at(0)! as CreateUserInput, 'occurrence-user-password', uniqueSuffix()),
        createdUserIds,
      ),
      createUserOnServer(
        url,
        buildCreateUserInput(usersMockData.at(1)! as CreateUserInput, 'occurrence-user2-password', uniqueSuffix()),
        createdUserIds,
      ),
      readFirstEventCategory(url),
    ]);
    adminUser = seededAdmin;
    participantUser = user;
    participantUser2 = user2;
    eventCategoryId = category.eventCategoryId;
  }, OCCURRENCE_PARTICIPANT_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await cleanupTrackedEntities({
      url,
      ids: createdEventIds,
      deleteRequest: getDeleteEventByIdMutation,
      token: () => participantUser.token,
      label: 'event',
    });
  });

  afterAll(async () => {
    const failures = [
      ...(await cleanupTrackedEntities({
        url,
        ids: createdEventIds,
        deleteRequest: getDeleteEventByIdMutation,
        token: () => participantUser.token,
        label: 'event',
        phase: 'afterAll',
      })),
      ...(adminUser?.token && createdUserIds.length > 0
        ? await cleanupUsersById(url, adminUser.token, createdUserIds, 'afterAll')
        : []),
    ];
    assertNoCleanupFailures(failures);
  }, OCCURRENCE_PARTICIPANT_HOOK_TIMEOUT_MS);

  it(
    'supports recurring occurrence RSVP, waitlisting, participant reads, and promotion after cancellation',
    async () => {
      const createdEvent = await createEventOnServer(
        url,
        participantUser.token,
        buildRecurringEventInput(),
        createdEventIds,
      );
      const occurrenceId = buildOccurrenceId(createdEvent.eventId, occurrenceFixture.firstStartAt);

      const firstRsvp = await sendGraphQlWithRetry(
        getUpsertEventOccurrenceParticipantMutation({
          occurrenceId,
          status: ParticipantStatus.Going,
        }),
        participantUser.token,
        { maxAttempts: 8, retryOnNotFound: true },
      );

      expect(firstRsvp.status).toBe(200);
      expect(firstRsvp.body.errors).toBeUndefined();
      expect(firstRsvp.body.data.upsertEventOccurrenceParticipant.status).toBe(ParticipantStatus.Going);

      const secondRsvp = await sendGraphQlWithRetry(
        getUpsertEventOccurrenceParticipantMutation({
          occurrenceId,
          status: ParticipantStatus.Going,
        }),
        participantUser2.token,
        { maxAttempts: 8, retryOnNotFound: true },
      );

      expect(secondRsvp.status).toBe(200);
      expect(secondRsvp.body.errors).toBeUndefined();
      expect(secondRsvp.body.data.upsertEventOccurrenceParticipant.status).toBe(ParticipantStatus.Waitlisted);

      const participantsResponse = await sendGraphQlWithRetry(
        getReadEventOccurrenceParticipantsQuery(occurrenceId),
        participantUser.token,
        { maxAttempts: 8, retryOnNotFound: true },
      );

      expect(participantsResponse.status).toBe(200);
      expect(participantsResponse.body.errors).toBeUndefined();
      expect(participantsResponse.body.data.readEventOccurrenceParticipants).toHaveLength(2);

      const waitlistStatusResponse = await sendGraphQlWithRetry(
        getMyEventOccurrenceRsvpStatusQuery(occurrenceId),
        participantUser2.token,
        { maxAttempts: 8, retryOnNotFound: true },
      );

      expect(waitlistStatusResponse.status).toBe(200);
      expect(waitlistStatusResponse.body.data.myEventOccurrenceRsvpStatus.status).toBe(ParticipantStatus.Waitlisted);

      const cancellationResponse = await sendGraphQlWithRetry(
        getCancelEventOccurrenceParticipantMutation({ occurrenceId }),
        participantUser.token,
        { maxAttempts: 8, retryOnNotFound: true },
      );

      expect(cancellationResponse.status).toBe(200);
      expect(cancellationResponse.body.data.cancelEventOccurrenceParticipant.status).toBe(ParticipantStatus.Cancelled);

      const promotedStatusResponse = await waitForOccurrenceParticipantStatus(
        occurrenceId,
        participantUser2.token,
        ParticipantStatus.Going,
      );

      expect(promotedStatusResponse.status).toBe(200);
      expect(promotedStatusResponse.body.data.myEventOccurrenceRsvpStatus.status).toBe(ParticipantStatus.Going);
    },
    OCCURRENCE_PARTICIPANT_TEST_TIMEOUT_MS,
  );

  it(
    'surfaces occurrence-level rsvpCount and myRsvp through readEventOccurrences',
    async () => {
      const createdEvent = await createEventOnServer(
        url,
        participantUser.token,
        buildRecurringEventInput(),
        createdEventIds,
      );
      const occurrenceId = buildOccurrenceId(createdEvent.eventId, occurrenceFixture.firstStartAt);

      await sendGraphQlWithRetry(
        getUpsertEventOccurrenceParticipantMutation({
          occurrenceId,
          status: ParticipantStatus.Going,
        }),
        participantUser.token,
        { maxAttempts: 8, retryOnNotFound: true },
      );

      const response = await request(url)
        .post('')
        .set('Authorization', `Bearer ${participantUser.token}`)
        .send({
          query: `query ReadEventOccurrences($options: EventsQueryOptionsInput!) {
          readEventOccurrences(options: $options) {
            occurrenceId
            rsvpCount
            myRsvp {
              participantId
              status
            }
            eventSeries {
              eventId
            }
          }
        }`,
          variables: {
            options: {
              dateRange: {
                startDate: occurrenceFixture.rangeStartAt.toISOString(),
                endDate: occurrenceFixture.rangeEndAt.toISOString(),
              },
              search: {
                fields: ['title'],
                value: createdEvent.title,
              },
              sort: [{ field: 'startAt', order: SortOrderInput.asc }],
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      const matchingOccurrence = response.body.data.readEventOccurrences.find(
        (item: any) => item.occurrenceId === occurrenceId,
      );
      expect(matchingOccurrence).toEqual(
        expect.objectContaining({
          occurrenceId,
          rsvpCount: 1,
          myRsvp: expect.objectContaining({
            status: ParticipantStatus.Going,
          }),
        }),
      );
    },
    OCCURRENCE_PARTICIPANT_TEST_TIMEOUT_MS,
  );
});
