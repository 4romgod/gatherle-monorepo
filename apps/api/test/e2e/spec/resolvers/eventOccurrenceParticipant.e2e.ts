import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
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

describe('EventOccurrenceParticipant Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
  let participantUser: UserWithToken;
  let participantUser2: UserWithToken;
  let eventCategoryId = '';
  const createdEventIds: string[] = [];

  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventSeriesMockData[0];
    return rest;
  })();

  const buildRecurringEventInput = (): CreateEventInput => ({
    ...baseEventData,
    title: `Occurrence RSVP Series ${Date.now()}`,
    description: 'Testing occurrence-level RSVP flows',
    eventCategories: [eventCategoryId],
    organizers: [{ user: participantUser.userId, role: 'Host' }],
    rsvpLimit: 1,
    waitlistEnabled: true,
    primarySchedule: {
      startAt: new Date('2026-05-06T16:00:00.000Z'),
      endAt: new Date('2026-05-06T18:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE',
    },
  });

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const postGraphQl = async (payload: object) => {
    try {
      const response = await request(url).post('').timeout({ response: 15_000, deadline: 20_000 }).send(payload);

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

  const readFirstOccurrenceId = async (eventId: string) => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await postGraphQl({
        query: `query ReadEventById($eventId: String!) {
            readEventById(eventId: $eventId) {
              eventId
              upcomingOccurrences(limit: 1, fromDate: "2026-05-01T00:00:00.000Z") {
                occurrenceId
                occurrenceKey
              }
            }
          }`,
        variables: { eventId },
      });

      if (response.status === 200 && !response.body.errors) {
        const firstOccurrence = response.body.data.readEventById.upcomingOccurrences[0];
        if (firstOccurrence) {
          return firstOccurrence;
        }
      }

      const failure = JSON.stringify(response.body.errors ?? response.body);
      const shouldRetry =
        attempt < 5 &&
        (response.status >= 500 ||
          /timed out|timeout|temporarily unavailable|aborted/i.test(failure) ||
          (response.status === 200 && !response.body.errors));

      if (!shouldRetry) {
        expect(response.status).toBe(200);
        expect(response.body.errors).toBeUndefined();
      }

      await sleep(500 * attempt);
    }

    throw new Error(`No persisted occurrence became available for event ${eventId}.`);
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
  });

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
    const failures = await cleanupTrackedEntities({
      url,
      ids: createdEventIds,
      deleteRequest: getDeleteEventByIdMutation,
      token: () => participantUser.token,
      label: 'event',
      phase: 'afterAll',
    });
    assertNoCleanupFailures(failures);
  });

  it('supports recurring occurrence RSVP, waitlisting, participant reads, and promotion after cancellation', async () => {
    const createdEvent = await createEventOnServer(
      url,
      participantUser.token,
      buildRecurringEventInput(),
      createdEventIds,
    );
    const occurrence = await readFirstOccurrenceId(createdEvent.eventId);

    const firstRsvp = await request(url)
      .post('')
      .set('Authorization', `Bearer ${participantUser.token}`)
      .send(
        getUpsertEventOccurrenceParticipantMutation({
          occurrenceId: occurrence.occurrenceId,
          status: ParticipantStatus.Going,
        }),
      );

    expect(firstRsvp.status).toBe(200);
    expect(firstRsvp.body.errors).toBeUndefined();
    expect(firstRsvp.body.data.upsertEventOccurrenceParticipant.status).toBe(ParticipantStatus.Going);

    const secondRsvp = await request(url)
      .post('')
      .set('Authorization', `Bearer ${participantUser2.token}`)
      .send(
        getUpsertEventOccurrenceParticipantMutation({
          occurrenceId: occurrence.occurrenceId,
          status: ParticipantStatus.Going,
        }),
      );

    expect(secondRsvp.status).toBe(200);
    expect(secondRsvp.body.errors).toBeUndefined();
    expect(secondRsvp.body.data.upsertEventOccurrenceParticipant.status).toBe(ParticipantStatus.Waitlisted);

    const participantsResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${participantUser.token}`)
      .send(getReadEventOccurrenceParticipantsQuery(occurrence.occurrenceId));

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body.errors).toBeUndefined();
    expect(participantsResponse.body.data.readEventOccurrenceParticipants).toHaveLength(2);

    const waitlistStatusResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${participantUser2.token}`)
      .send(getMyEventOccurrenceRsvpStatusQuery(occurrence.occurrenceId));

    expect(waitlistStatusResponse.status).toBe(200);
    expect(waitlistStatusResponse.body.data.myEventOccurrenceRsvpStatus.status).toBe(ParticipantStatus.Waitlisted);

    const cancellationResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${participantUser.token}`)
      .send(getCancelEventOccurrenceParticipantMutation({ occurrenceId: occurrence.occurrenceId }));

    expect(cancellationResponse.status).toBe(200);
    expect(cancellationResponse.body.data.cancelEventOccurrenceParticipant.status).toBe(ParticipantStatus.Cancelled);

    const promotedStatusResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${participantUser2.token}`)
      .send(getMyEventOccurrenceRsvpStatusQuery(occurrence.occurrenceId));

    expect(promotedStatusResponse.status).toBe(200);
    expect(promotedStatusResponse.body.data.myEventOccurrenceRsvpStatus.status).toBe(ParticipantStatus.Going);
  });

  it('surfaces occurrence-level rsvpCount and myRsvp through readEventOccurrences', async () => {
    const createdEvent = await createEventOnServer(
      url,
      participantUser.token,
      buildRecurringEventInput(),
      createdEventIds,
    );
    const occurrence = await readFirstOccurrenceId(createdEvent.eventId);

    await request(url)
      .post('')
      .set('Authorization', `Bearer ${participantUser.token}`)
      .send(
        getUpsertEventOccurrenceParticipantMutation({
          occurrenceId: occurrence.occurrenceId,
          status: ParticipantStatus.Going,
        }),
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
              startDate: '2026-05-01T00:00:00.000Z',
              endDate: '2026-05-31T23:59:59.999Z',
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
      (item: any) => item.occurrenceId === occurrence.occurrenceId,
    );
    expect(matchingOccurrence).toEqual(
      expect.objectContaining({
        occurrenceId: occurrence.occurrenceId,
        rsvpCount: 1,
        myRsvp: expect.objectContaining({
          status: ParticipantStatus.Going,
        }),
      }),
    );
  });
});
