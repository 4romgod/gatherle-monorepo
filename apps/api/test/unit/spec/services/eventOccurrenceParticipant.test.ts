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
}));

jest.mock('@/mongodb/dao', () => ({
  EventOccurrenceDAO: {
    readByOccurrenceId: jest.fn(),
    readByOccurrenceIds: jest.fn(),
    reserveSlots: jest.fn(),
    releaseReservedSlots: jest.fn(),
  },
  EventOccurrenceParticipantDAO: {
    upsert: jest.fn(),
    cancel: jest.fn(),
    readByOccurrence: jest.fn(),
    readByOccurrenceAndUser: jest.fn(),
    readByUser: jest.fn(),
    promoteWaitlisted: jest.fn(),
  },
  EventSeriesDAO: {
    readEventById: jest.fn(),
    readEventsByIds: jest.fn(),
  },
  OrganizationMembershipDAO: {
    readMembershipsByUserId: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
}));

jest.mock('@/services/notification', () => ({
  notifyMany: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/websocket/publisher', () => ({
  publishEventRsvpUpdated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import EventOccurrenceParticipantService from '@/services/eventOccurrenceParticipant';
import {
  EventOccurrenceDAO,
  EventOccurrenceParticipantDAO,
  EventSeriesDAO,
  OrganizationMembershipDAO,
  UserDAO,
} from '@/mongodb/dao';
import NotificationService from '@/services/notification';
import { publishEventRsvpUpdated } from '@/websocket/publisher';
import type { EventOccurrence, EventOccurrenceParticipant, EventSeries } from '@gatherle/commons/server/types';
import {
  EventOccurrenceStatus,
  EventOrganizerRole,
  EventStatus,
  EventVisibility,
  NotificationTargetType,
  NotificationType,
  ParticipantStatus,
  ParticipantVisibility,
  UserRole,
} from '@gatherle/commons/server/types';

describe('EventOccurrenceParticipantService', () => {
  const occurrence: EventOccurrence = {
    occurrenceId: 'series-1#2099-05-06T16:00:00.000Z',
    eventSeriesId: 'series-1',
    occurrenceKey: 'series-1#2099-05-06T16:00:00.000Z',
    originalStartAt: new Date('2099-05-06T16:00:00.000Z'),
    startAt: new Date('2099-05-06T16:00:00.000Z'),
    endAt: new Date('2099-05-06T18:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: EventOccurrenceStatus.Scheduled,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date('2026-04-27T00:00:00.000Z'),
    updatedAt: new Date('2026-04-27T00:00:00.000Z'),
  };

  const recurringEventSeries: Partial<EventSeries> = {
    eventId: 'series-1',
    slug: 'weekly-yoga',
    title: 'Weekly Yoga',
    status: EventStatus.Upcoming,
    rsvpLimit: 1,
    waitlistEnabled: true,
    allowGuestPlusOnes: false,
    primarySchedule: {
      anchorStartAt: new Date('2099-05-06T16:00:00.000Z'),
      occurrenceDurationMinutes: 120,
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20990506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=WE',
    },
    organizers: [{ user: 'host-user-id' as any, role: EventOrganizerRole.Host }],
  };

  const actor = {
    userId: 'user-1',
    username: 'attendee',
    given_name: 'Attendee',
    family_name: 'One',
    profile_picture: null,
  };

  const goingParticipant: EventOccurrenceParticipant = {
    participantId: 'participant-1',
    occurrenceId: occurrence.occurrenceId,
    userId: actor.userId,
    status: ParticipantStatus.Going,
    quantity: 1,
    rsvpAt: new Date('2026-05-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue(occurrence);
    (EventOccurrenceDAO.readByOccurrenceIds as jest.Mock).mockResolvedValue([occurrence]);
    (EventOccurrenceDAO.reserveSlots as jest.Mock).mockResolvedValue(true);
    (EventOccurrenceDAO.releaseReservedSlots as jest.Mock).mockResolvedValue(undefined);
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(recurringEventSeries);
    (EventSeriesDAO.readEventsByIds as jest.Mock).mockResolvedValue([recurringEventSeries]);
    (OrganizationMembershipDAO.readMembershipsByUserId as jest.Mock).mockResolvedValue([]);
    (UserDAO.readUserById as jest.Mock).mockResolvedValue(actor);
  });

  it('creates a recurring occurrence RSVP, publishes realtime, and notifies organizers with a deep link', async () => {
    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(null);
    (EventOccurrenceParticipantDAO.readByOccurrence as jest.Mock).mockResolvedValue([goingParticipant]);
    (EventOccurrenceParticipantDAO.upsert as jest.Mock).mockResolvedValue(goingParticipant);

    const result = await EventOccurrenceParticipantService.rsvp(
      { occurrenceId: occurrence.occurrenceId, status: ParticipantStatus.Going },
      actor.userId,
    );

    expect(result).toEqual(goingParticipant);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(NotificationService.notifyMany).toHaveBeenCalledWith(
      ['host-user-id'],
      expect.objectContaining({
        type: NotificationType.EVENT_RSVP,
        actorUserId: actor.userId,
        targetType: NotificationTargetType.EventSeries,
        targetSlug: 'weekly-yoga',
        actionUrl: '/events/weekly-yoga?occurs=2099-05-06T16%3A00%3A00.000Z',
        rsvpStatus: ParticipantStatus.Going,
      }),
    );

    expect(publishEventRsvpUpdated).toHaveBeenCalledWith(
      expect.arrayContaining(['host-user-id', actor.userId]),
      expect.objectContaining({
        participant: expect.objectContaining({
          eventId: occurrence.eventSeriesId,
          occurrenceId: occurrence.occurrenceId,
          occurrenceKey: occurrence.occurrenceKey,
          status: ParticipantStatus.Going,
        }),
        previousStatus: null,
        rsvpCount: 1,
      }),
    );
  });

  it('waitlists a new RSVP when the occurrence is full and skips organizer notification', async () => {
    const otherGoingParticipant: EventOccurrenceParticipant = {
      participantId: 'participant-existing',
      occurrenceId: occurrence.occurrenceId,
      userId: 'user-9',
      status: ParticipantStatus.Going,
      quantity: 1,
      rsvpAt: new Date('2026-05-01T00:00:00.000Z'),
    };
    const waitlistedParticipant: EventOccurrenceParticipant = {
      ...goingParticipant,
      status: ParticipantStatus.Waitlisted,
    };

    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(null);
    (EventOccurrenceParticipantDAO.readByOccurrence as jest.Mock).mockResolvedValue([
      otherGoingParticipant,
      waitlistedParticipant,
    ]);
    (EventOccurrenceParticipantDAO.upsert as jest.Mock).mockResolvedValue(waitlistedParticipant);
    (EventOccurrenceDAO.reserveSlots as jest.Mock).mockResolvedValue(false);

    const result = await EventOccurrenceParticipantService.rsvp(
      { occurrenceId: occurrence.occurrenceId, status: ParticipantStatus.Going },
      actor.userId,
    );

    expect(result.status).toBe(ParticipantStatus.Waitlisted);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(NotificationService.notifyMany).not.toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: NotificationType.EVENT_RSVP }),
    );
  });

  it('promotes the earliest waitlisted participant when a reserved RSVP is cancelled', async () => {
    const waitlistedParticipant: EventOccurrenceParticipant = {
      participantId: 'participant-2',
      occurrenceId: occurrence.occurrenceId,
      userId: 'user-2',
      status: ParticipantStatus.Waitlisted,
      quantity: 1,
      rsvpAt: new Date('2026-05-02T00:00:00.000Z'),
    };
    const cancelledParticipant: EventOccurrenceParticipant = {
      ...goingParticipant,
      status: ParticipantStatus.Cancelled,
      cancelledAt: new Date('2026-05-03T00:00:00.000Z'),
    };
    const promotedParticipant: EventOccurrenceParticipant = {
      ...waitlistedParticipant,
      status: ParticipantStatus.Going,
    };

    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(goingParticipant);
    (EventOccurrenceParticipantDAO.cancel as jest.Mock).mockResolvedValue(cancelledParticipant);
    (EventOccurrenceParticipantDAO.readByOccurrence as jest.Mock)
      .mockResolvedValueOnce([cancelledParticipant, waitlistedParticipant])
      .mockResolvedValueOnce([cancelledParticipant, waitlistedParticipant])
      .mockResolvedValueOnce([cancelledParticipant, promotedParticipant])
      .mockResolvedValueOnce([cancelledParticipant, promotedParticipant]);
    (EventOccurrenceParticipantDAO.promoteWaitlisted as jest.Mock).mockResolvedValue(promotedParticipant);

    const result = await EventOccurrenceParticipantService.cancel(occurrence.occurrenceId, actor.userId);

    expect(result.status).toBe(ParticipantStatus.Cancelled);
    expect(EventOccurrenceParticipantDAO.promoteWaitlisted).toHaveBeenCalledWith(occurrence.occurrenceId, 'user-2');
  });

  it('promotes waitlisted participants when a reserved RSVP is downgraded and capacity is released', async () => {
    const existingGoingParticipant: EventOccurrenceParticipant = {
      ...goingParticipant,
      quantity: 1,
    };
    const downgradedParticipant: EventOccurrenceParticipant = {
      ...goingParticipant,
      status: ParticipantStatus.Interested,
      quantity: 1,
    };
    const waitlistedParticipant: EventOccurrenceParticipant = {
      participantId: 'participant-2',
      occurrenceId: occurrence.occurrenceId,
      userId: 'user-2',
      status: ParticipantStatus.Waitlisted,
      quantity: 1,
      rsvpAt: new Date('2026-05-02T00:00:00.000Z'),
    };
    const promotedParticipant: EventOccurrenceParticipant = {
      ...waitlistedParticipant,
      status: ParticipantStatus.Going,
    };

    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(existingGoingParticipant);
    (EventOccurrenceParticipantDAO.readByOccurrence as jest.Mock)
      .mockResolvedValueOnce([downgradedParticipant, waitlistedParticipant])
      .mockResolvedValueOnce([downgradedParticipant, waitlistedParticipant])
      .mockResolvedValueOnce([downgradedParticipant, promotedParticipant])
      .mockResolvedValueOnce([downgradedParticipant, promotedParticipant]);
    (EventOccurrenceParticipantDAO.upsert as jest.Mock).mockResolvedValue(downgradedParticipant);
    (EventOccurrenceParticipantDAO.promoteWaitlisted as jest.Mock).mockResolvedValue(promotedParticipant);

    const result = await EventOccurrenceParticipantService.rsvp(
      { occurrenceId: occurrence.occurrenceId, status: ParticipantStatus.Interested },
      actor.userId,
    );

    expect(result.status).toBe(ParticipantStatus.Interested);
    expect(EventOccurrenceParticipantDAO.promoteWaitlisted).toHaveBeenCalledWith(occurrence.occurrenceId, 'user-2');
  });

  it('does not send duplicate RSVP notifications when an Interested RSVP only updates metadata', async () => {
    const existingInterestedParticipant: EventOccurrenceParticipant = {
      ...goingParticipant,
      status: ParticipantStatus.Interested,
      quantity: 1,
      sharedVisibility: ParticipantVisibility.Followers,
    };
    const updatedInterestedParticipant: EventOccurrenceParticipant = {
      ...existingInterestedParticipant,
      sharedVisibility: ParticipantVisibility.Public,
    };

    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue(
      existingInterestedParticipant,
    );
    (EventOccurrenceParticipantDAO.readByOccurrence as jest.Mock).mockResolvedValue([existingInterestedParticipant]);
    (EventOccurrenceParticipantDAO.upsert as jest.Mock).mockResolvedValue(updatedInterestedParticipant);

    const result = await EventOccurrenceParticipantService.rsvp(
      {
        occurrenceId: occurrence.occurrenceId,
        status: ParticipantStatus.Interested,
        sharedVisibility: ParticipantVisibility.Public,
      },
      actor.userId,
    );

    expect(result.sharedVisibility).toBe(ParticipantVisibility.Public);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(NotificationService.notifyMany).not.toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ type: NotificationType.EVENT_RSVP }),
    );
  });

  it('rejects RSVP updates for occurrences that have already ended', async () => {
    (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue({
      ...occurrence,
      startAt: new Date('2026-05-06T16:00:00.000Z'),
      endAt: new Date('2026-05-06T18:00:00.000Z'),
      originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
    });

    await expect(
      EventOccurrenceParticipantService.rsvp(
        { occurrenceId: occurrence.occurrenceId, status: ParticipantStatus.Going },
        actor.userId,
      ),
    ).rejects.toThrow('This occurrence has already ended. RSVPs are closed.');
    expect(EventOccurrenceParticipantDAO.upsert).not.toHaveBeenCalled();
  });

  it('rejects RSVP cancellations for occurrences that have already ended', async () => {
    (EventOccurrenceDAO.readByOccurrenceId as jest.Mock).mockResolvedValue({
      ...occurrence,
      startAt: new Date('2026-05-06T16:00:00.000Z'),
      endAt: new Date('2026-05-06T18:00:00.000Z'),
      originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
    });

    await expect(EventOccurrenceParticipantService.cancel(occurrence.occurrenceId, actor.userId)).rejects.toThrow(
      'This occurrence has already ended. RSVPs are closed.',
    );
    expect(EventOccurrenceParticipantDAO.cancel).not.toHaveBeenCalled();
  });

  it('rejects check-in when the user does not already have a reserved RSVP', async () => {
    (EventOccurrenceParticipantDAO.readByOccurrenceAndUser as jest.Mock).mockResolvedValue({
      ...goingParticipant,
      status: ParticipantStatus.Interested,
    });

    await expect(EventOccurrenceParticipantService.checkIn(occurrence.occurrenceId, actor.userId)).rejects.toThrow(
      'You must have a Going RSVP before checking in to this occurrence.',
    );
  });

  it('reads occurrence RSVPs for a user through the DAO', async () => {
    (EventOccurrenceParticipantDAO.readByUser as jest.Mock).mockResolvedValue([goingParticipant]);

    const result = await EventOccurrenceParticipantService.readByUser(actor.userId, false);

    expect(EventOccurrenceParticipantDAO.readByUser).toHaveBeenCalledWith(actor.userId, false, undefined);
    expect(result).toEqual([goingParticipant]);
  });

  it('filters hidden private occurrence RSVPs out of readByUser results', async () => {
    const hiddenEventSeries: EventSeries = {
      ...(recurringEventSeries as EventSeries),
      eventId: 'series-hidden',
      visibility: EventVisibility.Private,
    };
    const hiddenOccurrence: EventOccurrence = {
      ...occurrence,
      occurrenceId: 'series-hidden#2099-05-06T16:00:00.000Z',
      eventSeriesId: hiddenEventSeries.eventId,
      occurrenceKey: 'series-hidden#2099-05-06T16:00:00.000Z',
    };
    const hiddenParticipant: EventOccurrenceParticipant = {
      ...goingParticipant,
      occurrenceId: hiddenOccurrence.occurrenceId,
    };

    (EventOccurrenceParticipantDAO.readByUser as jest.Mock).mockResolvedValue([hiddenParticipant]);
    (EventOccurrenceDAO.readByOccurrenceIds as jest.Mock).mockResolvedValue([hiddenOccurrence]);
    (EventSeriesDAO.readEventsByIds as jest.Mock).mockResolvedValue([hiddenEventSeries]);

    const result = await EventOccurrenceParticipantService.readByUser(actor.userId, false);

    expect(result).toEqual([]);
  });

  it('keeps fetching participant batches until enough visible RSVPs are collected', async () => {
    const hiddenOccurrences = Array.from({ length: 25 }, (_, index) => ({
      ...occurrence,
      occurrenceId: `series-hidden#2099-05-${String(index + 1).padStart(2, '0')}T16:00:00.000Z`,
      eventSeriesId: 'series-hidden',
      occurrenceKey: `series-hidden#2099-05-${String(index + 1).padStart(2, '0')}T16:00:00.000Z`,
      originalStartAt: new Date(`2099-05-${String(index + 1).padStart(2, '0')}T16:00:00.000Z`),
      startAt: new Date(`2099-05-${String(index + 1).padStart(2, '0')}T16:00:00.000Z`),
      endAt: new Date(`2099-05-${String(index + 1).padStart(2, '0')}T18:00:00.000Z`),
    }));
    const hiddenParticipants = hiddenOccurrences.map((hiddenOccurrence, index) => ({
      ...goingParticipant,
      participantId: `participant-hidden-${index + 1}`,
      occurrenceId: hiddenOccurrence.occurrenceId,
    }));
    const visibleOccurrence: EventOccurrence = {
      ...occurrence,
      occurrenceId: 'series-public#2099-06-01T16:00:00.000Z',
      eventSeriesId: 'series-public',
      occurrenceKey: 'series-public#2099-06-01T16:00:00.000Z',
      originalStartAt: new Date('2099-06-01T16:00:00.000Z'),
      startAt: new Date('2099-06-01T16:00:00.000Z'),
      endAt: new Date('2099-06-01T18:00:00.000Z'),
    };
    const visibleParticipant: EventOccurrenceParticipant = {
      ...goingParticipant,
      participantId: 'participant-visible-1',
      occurrenceId: visibleOccurrence.occurrenceId,
    };

    (EventOccurrenceParticipantDAO.readByUser as jest.Mock)
      .mockResolvedValueOnce(hiddenParticipants)
      .mockResolvedValueOnce([visibleParticipant]);
    (EventOccurrenceDAO.readByOccurrenceIds as jest.Mock)
      .mockResolvedValueOnce(hiddenOccurrences)
      .mockResolvedValueOnce([visibleOccurrence]);
    (EventSeriesDAO.readEventsByIds as jest.Mock)
      .mockResolvedValueOnce([
        {
          ...(recurringEventSeries as EventSeries),
          eventId: 'series-hidden',
          visibility: EventVisibility.Private,
          orgId: 'org-1',
        },
      ])
      .mockResolvedValueOnce([
        {
          ...(recurringEventSeries as EventSeries),
          eventId: 'series-public',
          visibility: EventVisibility.Public,
        },
      ]);
    (OrganizationMembershipDAO.readMembershipsByUserId as jest.Mock).mockResolvedValue([]);

    const result = await EventOccurrenceParticipantService.readByUser(
      actor.userId,
      false,
      {
        pagination: {
          skip: 0,
          limit: 1,
        },
      },
      'viewer-1',
      UserRole.User,
    );

    expect(EventOccurrenceParticipantDAO.readByUser).toHaveBeenNthCalledWith(1, actor.userId, false, {
      pagination: {
        skip: 0,
        limit: 25,
      },
    });
    expect(EventOccurrenceParticipantDAO.readByUser).toHaveBeenNthCalledWith(2, actor.userId, false, {
      pagination: {
        skip: 25,
        limit: 25,
      },
    });
    expect(result).toEqual([visibleParticipant]);
  });

  it('rejects RSVP changes for a private occurrence when the viewer can no longer access the parent event', async () => {
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue({
      ...recurringEventSeries,
      visibility: EventVisibility.Private,
    });

    await expect(
      EventOccurrenceParticipantService.rsvp(
        { occurrenceId: occurrence.occurrenceId, status: ParticipantStatus.Going },
        actor.userId,
      ),
    ).rejects.toThrow('EventSeries not found');

    expect(EventOccurrenceParticipantDAO.upsert).not.toHaveBeenCalled();
  });
});
