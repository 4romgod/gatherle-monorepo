import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/data/mock';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
import { ParticipantStatus, SortOrderInput } from '@gatherle/commons/types';
import {
  getCancelEventOccurrenceMutation,
  getDeleteEventByIdMutation,
  getMyEventOccurrenceRsvpStatusQuery,
  getReadEventOccurrenceParticipantsQuery,
  getUpdateEventOccurrenceMutation,
  getUpsertEventOccurrenceParticipantMutation,
} from '@/test/utils';
import {
  getSeededTestUsers,
  loginSeededUser,
  readFirstEventCategory,
  type EventCategoryRef,
} from '@/test/e2e/utils/helpers';
import {
  assertNoCleanupFailures,
  cleanupTrackedEntities,
  createEventOnServer,
} from '@/test/e2e/utils/eventSeriesResolverHelpers';
import { buildOccurrenceId, buildWeeklyOccurrenceFixture } from '@/test/e2e/utils/occurrenceFixtures';

describe('EventOccurrence Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  const OCCURRENCE_RESPONSE_TIMEOUT_MS = 35_000;
  const OCCURRENCE_DEADLINE_TIMEOUT_MS = 45_000;
  const OCCURRENCE_MAX_ATTEMPTS = 5;
  const occurrenceFixture = buildWeeklyOccurrenceFixture();
  let testUser: UserWithToken;
  let testEventCategory: EventCategoryRef;
  const createdEventIds: string[] = [];
  const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventSeriesMockData[0];
    return rest;
  })();

  const buildEventInput = (overrides: Partial<CreateEventInput> = {}): CreateEventInput => ({
    ...baseEventData,
    title: `Occurrence Query Event ${uniqueSuffix()}`,
    description: 'Occurrence query test event',
    location: { locationType: 'tba' },
    eventCategories: [testEventCategory.eventCategoryId],
    organizers: [{ user: testUser.userId, role: 'Host' }],
    ...overrides,
  });

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const isRetryableOccurrenceRequestError = (error: unknown): boolean => {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === 'object' && error !== null
          ? `${String((error as { name?: unknown }).name ?? '')}: ${String((error as { message?: unknown }).message ?? '')}`
          : String(error);

    return /(ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|timeout|aborted|AbortError)/i.test(message);
  };

  const isRetryableOccurrenceFailure = (status: number, body: unknown, retryOnNotFound = false): boolean => {
    if (status === 429 || status >= 500) {
      return true;
    }

    const failure = JSON.stringify(body ?? {});
    if (
      /internal server error|timed out|timeout|temporarily unavailable|endpoint request timed out|occurrence not found|representative occurrence not found/i.test(
        failure,
      )
    ) {
      return true;
    }

    return retryOnNotFound && status === 404;
  };

  const postOccurrenceGraphQLWithRetry = async (
    payload: object,
    token: string,
    options: { retryOnNotFound?: boolean; maxAttempts?: number } = {},
  ) => {
    const { retryOnNotFound = false, maxAttempts = OCCURRENCE_MAX_ATTEMPTS } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await request(url)
          .post('')
          .timeout({ response: OCCURRENCE_RESPONSE_TIMEOUT_MS, deadline: OCCURRENCE_DEADLINE_TIMEOUT_MS })
          .set('Authorization', `Bearer ${token}`)
          .send(payload);

        if (response.status === 200 && !response.body.errors) {
          return response;
        }

        const shouldRetry =
          attempt < maxAttempts && isRetryableOccurrenceFailure(response.status, response.body, retryOnNotFound);

        if (!shouldRetry) {
          return response;
        }
      } catch (error) {
        const shouldRetry = attempt < maxAttempts && isRetryableOccurrenceRequestError(error);
        if (!shouldRetry) {
          throw error;
        }
      }

      await sleep(750 * attempt);
    }

    throw new Error('Failed to complete occurrence GraphQL request after retrying transient errors.');
  };

  const readUpcomingOccurrences = async (eventId: string, limit: number = 10) => {
    for (let attempt = 1; attempt <= OCCURRENCE_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await request(url)
          .post('')
          .timeout({ response: OCCURRENCE_RESPONSE_TIMEOUT_MS, deadline: OCCURRENCE_DEADLINE_TIMEOUT_MS })
          .send({
            query: `query GetEventById($eventId: String!) {
              readEventById(eventId: $eventId) {
                eventId
                upcomingOccurrences(limit: ${limit}, fromDate: "${occurrenceFixture.rangeStartAt.toISOString()}") {
                  occurrenceId
                  occurrenceKey
                  eventSeriesId
                  startAt
                  endAt
                  timezone
                  status
                  isException
                }
              }
            }`,
            variables: {
              eventId,
            },
          });

        if (response.status === 200 && !response.body.errors) {
          return response.body.data.readEventById.upcomingOccurrences;
        }

        const shouldRetry =
          attempt < OCCURRENCE_MAX_ATTEMPTS && isRetryableOccurrenceFailure(response.status, response.body);

        if (!shouldRetry) {
          expect(response.status).toBe(200);
          expect(response.body.errors).toBeUndefined();
        }
      } catch (error) {
        const shouldRetry = attempt < OCCURRENCE_MAX_ATTEMPTS && isRetryableOccurrenceRequestError(error);
        if (!shouldRetry) {
          throw error;
        }
      }

      await sleep(750 * attempt);
    }

    throw new Error(`Failed to read upcoming occurrences for ${eventId} after retrying transient errors.`);
  };

  beforeAll(async () => {
    const seededUsers = getSeededTestUsers();
    testUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
    testEventCategory = await readFirstEventCategory(url);
  });

  afterEach(async () => {
    await cleanupTrackedEntities({
      url,
      ids: createdEventIds,
      deleteRequest: getDeleteEventByIdMutation,
      token: () => testUser.token,
      label: 'event',
    });
  });

  afterAll(async () => {
    const failures = await cleanupTrackedEntities({
      url,
      ids: createdEventIds,
      deleteRequest: getDeleteEventByIdMutation,
      token: () => testUser.token,
      label: 'event',
      phase: 'afterAll',
    });
    assertNoCleanupFailures(failures);
  });

  it('reads recurring occurrences and projected single-event occurrences inside one date window', async () => {
    const queryToken = uniqueSuffix();
    const recurringSeriesTitle = `Occurrence Query Recurring Series ${queryToken}`;
    const singleSeriesTitle = `Occurrence Query Single Series ${queryToken}`;

    await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: recurringSeriesTitle,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.firstStartAt,
          occurrenceDurationMinutes: occurrenceFixture.weeklyDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.weeklyRuleCount3,
        },
      }),
      createdEventIds,
    );

    await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: singleSeriesTitle,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.singleStartAt,
          occurrenceDurationMinutes: occurrenceFixture.singleDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.singleRuleCount1,
        },
      }),
      createdEventIds,
    );

    const response = await request(url)
      .post('')
      .send({
        query: `query GetEventOccurrences($options: EventsQueryOptionsInput!) {
          readEventOccurrences(options: $options) {
            occurrenceKey
            startAt
            endAt
            eventSeries {
              eventId
              title
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
              value: queryToken,
            },
            sort: [{ field: 'startAt', order: SortOrderInput.asc }],
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();

    const occurrences = response.body.data.readEventOccurrences;
    expect(occurrences).toHaveLength(4);
    expect(occurrences.map((occurrence: any) => occurrence.eventSeries.title)).toEqual([
      recurringSeriesTitle,
      singleSeriesTitle,
      recurringSeriesTitle,
      recurringSeriesTitle,
    ]);
    expect(occurrences.map((occurrence: any) => occurrence.startAt)).toEqual([
      occurrenceFixture.firstStartAt.toISOString(),
      occurrenceFixture.singleStartAt.toISOString(),
      occurrenceFixture.secondStartAt.toISOString(),
      occurrenceFixture.thirdStartAt.toISOString(),
    ]);
  });

  it('returns an occurrence count that matches the same filtered date window', async () => {
    const queryToken = uniqueSuffix();
    const recurringSeriesTitle = `Occurrence Count Series ${queryToken}`;
    const singleSeriesTitle = `Occurrence Count Single ${queryToken}`;

    await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: recurringSeriesTitle,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.firstStartAt,
          occurrenceDurationMinutes: occurrenceFixture.weeklyDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.weeklyRuleCount3,
        },
      }),
      createdEventIds,
    );

    await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: singleSeriesTitle,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.singleStartAt,
          occurrenceDurationMinutes: occurrenceFixture.singleDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.singleRuleCount1,
        },
      }),
      createdEventIds,
    );

    const response = await request(url)
      .post('')
      .send({
        query: `query GetEventOccurrenceCounts($options: EventsQueryOptionsInput!) {
          readEventOccurrences(options: $options) {
            occurrenceId
          }
          readEventOccurrencesCount(options: $options)
        }`,
        variables: {
          options: {
            dateRange: {
              startDate: occurrenceFixture.rangeStartAt.toISOString(),
              endDate: occurrenceFixture.rangeEndAt.toISOString(),
            },
            search: {
              fields: ['title'],
              value: queryToken,
            },
            sort: [{ field: 'startAt', order: SortOrderInput.asc }],
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.readEventOccurrences).toHaveLength(4);
    expect(response.body.data.readEventOccurrencesCount).toBe(4);
  });

  it('reads upcoming occurrences for a recurring series on the event detail query', async () => {
    const createdEvent = await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: `Occurrence Detail Recurring Series ${uniqueSuffix()}`,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.firstStartAt,
          occurrenceDurationMinutes: occurrenceFixture.weeklyDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.weeklyRuleCount3,
        },
      }),
      createdEventIds,
    );

    const response = await request(url)
      .post('')
      .send({
        query: `query GetEventById($eventId: String!) {
          readEventById(eventId: $eventId) {
            eventId
            upcomingOccurrences(limit: 2, fromDate: "${occurrenceFixture.rangeStartAt.toISOString()}") {
              occurrenceKey
              startAt
            }
          }
        }`,
        variables: {
          eventId: createdEvent.eventId,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.readEventById.upcomingOccurrences).toEqual([
      {
        occurrenceKey: buildOccurrenceId(createdEvent.eventId, occurrenceFixture.firstStartAt),
        startAt: occurrenceFixture.firstStartAt.toISOString(),
      },
      {
        occurrenceKey: buildOccurrenceId(createdEvent.eventId, occurrenceFixture.secondStartAt),
        startAt: occurrenceFixture.secondStartAt.toISOString(),
      },
    ]);
  });

  it('projects a one-time series into upcomingOccurrences on the event detail query', async () => {
    const createdEvent = await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: `Occurrence Detail Single Series ${uniqueSuffix()}`,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.singleStartAt,
          occurrenceDurationMinutes: occurrenceFixture.singleDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.singleRuleCount1,
        },
      }),
      createdEventIds,
    );

    const response = await request(url)
      .post('')
      .send({
        query: `query GetEventById($eventId: String!) {
          readEventById(eventId: $eventId) {
            eventId
            upcomingOccurrences(limit: 2, fromDate: "${occurrenceFixture.rangeStartAt.toISOString()}") {
              occurrenceKey
              startAt
              endAt
            }
          }
        }`,
        variables: {
          eventId: createdEvent.eventId,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.readEventById.upcomingOccurrences).toEqual([
      {
        occurrenceKey: buildOccurrenceId(createdEvent.eventId, occurrenceFixture.singleStartAt),
        startAt: occurrenceFixture.singleStartAt.toISOString(),
        endAt: occurrenceFixture.singleEndAt.toISOString(),
      },
    ]);
  });

  it('updates one recurring occurrence as an exception without changing later occurrences', async () => {
    const createdEvent = await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: `Occurrence Exception Update Series ${uniqueSuffix()}`,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.firstStartAt,
          occurrenceDurationMinutes: occurrenceFixture.weeklyDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.weeklyRuleCount3,
        },
      }),
      createdEventIds,
    );

    const [firstOccurrence] = await readUpcomingOccurrences(createdEvent.eventId, 3);

    const updateResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send(
        getUpdateEventOccurrenceMutation({
          occurrenceId: firstOccurrence.occurrenceId,
          startAt: occurrenceFixture.updatedFirstStartAt.toISOString(),
          endAt: occurrenceFixture.updatedFirstEndAt.toISOString(),
          timezone: 'UTC',
        }),
      );

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.errors).toBeUndefined();
    expect(updateResponse.body.data.updateEventOccurrence).toEqual(
      expect.objectContaining({
        occurrenceId: firstOccurrence.occurrenceId,
        startAt: occurrenceFixture.updatedFirstStartAt.toISOString(),
        endAt: occurrenceFixture.updatedFirstEndAt.toISOString(),
        timezone: 'UTC',
        isException: true,
      }),
    );

    const upcomingOccurrences = await readUpcomingOccurrences(createdEvent.eventId, 3);
    expect(upcomingOccurrences).toEqual([
      expect.objectContaining({
        occurrenceId: firstOccurrence.occurrenceId,
        startAt: occurrenceFixture.updatedFirstStartAt.toISOString(),
        endAt: occurrenceFixture.updatedFirstEndAt.toISOString(),
        timezone: 'UTC',
        isException: true,
      }),
      expect.objectContaining({
        startAt: occurrenceFixture.secondStartAt.toISOString(),
        timezone: 'Africa/Johannesburg',
        isException: false,
      }),
      expect.objectContaining({
        startAt: occurrenceFixture.thirdStartAt.toISOString(),
        timezone: 'Africa/Johannesburg',
        isException: false,
      }),
    ]);
  });

  it('cancels one recurring occurrence and cancels its RSVP participants', async () => {
    const createdEvent = await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: `Occurrence Cancellation Series ${uniqueSuffix()}`,
        primarySchedule: {
          anchorStartAt: occurrenceFixture.firstStartAt,
          occurrenceDurationMinutes: occurrenceFixture.weeklyDurationMinutes,
          timezone: 'Africa/Johannesburg',
          recurrenceRule: occurrenceFixture.weeklyRuleCount2,
        },
      }),
      createdEventIds,
    );

    const firstOccurrenceId = buildOccurrenceId(createdEvent.eventId, occurrenceFixture.firstStartAt);

    const rsvpResponse = await postOccurrenceGraphQLWithRetry(
      getUpsertEventOccurrenceParticipantMutation({
        occurrenceId: firstOccurrenceId,
        status: ParticipantStatus.Going,
      }),
      testUser.token,
      { retryOnNotFound: true, maxAttempts: 6 },
    );

    expect(rsvpResponse.status).toBe(200);
    expect(rsvpResponse.body.errors).toBeUndefined();

    const cancelResponse = await postOccurrenceGraphQLWithRetry(
      getCancelEventOccurrenceMutation({ occurrenceId: firstOccurrenceId }),
      testUser.token,
      { retryOnNotFound: true, maxAttempts: 6 },
    );

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.errors).toBeUndefined();
    expect(cancelResponse.body.data.cancelEventOccurrence).toEqual(
      expect.objectContaining({
        occurrenceId: firstOccurrenceId,
        status: 'Cancelled',
        isException: true,
      }),
    );

    const participantsResponse = await postOccurrenceGraphQLWithRetry(
      getReadEventOccurrenceParticipantsQuery(firstOccurrenceId),
      testUser.token,
      { retryOnNotFound: true, maxAttempts: 6 },
    );

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body.errors).toBeUndefined();
    expect(participantsResponse.body.data.readEventOccurrenceParticipants).toEqual([
      expect.objectContaining({
        occurrenceId: firstOccurrenceId,
        status: ParticipantStatus.Cancelled,
      }),
    ]);

    const myStatusResponse = await postOccurrenceGraphQLWithRetry(
      getMyEventOccurrenceRsvpStatusQuery(firstOccurrenceId),
      testUser.token,
      { retryOnNotFound: true, maxAttempts: 6 },
    );

    expect(myStatusResponse.status).toBe(200);
    expect(myStatusResponse.body.errors).toBeUndefined();
    expect(myStatusResponse.body.data.myEventOccurrenceRsvpStatus.status).toBe(ParticipantStatus.Cancelled);

    const [cancelledOccurrence] = await readUpcomingOccurrences(createdEvent.eventId, 2);
    expect(cancelledOccurrence).toEqual(
      expect.objectContaining({
        occurrenceId: firstOccurrenceId,
        status: 'Cancelled',
        isException: true,
      }),
    );
  }, 120_000);
});
