import 'reflect-metadata';
import { EventSeriesParticipantResolver } from '@/graphql/resolvers/eventSeriesParticipant';
import { UserFeedDAO } from '@/mongodb/dao';
import { EventSeriesParticipantService } from '@/services';
import RecommendationService from '@/services/recommendation';
import type {
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
  EventSeriesParticipant,
  EventSeries,
  User,
} from '@gatherle/commons/server/types';
import { ParticipantStatus, UserRole } from '@gatherle/commons/server/types';
import * as validation from '@/validation';
import { createMockContext } from '../../../../utils/mockContext';

jest.mock('@/mongodb/dao', () => {
  class UserFeedDAO {
    static removeEventFromFeed = jest.fn();
  }
  return { UserFeedDAO };
});

jest.mock('@/services', () => ({
  EventSeriesParticipantService: {
    rsvp: jest.fn(),
    cancel: jest.fn(),
    readByEvent: jest.fn(),
    readByEventAndUser: jest.fn(),
    readByUser: jest.fn(),
    checkIn: jest.fn(),
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
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  initLogger: jest.fn(),
}));

jest.mock('@/validation', () => ({
  validateMongodbId: jest.fn(),
}));

describe('EventSeriesParticipantResolver', () => {
  let resolver: EventSeriesParticipantResolver;

  const userId = '507f1f77bcf86cd799439012';
  const eventId = '507f1f77bcf86cd799439011';
  const mockContext = createMockContext({ user: { userId, userRole: UserRole.User } as User });

  const mockParticipant: EventSeriesParticipant = {
    participantId: 'participant123',
    eventId,
    userId,
    status: ParticipantStatus.Going,
    quantity: 1,
    rsvpAt: new Date(),
  };

  beforeEach(() => {
    resolver = new EventSeriesParticipantResolver();
    jest.clearAllMocks();
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => {});
    (UserFeedDAO.removeEventFromFeed as jest.Mock).mockResolvedValue(undefined);
    (RecommendationService.computeFeedForUser as jest.Mock).mockResolvedValue(undefined);
  });

  describe('field resolvers', () => {
    it('loads the event through the DataLoader when the participant projection has no embedded event snapshot', async () => {
      const context = createMockContext(
        { user: { userId, userRole: UserRole.User } as User },
        {
          events: new Map([[eventId, { eventId, title: 'Weekly Yoga' } as EventSeries]]),
        },
      );

      const result = await resolver.event(mockParticipant, context);

      expect(result).toEqual(expect.objectContaining({ eventId, title: 'Weekly Yoga' }));
    });
  });

  describe('upsertEventParticipant', () => {
    const mockInput: UpsertEventParticipantInput = {
      eventId,
      userId,
      status: ParticipantStatus.Going,
      quantity: 1,
    };

    it('validates eventId, enforces self-RSVP, and delegates to the service', async () => {
      (EventSeriesParticipantService.rsvp as jest.Mock).mockResolvedValue(mockParticipant);

      const result = await resolver.upsertEventParticipant(mockInput, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventSeriesParticipantService.rsvp).toHaveBeenCalledWith(mockInput, userId, UserRole.User);
      expect(UserFeedDAO.removeEventFromFeed).toHaveBeenCalledWith(userId, eventId);
      expect(result).toEqual(mockParticipant);
    });

    it('rejects attempts to RSVP on behalf of another user', async () => {
      await expect(
        resolver.upsertEventParticipant({ ...mockInput, userId: 'other-user' }, mockContext),
      ).rejects.toThrow('You can only RSVP on your own behalf.');

      expect(EventSeriesParticipantService.rsvp).not.toHaveBeenCalled();
    });

    it('propagates service errors', async () => {
      const serviceError = new Error('Database error');
      (EventSeriesParticipantService.rsvp as jest.Mock).mockRejectedValue(serviceError);

      await expect(resolver.upsertEventParticipant(mockInput, mockContext)).rejects.toThrow(serviceError);
    });
  });

  describe('cancelEventParticipant', () => {
    const mockInput: CancelEventParticipantInput = {
      eventId,
      userId,
    };

    const cancelledParticipant: EventSeriesParticipant = {
      ...mockParticipant,
      status: ParticipantStatus.Cancelled,
      cancelledAt: new Date(),
    };

    it('validates eventId, enforces self-cancel, and delegates to the service', async () => {
      (EventSeriesParticipantService.cancel as jest.Mock).mockResolvedValue(cancelledParticipant);

      const result = await resolver.cancelEventParticipant(mockInput, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventSeriesParticipantService.cancel).toHaveBeenCalledWith(mockInput, userId, UserRole.User);
      expect(RecommendationService.computeFeedForUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(cancelledParticipant);
    });

    it('rejects attempts to cancel another user RSVP', async () => {
      await expect(
        resolver.cancelEventParticipant({ ...mockInput, userId: 'other-user' }, mockContext),
      ).rejects.toThrow('You can only cancel your own RSVP.');

      expect(EventSeriesParticipantService.cancel).not.toHaveBeenCalled();
    });

    it('propagates service errors', async () => {
      const serviceError = new Error('Participant not found');
      (EventSeriesParticipantService.cancel as jest.Mock).mockRejectedValue(serviceError);

      await expect(resolver.cancelEventParticipant(mockInput, mockContext)).rejects.toThrow(serviceError);
    });
  });

  describe('readEventParticipants', () => {
    it('validates eventId and delegates to the service', async () => {
      (EventSeriesParticipantService.readByEvent as jest.Mock).mockResolvedValue([mockParticipant]);

      const result = await resolver.readEventParticipants(eventId, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventSeriesParticipantService.readByEvent).toHaveBeenCalledWith(eventId, userId, UserRole.User);
      expect(result).toEqual([mockParticipant]);
    });
  });

  describe('myRsvpStatus', () => {
    it('returns the current user RSVP for the event', async () => {
      (EventSeriesParticipantService.readByEventAndUser as jest.Mock).mockResolvedValue(mockParticipant);

      const result = await resolver.myRsvpStatus(eventId, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventSeriesParticipantService.readByEventAndUser).toHaveBeenCalledWith(
        eventId,
        userId,
        userId,
        UserRole.User,
      );
      expect(result).toEqual(mockParticipant);
    });

    it('returns null when unauthenticated', async () => {
      const unauthenticatedContext = createMockContext({ user: undefined });

      const result = await resolver.myRsvpStatus(eventId, unauthenticatedContext);

      expect(result).toBeNull();
      expect(EventSeriesParticipantService.readByEventAndUser).not.toHaveBeenCalled();
    });
  });

  describe('checkInEventParticipant', () => {
    const checkedInParticipant: EventSeriesParticipant = {
      ...mockParticipant,
      status: ParticipantStatus.CheckedIn,
      checkedInAt: new Date(),
    };

    it('validates eventId and delegates to the service for the authenticated user', async () => {
      (EventSeriesParticipantService.checkIn as jest.Mock).mockResolvedValue(checkedInParticipant);

      const result = await resolver.checkInEventParticipant(eventId, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventSeriesParticipantService.checkIn).toHaveBeenCalledWith(eventId, userId, userId, UserRole.User);
      expect(result).toEqual(checkedInParticipant);
    });

    it('throws when the request is unauthenticated', async () => {
      const unauthenticatedContext = createMockContext({ user: undefined });

      await expect(resolver.checkInEventParticipant(eventId, unauthenticatedContext)).rejects.toMatchObject({
        extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }),
      });
    });

    it('propagates service errors', async () => {
      const serviceError = new Error('Database error');
      (EventSeriesParticipantService.checkIn as jest.Mock).mockRejectedValue(serviceError);

      await expect(resolver.checkInEventParticipant(eventId, mockContext)).rejects.toThrow(serviceError);
    });
  });

  describe('myRsvps', () => {
    it('returns all RSVPs for the current user, excluding cancelled by default', async () => {
      (EventSeriesParticipantService.readByUser as jest.Mock).mockResolvedValue([mockParticipant]);

      const result = await resolver.myRsvps(false, mockContext);

      expect(EventSeriesParticipantService.readByUser).toHaveBeenCalledWith(userId, true, userId, UserRole.User);
      expect(result).toEqual([mockParticipant]);
    });

    it('includes cancelled RSVPs when requested', async () => {
      const cancelledParticipant: EventSeriesParticipant = {
        ...mockParticipant,
        status: ParticipantStatus.Cancelled,
        cancelledAt: new Date(),
      };
      (EventSeriesParticipantService.readByUser as jest.Mock).mockResolvedValue([
        mockParticipant,
        cancelledParticipant,
      ]);

      const result = await resolver.myRsvps(true, mockContext);

      expect(EventSeriesParticipantService.readByUser).toHaveBeenCalledWith(userId, false, userId, UserRole.User);
      expect(result).toEqual([mockParticipant, cancelledParticipant]);
    });

    it('returns an empty array when unauthenticated', async () => {
      const unauthenticatedContext = createMockContext({ user: undefined });

      const result = await resolver.myRsvps(false, unauthenticatedContext);

      expect(result).toEqual([]);
      expect(EventSeriesParticipantService.readByUser).not.toHaveBeenCalled();
    });
  });
});
