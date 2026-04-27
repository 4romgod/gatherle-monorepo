jest.mock('@/constants', () => ({
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  MONGO_DB_URL: 'mock-url',
  JWT_SECRET: 'test-secret',
  SECRET_ARN: undefined,
  LOG_LEVEL: 1,
  GRAPHQL_API_PATH: '/v1/graphql',
  HttpStatusCode: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHENTICATED: 401,
    UNAUTHORIZED: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
  REGEXT_MONGO_DB_ERROR: /\{ (.*?): (.*?) \}/,
  OPERATION_NAMES: {
    UPDATE_USER: 'updateUser',
    DELETE_USER_BY_ID: 'deleteUserById',
    DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
    DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
    UPDATE_EVENT: 'updateEvent',
    DELETE_EVENT: 'deleteEventById',
  },
  OPERATIONS: {
    USER: {
      UPDATE_USER: 'updateUser',
      DELETE_USER_BY_ID: 'deleteUserById',
      DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
      DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
    },
    EVENT: {
      UPDATE_EVENT: 'updateEvent',
      DELETE_EVENT: 'deleteEventById',
      DELETE_EVENT_BY_SLUG: 'deleteEventBySlug',
      CREATE_EVENT: 'createEvent',
    },
    EVENT_PARTICIPANT: {
      UPSERT_EVENT_PARTICIPANT: 'upsertEventParticipant',
      CANCEL_EVENT_PARTICIPANT: 'cancelEventParticipant',
      READ_EVENT_PARTICIPANTS: 'readEventParticipants',
    },
    ORGANIZATION: {
      CREATE_ORGANIZATION: 'createOrganization',
      UPDATE_ORGANIZATION: 'updateOrganization',
      DELETE_ORGANIZATION: 'deleteOrganizationById',
    },
    ORGANIZATION_MEMBERSHIP: {
      CREATE_ORGANIZATION_MEMBERSHIP: 'createOrganizationMembership',
      UPDATE_ORGANIZATION_MEMBERSHIP: 'updateOrganizationMembership',
      DELETE_ORGANIZATION_MEMBERSHIP: 'deleteOrganizationMembership',
    },
    VENUE: {
      CREATE_VENUE: 'createVenue',
      UPDATE_VENUE: 'updateVenue',
      DELETE_VENUE: 'deleteVenueById',
    },
  },
  RESOLVER_DESCRIPTIONS: {
    EVENT_OCCURRENCE_PARTICIPANT: {
      upsertEventOccurrenceParticipant: '',
      cancelEventOccurrenceParticipant: '',
      checkInEventOccurrenceParticipant: '',
      readEventOccurrenceParticipants: '',
      myEventOccurrenceRsvpStatus: '',
    },
  },
  EVENT_DESCRIPTIONS: {
    PARTICIPANT: {
      USER: '',
      EVENT_OCCURRENCE: '',
    },
  },
}));

import DataLoader from 'dataloader';
import { EventOccurrenceParticipantResolver } from '@/graphql/resolvers/eventOccurrenceParticipant';
import { EventOccurrenceDAO, EventSeriesParticipantDAO, UserFeedDAO } from '@/mongodb/dao';
import { EventOccurrenceParticipantService, EventOccurrenceService } from '@/services';
import RecommendationService from '@/services/recommendation';
import type { ServerContext } from '@/graphql';
import type { EventOccurrence, EventOccurrenceParticipant, EventSeries } from '@gatherle/commons/types';
import { EventStatus, ParticipantStatus } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceDAO: {
    readByOccurrenceId: jest.fn(),
  },
  EventSeriesParticipantDAO: {
    readByEventAndUser: jest.fn(),
  },
  UserFeedDAO: {
    removeEventFromFeed: jest.fn(),
  },
}));

