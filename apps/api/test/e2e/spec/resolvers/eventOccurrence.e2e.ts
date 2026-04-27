import request from 'supertest';
import { eventSeriesMockData } from '@/mongodb/mockData';
import type { CreateEventInput, UserWithToken } from '@gatherle/commons/types';
import { SortOrderInput } from '@gatherle/commons/types';
import { getDeleteEventByIdMutation } from '@/test/utils';
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

  const baseEventData = (() => {
    const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...rest } = eventSeriesMockData[0];
    return rest;
  })();

  const buildEventInput = (overrides: Partial<CreateEventInput> = {}): CreateEventInput => ({
    ...baseEventData,
    title: `Occurrence Query Event ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: 'Occurrence query test event',
    eventCategories: [testEventCategory.eventCategoryId],
    organizers: [{ user: testUser.userId, role: 'Host' }],
    ...overrides,
  });

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
    await createEventOnServer(
      url,
      testUser.token,
      buildEventInput({
        title: 'Occurrence Query Recurring Series',
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
        title: 'Occurrence Query Single Series',
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
      'Occurrence Query Recurring Series',
      'Occurrence Query Single Series',
      'Occurrence Query Recurring Series',
      'Occurrence Query Recurring Series',
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
        title: 'Occurrence Detail Recurring Series',
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
        title: 'Occurrence Detail Single Series',
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
});
