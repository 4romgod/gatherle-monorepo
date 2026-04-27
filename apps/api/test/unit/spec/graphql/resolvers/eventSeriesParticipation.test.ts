import 'reflect-metadata';
import { EventSeriesParticipantResolver } from '@/graphql/resolvers/eventSeriesParticipant';
import { EventSeriesParticipantDAO, UserFeedDAO } from '@/mongodb/dao';
import RecommendationService from '@/services/recommendation';
import type {
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
  EventSeriesParticipant,
  User,
} from '@gatherle/commons/types';
import { ParticipantStatus } from '@gatherle/commons/types';
import * as validation from '@/validation';
import { createMockContext } from '../../../../utils/mockContext';

jest.mock('@/mongodb/dao', () => {
  class EventSeriesParticipantDAO {
    static upsert = jest.fn();
    static cancel = jest.fn();
    static readByEvent = jest.fn();
    static readByUser = jest.fn();
    static readByEventAndUser = jest.fn();
    static countByEvent = jest.fn();
    static readByEvents = jest.fn();
  }
  class UserDAO {
    static readUserById = jest.fn();
  }
  class UserFeedDAO {
    static removeEventFromFeed = jest.fn();
  }
  return { EventSeriesParticipantDAO, UserDAO, UserFeedDAO };
});

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

  beforeEach(() => {
    resolver = new EventSeriesParticipantResolver();
    jest.clearAllMocks();
    // Reset validateMongodbId to default no-op behavior
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => {});
    // Ensure fire-and-forget stubs don't throw by default
    (UserFeedDAO.removeEventFromFeed as jest.Mock).mockResolvedValue(undefined);
    (RecommendationService.computeFeedForUser as jest.Mock).mockResolvedValue(undefined);
  });

  describe('upsertEventParticipant', () => {
    const mockInput: UpsertEventParticipantInput = {
      eventId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      status: ParticipantStatus.Going,
      quantity: 1,
    };

    const mockParticipant: EventSeriesParticipant = {
      participantId: 'participant123',
      eventId: mockInput.eventId,
      userId: mockInput.userId,
      status: ParticipantStatus.Going,
      quantity: 1,
      rsvpAt: new Date(),
    };

    it('should validate eventId and upsert participant successfully', async () => {
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);

      const result = await resolver.upsertEventParticipant(mockInput);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventSeriesParticipantDAO.upsert).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockParticipant);
    });

    it('should throw validation error for invalid eventId', async () => {
      const validationError = new Error('Invalid MongoDB ID');
      (validation.validateMongodbId as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(resolver.upsertEventParticipant(mockInput)).rejects.toThrow(validationError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventSeriesParticipantDAO.upsert).not.toHaveBeenCalled();
    });

    it('should propagate DAO errors', async () => {
      const daoError = new Error('Database error');
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockRejectedValue(daoError);

      await expect(resolver.upsertEventParticipant(mockInput)).rejects.toThrow(daoError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventSeriesParticipantDAO.upsert).toHaveBeenCalledWith(mockInput);
    });

    it('removes the event from the feed after a successful RSVP', async () => {
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);

      await resolver.upsertEventParticipant(mockInput);

      expect(UserFeedDAO.removeEventFromFeed).toHaveBeenCalledWith(mockInput.userId, mockInput.eventId);
    });

    it('triggers a feed recomputation (fire-and-forget) after a successful RSVP', async () => {
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);

      await resolver.upsertEventParticipant(mockInput);
      // Allow microtask queue to flush the fire-and-forget promise
      await new Promise((r) => setTimeout(r, 0));

      expect(RecommendationService.computeFeedForUser).toHaveBeenCalledWith(mockInput.userId);
    });

    it('returns the participant even when feed removal fails', async () => {
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);
      (UserFeedDAO.removeEventFromFeed as jest.Mock).mockRejectedValue(new Error('feed error'));

      // feed removal error is swallowed via .catch() — resolver still resolves with the participant
      const result = await resolver.upsertEventParticipant(mockInput);
      expect(result).toEqual(mockParticipant);
    });
  });

  describe('cancelEventParticipant', () => {
    const mockInput: CancelEventParticipantInput = {
      eventId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
    };

    const mockCancelledParticipant: EventSeriesParticipant = {
      participantId: 'participant123',
      eventId: mockInput.eventId,
      userId: mockInput.userId,
      status: ParticipantStatus.Cancelled,
      quantity: 1,
      rsvpAt: new Date(),
      cancelledAt: new Date(),
    };

    it('should validate eventId and cancel participant successfully', async () => {
      (EventSeriesParticipantDAO.cancel as jest.Mock).mockResolvedValue(mockCancelledParticipant);

      const result = await resolver.cancelEventParticipant(mockInput);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventSeriesParticipantDAO.cancel).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockCancelledParticipant);
    });

    it('should throw validation error for invalid eventId', async () => {
      const validationError = new Error('Invalid MongoDB ID');
      (validation.validateMongodbId as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(resolver.cancelEventParticipant(mockInput)).rejects.toThrow(validationError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventSeriesParticipantDAO.cancel).not.toHaveBeenCalled();
    });

    it('should propagate DAO errors', async () => {
      const daoError = new Error('Participant not found');
      (EventSeriesParticipantDAO.cancel as jest.Mock).mockRejectedValue(daoError);

      await expect(resolver.cancelEventParticipant(mockInput)).rejects.toThrow(daoError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventSeriesParticipantDAO.cancel).toHaveBeenCalledWith(mockInput);
    });

    it('triggers a feed recomputation (fire-and-forget) after cancellation', async () => {
      (EventSeriesParticipantDAO.cancel as jest.Mock).mockResolvedValue(mockCancelledParticipant);

      await resolver.cancelEventParticipant(mockInput);
      await new Promise((r) => setTimeout(r, 0));

      expect(RecommendationService.computeFeedForUser).toHaveBeenCalledWith(mockInput.userId);
    });

    it('returns the cancelled participant even when feed trigger errors are swallowed', async () => {
      (EventSeriesParticipantDAO.cancel as jest.Mock).mockResolvedValue(mockCancelledParticipant);
      (RecommendationService.computeFeedForUser as jest.Mock).mockRejectedValue(new Error('reco error'));

      const result = await resolver.cancelEventParticipant(mockInput);

      expect(result).toEqual(mockCancelledParticipant);
    });
  });

  describe('readEventParticipants', () => {
    const eventId = '507f1f77bcf86cd799439011';

    const mockParticipants: EventSeriesParticipant[] = [
      {
        participantId: 'participant1',
        eventId,
        userId: '507f1f77bcf86cd799439012',
        status: ParticipantStatus.Going,
        quantity: 1,
        rsvpAt: new Date(),
      },
      {
        participantId: 'participant2',
        eventId,
        userId: '507f1f77bcf86cd799439013',
        status: ParticipantStatus.Interested,
        quantity: 2,
        rsvpAt: new Date(),
      },
    ];

    it('should validate eventId and return participants successfully', async () => {
      (EventSeriesParticipantDAO.readByEvent as jest.Mock).mockResolvedValue(mockParticipants);
      (EventSeriesParticipantDAO.readByEvents as jest.Mock).mockResolvedValue(mockParticipants);
      const mockContext = createMockContext();
      const result = await resolver.readEventParticipants(eventId, mockContext);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(result).toEqual(mockParticipants);
    });

    it('should return empty array when no participants found', async () => {
      (EventSeriesParticipantDAO.readByEvent as jest.Mock).mockResolvedValue([]);
      (EventSeriesParticipantDAO.readByEvents as jest.Mock).mockResolvedValue([]);
      const mockContext = createMockContext();
      const result = await resolver.readEventParticipants(eventId, mockContext);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(result).toEqual([]);
    });

    it('should throw validation error for invalid eventId', async () => {
      const validationError = new Error('Invalid MongoDB ID');
      (validation.validateMongodbId as jest.Mock).mockImplementation(() => {
        throw validationError;
      });
      const mockContext = createMockContext();
      await expect(resolver.readEventParticipants(eventId, mockContext)).rejects.toThrow(validationError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
    });

    it('should propagate DAO errors', async () => {
      const daoError = new Error('Database connection error');
      (EventSeriesParticipantDAO.readByEvent as jest.Mock).mockRejectedValue(daoError);
      (EventSeriesParticipantDAO.readByEvents as jest.Mock).mockRejectedValue(daoError);
      const mockContext = createMockContext();
      await expect(resolver.readEventParticipants(eventId, mockContext)).rejects.toThrow(daoError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
    });
  });

  describe('user field resolver', () => {
    const mockParticipant: EventSeriesParticipant = {
      participantId: 'participant123',
      eventId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      status: ParticipantStatus.Going,
      quantity: 1,
      rsvpAt: new Date(),
    };

    const mockUser: User = {
      userId: '507f1f77bcf86cd799439012',
      email: 'test@example.com',
      username: 'testuser',
    } as User;

    it('should return user when userId is present and user exists', async () => {
      const mockContext = createMockContext({}, { users: new Map([[mockParticipant.userId, mockUser]]) });

      const result = await resolver.user(mockParticipant, mockContext);

      expect(result).toEqual(mockUser);
    });

    it('should return null when userId is not present', async () => {
      const participantWithoutUser = {
        ...mockParticipant,
        userId: undefined,
      } as unknown as EventSeriesParticipant;
      const mockContext = createMockContext();

      const result = await resolver.user(participantWithoutUser, mockContext);

      expect(result).toBeNull();
    });

    it('should return null when UserDAO throws an error', async () => {
      const mockContext = createMockContext({}, { users: new Map() });

      const result = await resolver.user(mockParticipant, mockContext);
      expect(result).toBeNull();
    });

    it('should return null when userId is empty string', async () => {
      const participantWithEmptyUserId: EventSeriesParticipant = {
        ...mockParticipant,
        userId: '',
      };
      const mockContext = createMockContext();

      const result = await resolver.user(participantWithEmptyUserId, mockContext);

      expect(result).toBeNull();
    });
  });

  describe('myRsvpStatus', () => {
    const eventId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';

    const mockParticipant: EventSeriesParticipant = {
      participantId: 'participant123',
      eventId,
      userId,
      status: ParticipantStatus.Going,
      quantity: 1,
      rsvpAt: new Date(),
    };

    it('should return user RSVP status for an event', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(mockParticipant);

      const result = await resolver.myRsvpStatus(eventId, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventSeriesParticipantDAO.readByEventAndUser).toHaveBeenCalledWith(eventId, userId);
      expect(result).toEqual(mockParticipant);
    });

    it('should return null when user has not RSVPd', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);

      const result = await resolver.myRsvpStatus(eventId, mockContext);

      expect(EventSeriesParticipantDAO.readByEventAndUser).toHaveBeenCalledWith(eventId, userId);
      expect(result).toBeNull();
    });

    it('should return null when user is not authenticated', async () => {
      const mockContext = createMockContext({ user: undefined });

      const result = await resolver.myRsvpStatus(eventId, mockContext);

      expect(result).toBeNull();
      expect(EventSeriesParticipantDAO.readByEventAndUser).not.toHaveBeenCalled();
    });
  });

  describe('checkInEventParticipant', () => {
    const eventId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';

    const mockCheckedInParticipant: EventSeriesParticipant = {
      participantId: 'participant123',
      eventId,
      userId,
      status: ParticipantStatus.CheckedIn,
      quantity: 1,
      rsvpAt: new Date(),
      checkedInAt: new Date(),
    };

    it('validates eventId and checks in the current user', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockCheckedInParticipant);

      const result = await resolver.checkInEventParticipant(eventId, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventSeriesParticipantDAO.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ eventId, userId, status: ParticipantStatus.CheckedIn }),
      );
      expect(result).toEqual(mockCheckedInParticipant);
    });

    it('throws validation error for invalid eventId', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      const validationError = new Error('Invalid MongoDB ID');
      (validation.validateMongodbId as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(resolver.checkInEventParticipant(eventId, mockContext)).rejects.toThrow(validationError);
      expect(EventSeriesParticipantDAO.upsert).not.toHaveBeenCalled();
    });

    it('throws UNAUTHENTICATED when context.user is missing', async () => {
      const mockContext = createMockContext({ user: undefined });

      await expect(resolver.checkInEventParticipant(eventId, mockContext)).rejects.toMatchObject({
        extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }),
      });
      expect(EventSeriesParticipantDAO.upsert).not.toHaveBeenCalled();
    });

    it('uses the userId from context, not from any input', async () => {
      const differentUserId = '507f1f77bcf86cd799439099';
      const mockContext = createMockContext({ user: { userId: differentUserId } as User });
      (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockResolvedValue({
        ...mockCheckedInParticipant,
        userId: differentUserId,
      });

      await resolver.checkInEventParticipant(eventId, mockContext);

      expect(EventSeriesParticipantDAO.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: differentUserId }),
      );
    });

    it('propagates DAO errors', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
      const daoError = new Error('Database error');
      (EventSeriesParticipantDAO.upsert as jest.Mock).mockRejectedValue(daoError);

      await expect(resolver.checkInEventParticipant(eventId, mockContext)).rejects.toThrow(daoError);
    });
  });

  describe('myRsvps', () => {
    const userId = '507f1f77bcf86cd799439012';

    const mockRsvps: EventSeriesParticipant[] = [
      {
        participantId: 'participant1',
        eventId: '507f1f77bcf86cd799439011',
        userId,
        status: ParticipantStatus.Going,
        quantity: 1,
        rsvpAt: new Date(),
      },
      {
        participantId: 'participant2',
        eventId: '507f1f77bcf86cd799439013',
        userId,
        status: ParticipantStatus.Interested,
        quantity: 1,
        rsvpAt: new Date(),
      },
    ];

    it('should return all RSVPs for current user (excluding cancelled)', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      (EventSeriesParticipantDAO.readByUser as jest.Mock).mockResolvedValue(mockRsvps);

      const result = await resolver.myRsvps(false, mockContext);

      expect(EventSeriesParticipantDAO.readByUser).toHaveBeenCalledWith(userId, true);
      expect(result).toEqual(mockRsvps);
    });

    it('should include cancelled RSVPs when requested', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      const rsvpsWithCancelled = [
        ...mockRsvps,
        {
          participantId: 'participant3',
          eventId: '507f1f77bcf86cd799439014',
          userId,
          status: ParticipantStatus.Cancelled,
          quantity: 1,
          rsvpAt: new Date(),
          cancelledAt: new Date(),
        },
      ];
      (EventSeriesParticipantDAO.readByUser as jest.Mock).mockResolvedValue(rsvpsWithCancelled);

      const result = await resolver.myRsvps(true, mockContext);

      expect(EventSeriesParticipantDAO.readByUser).toHaveBeenCalledWith(userId, false);
      expect(result).toEqual(rsvpsWithCancelled);
    });

    it('should return empty array when user is not authenticated', async () => {
      const mockContext = createMockContext({ user: undefined });

      const result = await resolver.myRsvps(false, mockContext);

      expect(result).toEqual([]);
      expect(EventSeriesParticipantDAO.readByUser).not.toHaveBeenCalled();
    });
  });
});
