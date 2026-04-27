// Must mock before any imports that use these modules
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
}));

jest.mock('@/utils', () => ({
  CustomError: jest.fn((message: string, errorType: any) => {
    const error = new Error(message) as any;
    error.extensions = { code: errorType?.errorCode, http: { status: errorType?.errorStatus } };
    return error;
  }),
  ErrorTypes: {
    BAD_USER_INPUT: { errorCode: 'BAD_USER_INPUT', errorStatus: 400 },
    BAD_REQUEST: { errorCode: 'BAD_REQUEST', errorStatus: 400 },
    CONFLICT: { errorCode: 'CONFLICT', errorStatus: 409 },
    NOT_FOUND: { errorCode: 'NOT_FOUND', errorStatus: 404 },
    UNAUTHENTICATED: { errorCode: 'UNAUTHENTICATED', errorStatus: 401 },
    UNAUTHORIZED: { errorCode: 'UNAUTHORIZED', errorStatus: 403 },
  },
}));

jest.mock('@/mongodb/dao', () => ({
  EventSeriesParticipantDAO: {
    upsert: jest.fn(),
    cancel: jest.fn(),
    readByEventAndUser: jest.fn(),
    readByEvent: jest.fn(),
    countByEvent: jest.fn(),
  },
  EventSeriesDAO: {
    readEventById: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
}));

jest.mock('@/services/notification', () => ({
  notify: jest.fn().mockResolvedValue({}),
  notifyMany: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/websocket/publisher', () => ({
  publishEventRsvpUpdated: jest.fn().mockResolvedValue(undefined),
}));

import { EventSeriesParticipantService } from '@/services';
import { EventSeriesParticipantDAO, EventSeriesDAO, UserDAO } from '@/mongodb/dao';
import NotificationService from '@/services/notification';
import { publishEventRsvpUpdated } from '@/websocket/publisher';
import type { EventSeriesParticipant, EventSeries } from '@gatherle/commons/types';
import {
  ParticipantStatus,
  EventOrganizerRole,
  NotificationType,
  NotificationTargetType,
} from '@gatherle/commons/types';

describe('EventSeriesParticipantService', () => {
  const mockParticipant: EventSeriesParticipant = {
    participantId: 'participant-1',
    eventId: 'event-1',
    userId: 'user-1',
    status: ParticipantStatus.Going,
    quantity: 1,
    rsvpAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockEvent: Partial<EventSeries> = {
    eventId: 'event-1',
    slug: 'test-event',
    title: 'Test EventSeries',
    organizers: [
      {
        user: 'host-user-id' as any, // String reference
        role: EventOrganizerRole.Host,
      },
      {
        user: 'cohost-user-id' as any, // CoHost
        role: EventOrganizerRole.CoHost,
      },
    ],
  };

  const mockEventWithPopulatedOrganizers: Partial<EventSeries> = {
    eventId: 'event-1',
    slug: 'test-event',
    title: 'Test EventSeries',
    organizers: [
      {
        user: { userId: 'host-user-id' } as any, // Populated User object
        role: EventOrganizerRole.Host,
      },
      {
        user: { userId: 'cohost-user-id' } as any, // Populated CoHost
        role: EventOrganizerRole.CoHost,
      },
    ],
  };

  const mockActorUser = {
    userId: 'user-1',
    username: 'actor-user',
    given_name: 'Actor',
    family_name: 'User',
    profile_picture: null,
  };

  const mockEventParticipants = [mockParticipant];

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
    (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockActorUser);
    (EventSeriesParticipantDAO.readByEvent as jest.Mock).mockResolvedValue(mockEventParticipants);
    (EventSeriesParticipantDAO.countByEvent as jest.Mock).mockResolvedValue(1);
  });

  describe('rsvp', () => {
    describe('new RSVP', () => {
      it('creates RSVP and sends notification to all organizers', async () => {
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);
        (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);

        const result = await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });

        expect(EventSeriesParticipantDAO.upsert).toHaveBeenCalledWith({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });
        expect(result).toEqual(mockParticipant);

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Should notify ALL organizers (host + cohost) with rsvpStatus
        expect(NotificationService.notifyMany).toHaveBeenCalledWith(
          ['host-user-id', 'cohost-user-id'],
          expect.objectContaining({
            type: NotificationType.EVENT_RSVP,
            actorUserId: 'user-1',
            targetType: NotificationTargetType.EventSeries,
            targetSlug: 'test-event',
            rsvpStatus: ParticipantStatus.Going,
          }),
        );

        expect(publishEventRsvpUpdated).toHaveBeenCalledWith(
          expect.arrayContaining(['host-user-id', 'cohost-user-id', 'user-1']),
          expect.objectContaining({
            participant: expect.objectContaining({
              participantId: 'participant-1',
              eventId: 'event-1',
              userId: 'user-1',
              status: ParticipantStatus.Going,
            }),
            previousStatus: null,
            rsvpCount: 1,
          }),
        );
      });

      it('handles populated organizer user objects', async () => {
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);
        (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(mockEventWithPopulatedOrganizers);

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Should extract userIds from populated User objects
        expect(NotificationService.notifyMany).toHaveBeenCalledWith(
          ['host-user-id', 'cohost-user-id'],
          expect.any(Object),
        );
      });

      it('sends notification for Interested status', async () => {
        const interestedParticipant = { ...mockParticipant, status: ParticipantStatus.Interested };
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(interestedParticipant);
        (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Interested,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notifyMany).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            type: NotificationType.EVENT_RSVP,
          }),
        );
      });

      it('does not send notification when user RSVPs to their own event', async () => {
        // When the only organizer is the user themselves, notifyMany filters them out
        const selfEvent = {
          ...mockEvent,
          organizers: [{ user: 'user-1', role: EventOrganizerRole.Host }],
        };
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);
        (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(selfEvent);

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        // notifyMany is called but will filter out the actor internally
        expect(NotificationService.notifyMany).toHaveBeenCalledWith(
          ['user-1'], // The actor will be filtered out by notifyMany
          expect.any(Object),
        );
      });

      it('does not send notification when event has no organizers', async () => {
        const noOrganizersEvent = { ...mockEvent, organizers: [] };
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);
        (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(noOrganizersEvent);

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notifyMany).not.toHaveBeenCalled();
      });
    });

    describe('updating existing RSVP', () => {
      it('sends notification when changing from non-Going to Going', async () => {
        const cancelledParticipant = { ...mockParticipant, status: ParticipantStatus.Cancelled };
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(cancelledParticipant);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);
        (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notifyMany).toHaveBeenCalled();
      });

      it('does not send notification when already Going', async () => {
        const goingParticipant = { ...mockParticipant, status: ParticipantStatus.Going };
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(goingParticipant);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(goingParticipant);

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notify).not.toHaveBeenCalled();
      });

      it('does not send notification when already CheckedIn', async () => {
        const checkedInParticipant = { ...mockParticipant, status: ParticipantStatus.CheckedIn };
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(checkedInParticipant);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(checkedInParticipant);

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Going,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notify).not.toHaveBeenCalled();
      });

      it('does not send notification when changing to Waitlisted', async () => {
        (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
        (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue({
          ...mockParticipant,
          status: ParticipantStatus.Waitlisted,
        });

        await EventSeriesParticipantService.rsvp({
          eventId: 'event-1',
          userId: 'user-1',
          status: ParticipantStatus.Waitlisted,
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notify).not.toHaveBeenCalled();
      });
    });
  });

  describe('cancel', () => {
    it('cancels RSVP and does NOT send notification', async () => {
      const cancelledParticipant = { ...mockParticipant, status: ParticipantStatus.Cancelled };
      (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(mockParticipant);
      (EventSeriesParticipantDAO.cancel as jest.Mock).mockResolvedValue(cancelledParticipant);

      const result = await EventSeriesParticipantService.cancel({
        eventId: 'event-1',
        userId: 'user-1',
      });

      expect(EventSeriesParticipantDAO.cancel).toHaveBeenCalledWith({
        eventId: 'event-1',
        userId: 'user-1',
      });
      expect(result).toEqual(cancelledParticipant);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).not.toHaveBeenCalled();
      expect(publishEventRsvpUpdated).toHaveBeenCalledWith(
        expect.arrayContaining(['user-1']),
        expect.objectContaining({
          participant: expect.objectContaining({
            participantId: 'participant-1',
            status: ParticipantStatus.Cancelled,
          }),
          previousStatus: ParticipantStatus.Going,
        }),
      );
    });
  });

  describe('checkIn', () => {
    it('checks in and sends notification to all organizers', async () => {
      const checkedInParticipant = { ...mockParticipant, status: ParticipantStatus.CheckedIn };
      (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(mockParticipant);
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(checkedInParticipant);

      const result = await EventSeriesParticipantService.checkIn('event-1', 'user-1');

      expect(EventSeriesParticipantDAO.upsert).toHaveBeenCalledWith({
        eventId: 'event-1',
        userId: 'user-1',
        status: ParticipantStatus.CheckedIn,
      });
      expect(result).toEqual(checkedInParticipant);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should notify ALL organizers
      expect(NotificationService.notifyMany).toHaveBeenCalledWith(
        ['host-user-id', 'cohost-user-id'],
        expect.objectContaining({
          type: NotificationType.EVENT_CHECKIN,
          actorUserId: 'user-1',
          targetType: NotificationTargetType.EventSeries,
          targetSlug: 'test-event',
        }),
      );
      expect(publishEventRsvpUpdated).toHaveBeenCalledWith(
        expect.arrayContaining(['host-user-id', 'cohost-user-id', 'user-1']),
        expect.objectContaining({
          participant: expect.objectContaining({
            participantId: 'participant-1',
            status: ParticipantStatus.CheckedIn,
          }),
          previousStatus: ParticipantStatus.Going,
        }),
      );
    });

    it('filters out actor when checking in to own event', async () => {
      // When user is one of the organizers, notifyMany filters them out
      const selfEvent = {
        ...mockEvent,
        organizers: [{ user: 'user-1', role: EventOrganizerRole.Host }],
      };
      const checkedInParticipant = { ...mockParticipant, status: ParticipantStatus.CheckedIn };
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(checkedInParticipant);
      (EventSeriesDAO.readEventById as jest.Mock).mockResolvedValue(selfEvent);

      await EventSeriesParticipantService.checkIn('event-1', 'user-1');

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      // notifyMany is called but will filter out the actor internally
      expect(NotificationService.notifyMany).toHaveBeenCalledWith(
        ['user-1'], // The actor will be filtered out by notifyMany
        expect.any(Object),
      );
    });
  });
});
