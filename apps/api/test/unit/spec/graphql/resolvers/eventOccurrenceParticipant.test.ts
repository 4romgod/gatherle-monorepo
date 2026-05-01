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
import { EventOccurrenceDAO, UserFeedDAO } from '@/mongodb/dao';
import { EventOccurrenceParticipantService } from '@/services';
import RecommendationService from '@/services/recommendation';
import type { ServerContext } from '@/graphql';
import type { EventOccurrence, EventOccurrenceParticipant, User } from '@gatherle/commons/types';
import { ParticipantStatus } from '@gatherle/commons/types';
import { buildMyEventOccurrenceParticipantLoadKey } from '@/utils';

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceDAO: {
    readByOccurrenceId: jest.fn(),
  },
  UserFeedDAO: {
    removeEventFromFeed: jest.fn(),
  },
}));

jest.mock('@/services', () => ({
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
  const user: User = {
    userId: 'user-1',
    email: 'user@example.com',
    username: 'user1',
    password: '',
    given_name: 'User',
    family_name: 'One',
    userRole: 'User' as any,
    isTestUser: true,
    interests: [],
  };

  const context: ServerContext = {
    user,
    loaders: {
      user: new DataLoader(async (keys: readonly string[]) => keys.map(() => user)),
      eventCategory: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventCategoryInterestCount: new DataLoader(async (keys: readonly string[]) => keys.map(() => 0)),
      eventSeries: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => occurrence)),
      eventOccurrenceByEventSeries: new DataLoader(async (keys: readonly string[]) => keys.map(() => occurrence)),
      organization: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventSeriesParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventSeriesParticipantsByEvent: new DataLoader(async (keys: readonly string[]) => keys.map(() => [])),
      eventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => participant)),
      eventOccurrenceParticipantsByOccurrence: new DataLoader(async (keys: readonly string[]) =>
        keys.map(() => [participant]),
      ),
      eventOccurrenceParticipantCountByOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => 1)),
      myEventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) => {
        const expectedKey = buildMyEventOccurrenceParticipantLoadKey(occurrence.occurrenceId, user.userId);
        return keys.map((key) => (key === expectedKey ? participant : null));
      }),
    },
  } as ServerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    (UserFeedDAO.removeEventFromFeed as jest.Mock).mockResolvedValue(undefined);
    (RecommendationService.computeFeedForUser as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(occurrence);
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

    expect(result).toEqual([
      expect.objectContaining({
        occurrenceId: occurrence.occurrenceId,
        user: expect.objectContaining({ userId: user.userId }),
      }),
    ]);
  });

  it('resolves the current user occurrence RSVP through the my-occurrence loader', async () => {
    const result = await resolver.myEventOccurrenceRsvpStatus(occurrence.occurrenceId, context);

    expect(result).toEqual(participant);
  });

  it('returns null when the current user has not RSVPd to the occurrence', async () => {
    const emptyContext: ServerContext = {
      ...context,
      loaders: {
        ...context.loaders,
        myEventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      },
    } as ServerContext;

    const result = await resolver.myEventOccurrenceRsvpStatus(occurrence.occurrenceId, emptyContext);

    expect(result).toBeNull();
  });

  it('uses the occurrence loader when resolving the occurrence field', async () => {
    const result = await resolver.occurrence(participant, context);

    expect(result).toEqual(occurrence);
  });

  it('prefers the preloaded occurrence on the participant root object', async () => {
    const result = await resolver.occurrence({ ...participant, occurrence }, context);

    expect(result).toBe(occurrence);
    expect(EventOccurrenceDAO.readByOccurrenceId).not.toHaveBeenCalled();
  });
});