jest.mock('@/services', () => ({
  EventOccurrenceService: {
    readOccurrenceById: jest.fn(),
    isRecurringSeries: jest.fn(),
  },
  EventOccurrenceParticipantService: {
    rsvp: jest.fn(),
    cancel: jest.fn(),
    checkIn: jest.fn(),
  },
  RecommendationService: {
    computeFeedForUser: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/recommendation', () => ({
  __esModule: true,
  default: {
    computeFeedForUser: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

describe('EventOccurrenceParticipantResolver', () => {
  const resolver = new EventOccurrenceParticipantResolver();
  const occurrence: EventOccurrence = {
    occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
    eventSeriesId: 'series-1',
    occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
    originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
    startAt: new Date('2026-05-06T16:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: 'Scheduled' as any,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const participant: EventOccurrenceParticipant = {
    participantId: 'participant-1',
    occurrenceId: occurrence.occurrenceId,
    userId: 'user-1',
    status: ParticipantStatus.Going,
    quantity: 1,
    rsvpAt: new Date(),
  };
  const recurringSeries: EventSeries = {
    eventId: 'series-1',
    title: 'Recurring Event',
    description: 'A recurring event',
    slug: 'recurring-event',
    status: EventStatus.Upcoming,
    organizers: [],
    eventCategories: [],
    location: { locationType: 'tba' },
    primarySchedule: {
      startAt: new Date('2026-05-06T16:00:00.000Z'),
      endAt: new Date('2026-05-06T18:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=3;BYDAY=WE',
    },
    scheduleVersion: 1,
  } as EventSeries;
  const singleSeries: EventSeries = {
    eventId: 'series-2',
    title: 'One-time Event',
    description: 'A single event',
    slug: 'one-time-event',
    status: EventStatus.Upcoming,
    organizers: [],
    eventCategories: [],
    location: { locationType: 'tba' },
    primarySchedule: {
      startAt: new Date('2026-05-07T10:00:00.000Z'),
      endAt: new Date('2026-05-07T12:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
    },
    scheduleVersion: 1,
  } as EventSeries;
  const singleOccurrence: EventOccurrence = {
    occurrenceId: 'series-2#2026-05-07T10:00:00.000Z',
    eventSeriesId: 'series-2',
    occurrenceKey: 'series-2#2026-05-07T10:00:00.000Z',
    originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
    startAt: new Date('2026-05-07T10:00:00.000Z'),
    endAt: new Date('2026-05-07T12:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: 'Scheduled' as any,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const singleSeriesParticipant = {
    participantId: 'participant-2',
    eventId: singleSeries.eventId,
    userId: 'user-1',
    status: ParticipantStatus.Interested,
    quantity: 1,
    rsvpAt: new Date(),
  };

  const context: ServerContext = {
    user: {
      userId: 'user-1',
      email: 'user@example.com',
      username: 'user1',
      userRole: 'User' as any,
      isTestUser: true,
    },
    loaders: {
      user: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventCategory: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventCategoryInterestCount: new DataLoader(async (keys: readonly string[]) => keys.map(() => 0)),
      eventSeries: new DataLoader(async (keys: readonly string[]) =>
        keys.map((key) => {
          if (key === recurringSeries.eventId) {
            return recurringSeries;
          }
          if (key === singleSeries.eventId) {
            return singleSeries;
          }
          return null;
        }),
      ),
      eventOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => occurrence)),
      organization: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventSeriesParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventSeriesParticipantsByEvent: new DataLoader(async (keys: readonly string[]) => keys.map(() => [])),
      eventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventOccurrenceParticipantsByOccurrence: new DataLoader(async (keys: readonly string[]) =>
        keys.map(() => [participant]),
      ),
      eventOccurrenceParticipantCountByOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => 1)),
      myEventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => participant)),
    },
  } as ServerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    (UserFeedDAO.removeEventFromFeed as jest.Mock).mockResolvedValue(undefined);
    (RecommendationService.computeFeedForUser as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(occurrence);
    (EventOccurrenceService.readOccurrenceById as jest.Mock).mockResolvedValue(occurrence);
    (EventOccurrenceService.isRecurringSeries as jest.Mock).mockReturnValue(true);
  });

  it('uses the authenticated user for upsert and triggers feed cleanup by parent series', async () => {
    (EventOccurrenceParticipantService.rsvp as jest.Mock).mockResolvedValue(participant);

    const result = await resolver.upsertEventOccurrenceParticipant(
      { occurrenceId: occurrence.occurrenceId, status: ParticipantStatus.Going },
      context,
    );

    expect(EventOccurrenceParticipantService.rsvp).toHaveBeenCalledWith(
      { occurrenceId: occurrence.occurrenceId, status: ParticipantStatus.Going },
      'user-1',
    );
    expect(UserFeedDAO.removeEventFromFeed).toHaveBeenCalledWith('user-1', occurrence.eventSeriesId);
    expect(result).toEqual(participant);
  });

  it('reads occurrence participants through the occurrence loader and enriches user fields', async () => {
    const result = await resolver.readEventOccurrenceParticipants(occurrence.occurrenceId, context);

    expect(result).toHaveLength(1);
    expect(result[0].occurrenceId).toBe(occurrence.occurrenceId);
  });

  it('resolves the current user occurrence RSVP through the my-occurrence loader', async () => {
    const result = await resolver.myEventOccurrenceRsvpStatus(occurrence.occurrenceId, context);

    expect(result).toEqual(participant);
  });

  it('falls back to the series RSVP for a synthetic single-event occurrence', async () => {
    (EventOccurrenceService.readOccurrenceById as jest.Mock).mockResolvedValue(singleOccurrence);
    (EventOccurrenceService.isRecurringSeries as jest.Mock).mockReturnValue(false);
    (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(singleSeriesParticipant);

    const result = await resolver.myEventOccurrenceRsvpStatus(singleOccurrence.occurrenceId, context);

    expect(EventSeriesParticipantDAO.readByEventAndUser).toHaveBeenCalledWith(singleSeries.eventId, 'user-1');
    expect(result).toMatchObject({
      participantId: singleSeriesParticipant.participantId,
      occurrenceId: singleOccurrence.occurrenceId,
      status: ParticipantStatus.Interested,
    });
  });

  it('uses the occurrence loader before falling back to synthetic occurrence reads', async () => {
    const loaderResult = await resolver.occurrence(participant, context);

    expect(loaderResult).toEqual(occurrence);
    expect(EventOccurrenceService.readOccurrenceById).not.toHaveBeenCalled();

    const fallbackContext: ServerContext = {
      ...context,
      loaders: {
        ...context.loaders,
        eventOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      },
    } as ServerContext;

    (EventOccurrenceService.readOccurrenceById as jest.Mock).mockResolvedValueOnce(singleOccurrence);
    const syntheticResult = await resolver.occurrence(
      {
        ...participant,
        occurrenceId: singleOccurrence.occurrenceId,
      },
      fallbackContext,
    );

    expect(EventOccurrenceService.readOccurrenceById).toHaveBeenCalledWith(singleOccurrence.occurrenceId);
    expect(syntheticResult).toEqual(singleOccurrence);
  });
});
