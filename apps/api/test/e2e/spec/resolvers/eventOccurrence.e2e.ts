import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/mockData';
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

describe('EventOccurrence Resolver', () => {
  const url = process.env.GRAPHQL_URL!;
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

  const readUpcomingOccurrences = async (eventId: string, limit: number = 10) => {
    const response = await request(url)
      .post('')
      .send({
        query: `query ReadEventById($eventId: String!) {
          readEventById(eventId: $eventId) {
            eventId
            upcomingOccurrences(limit: ${limit}, fromDate: "2026-05-01T00:00:00.000Z") {
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

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    return response.body.data.readEventById.upcomingOccurrences;
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
    const recurringSeriesTitle = `Occurrence Query Recurring Series ${uniqueSuffix()}`;
    const singleSeriesTitle = `Occurrence Query Single Series ${uniqueSuffix()}`;

    await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: recurringSeriesTitle,
        primarySchedule: {
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE',
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
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      }),
      createdEventIds,
    );

    const response = await request(url)
      .post('')
      .send({
        query: `query ReadEventOccurrences($options: EventsQueryOptionsInput!) {
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
              startDate: '2026-05-01T00:00:00.000Z',
              endDate: '2026-05-31T23:59:59.999Z',
            },
            search: {
              fields: ['title'],
              value: 'Occurrence Query',
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
      '2026-05-06T16:00:00.000Z',
      '2026-05-07T10:00:00.000Z',
      '2026-05-13T16:00:00.000Z',
      '2026-05-20T16:00:00.000Z',
    ]);
  });

  it('reads upcoming occurrences for a recurring series on the event detail query', async () => {
    const createdEvent = await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: `Occurrence Detail Recurring Series ${uniqueSuffix()}`,
        primarySchedule: {
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE',
        },
      }),
      createdEventIds,
    );

    const response = await request(url)
      .post('')
      .send({
        query: `query ReadEventById($eventId: String!) {
          readEventById(eventId: $eventId) {
            eventId
            upcomingOccurrences(limit: 2, fromDate: "2026-05-01T00:00:00.000Z") {
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
        occurrenceKey: `${createdEvent.eventId}#2026-05-06T16:00:00.000Z`,
        startAt: '2026-05-06T16:00:00.000Z',
      },
      {
        occurrenceKey: `${createdEvent.eventId}#2026-05-13T16:00:00.000Z`,
        startAt: '2026-05-13T16:00:00.000Z',
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
          startAt: new Date('2026-05-07T10:00:00.000Z'),
          endAt: new Date('2026-05-07T12:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
        },
      }),
      createdEventIds,
    );

    const response = await request(url)
      .post('')
      .send({
        query: `query ReadEventById($eventId: String!) {
          readEventById(eventId: $eventId) {
            eventId
            upcomingOccurrences(limit: 2, fromDate: "2026-05-01T00:00:00.000Z") {
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
        occurrenceKey: `${createdEvent.eventId}#2026-05-07T10:00:00.000Z`,
        startAt: '2026-05-07T10:00:00.000Z',
        endAt: '2026-05-07T12:00:00.000Z',
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
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE',
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
          startAt: '2026-05-06T17:30:00.000Z',
          endAt: '2026-05-06T20:30:00.000Z',
          timezone: 'UTC',
        }),
      );

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.errors).toBeUndefined();
    expect(updateResponse.body.data.updateEventOccurrence).toEqual(
      expect.objectContaining({
        occurrenceId: firstOccurrence.occurrenceId,
        startAt: '2026-05-06T17:30:00.000Z',
        endAt: '2026-05-06T20:30:00.000Z',
        timezone: 'UTC',
        isException: true,
      }),
    );

    const upcomingOccurrences = await readUpcomingOccurrences(createdEvent.eventId, 3);
    expect(upcomingOccurrences).toEqual([
      expect.objectContaining({
        occurrenceId: firstOccurrence.occurrenceId,
        startAt: '2026-05-06T17:30:00.000Z',
        endAt: '2026-05-06T20:30:00.000Z',
        timezone: 'UTC',
        isException: true,
      }),
      expect.objectContaining({
        startAt: '2026-05-13T16:00:00.000Z',
        timezone: 'Africa/Johannesburg',
        isException: false,
      }),
      expect.objectContaining({
        startAt: '2026-05-20T16:00:00.000Z',
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
          startAt: new Date('2026-05-06T16:00:00.000Z'),
          endAt: new Date('2026-05-06T19:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE',
        },
      }),
      createdEventIds,
    );

    const [firstOccurrence] = await readUpcomingOccurrences(createdEvent.eventId, 2);

    const rsvpResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send(
        getUpsertEventOccurrenceParticipantMutation({
          occurrenceId: firstOccurrence.occurrenceId,
          status: ParticipantStatus.Going,
        }),
      );

    expect(rsvpResponse.status).toBe(200);
    expect(rsvpResponse.body.errors).toBeUndefined();

    const cancelResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send(getCancelEventOccurrenceMutation({ occurrenceId: firstOccurrence.occurrenceId }));

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.errors).toBeUndefined();
    expect(cancelResponse.body.data.cancelEventOccurrence).toEqual(
      expect.objectContaining({
        occurrenceId: firstOccurrence.occurrenceId,
        status: 'Cancelled',
        isException: true,
      }),
    );

    const participantsResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send(getReadEventOccurrenceParticipantsQuery(firstOccurrence.occurrenceId));

    expect(participantsResponse.status).toBe(200);
    expect(participantsResponse.body.errors).toBeUndefined();
    expect(participantsResponse.body.data.readEventOccurrenceParticipants).toEqual([
      expect.objectContaining({
        occurrenceId: firstOccurrence.occurrenceId,
        status: ParticipantStatus.Cancelled,
      }),
    ]);

    const myStatusResponse = await request(url)
      .post('')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send(getMyEventOccurrenceRsvpStatusQuery(firstOccurrence.occurrenceId));

    expect(myStatusResponse.status).toBe(200);
    expect(myStatusResponse.body.errors).toBeUndefined();
    expect(myStatusResponse.body.data.myEventOccurrenceRsvpStatus.status).toBe(ParticipantStatus.Cancelled);

    const [cancelledOccurrence] = await readUpcomingOccurrences(createdEvent.eventId, 2);
    expect(cancelledOccurrence).toEqual(
      expect.objectContaining({
        occurrenceId: firstOccurrence.occurrenceId,
        status: 'Cancelled',
        isException: true,
      }),
    );
  });
});
