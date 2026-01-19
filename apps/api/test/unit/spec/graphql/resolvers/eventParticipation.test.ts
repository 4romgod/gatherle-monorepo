import 'reflect-metadata';
import { EventParticipantResolver } from '@/graphql/resolvers/eventParticipant';
import { EventParticipantDAO } from '@/mongodb/dao';
import type {
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
  EventParticipant,
  User,
} from '@ntlango/commons/types';
import { ParticipantStatus } from '@ntlango/commons/types';
import * as validation from '@/validation';
import { createMockContext } from '../../../../utils/mockContext';

jest.mock('@/mongodb/dao', () => ({
  EventParticipantDAO: {
    upsert: jest.fn(),
    cancel: jest.fn(),
    readByEvent: jest.fn(),
    readByUser: jest.fn(),
    readByEventAndUser: jest.fn(),
    countByEvent: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
}));

jest.mock('@/validation', () => ({
  validateMongodbId: jest.fn(),
}));

describe('EventParticipantResolver', () => {
  let resolver: EventParticipantResolver;

  beforeEach(() => {
    resolver = new EventParticipantResolver();
    jest.clearAllMocks();
    // Reset validateMongodbId to default no-op behavior
    (validation.validateMongodbId as jest.Mock).mockImplementation(() => {});
  });

  describe('upsertEventParticipant', () => {
    const mockInput: UpsertEventParticipantInput = {
      eventId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      status: ParticipantStatus.Going,
      quantity: 1,
    };

    const mockParticipant: EventParticipant = {
      participantId: 'participant123',
      eventId: mockInput.eventId,
      userId: mockInput.userId,
      status: ParticipantStatus.Going,
      quantity: 1,
      rsvpAt: new Date(),
    };

    it('should validate eventId and upsert participant successfully', async () => {
      (EventParticipantDAO.upsert as jest.Mock).mockResolvedValue(mockParticipant);

      const result = await resolver.upsertEventParticipant(mockInput);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventParticipantDAO.upsert).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockParticipant);
    });

    it('should throw validation error for invalid eventId', async () => {
      const validationError = new Error('Invalid MongoDB ID');
      (validation.validateMongodbId as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(resolver.upsertEventParticipant(mockInput)).rejects.toThrow(validationError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventParticipantDAO.upsert).not.toHaveBeenCalled();
    });

    it('should propagate DAO errors', async () => {
      const daoError = new Error('Database error');
      (EventParticipantDAO.upsert as jest.Mock).mockRejectedValue(daoError);

      await expect(resolver.upsertEventParticipant(mockInput)).rejects.toThrow(daoError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventParticipantDAO.upsert).toHaveBeenCalledWith(mockInput);
    });
  });

  describe('cancelEventParticipant', () => {
    const mockInput: CancelEventParticipantInput = {
      eventId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
    };

    const mockCancelledParticipant: EventParticipant = {
      participantId: 'participant123',
      eventId: mockInput.eventId,
      userId: mockInput.userId,
      status: ParticipantStatus.Cancelled,
      quantity: 1,
      rsvpAt: new Date(),
      cancelledAt: new Date(),
    };

    it('should validate eventId and cancel participant successfully', async () => {
      (EventParticipantDAO.cancel as jest.Mock).mockResolvedValue(mockCancelledParticipant);

      const result = await resolver.cancelEventParticipant(mockInput);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventParticipantDAO.cancel).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockCancelledParticipant);
    });

    it('should throw validation error for invalid eventId', async () => {
      const validationError = new Error('Invalid MongoDB ID');
      (validation.validateMongodbId as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(resolver.cancelEventParticipant(mockInput)).rejects.toThrow(validationError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventParticipantDAO.cancel).not.toHaveBeenCalled();
    });

    it('should propagate DAO errors', async () => {
      const daoError = new Error('Participant not found');
      (EventParticipantDAO.cancel as jest.Mock).mockRejectedValue(daoError);

      await expect(resolver.cancelEventParticipant(mockInput)).rejects.toThrow(daoError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(mockInput.eventId);
      expect(EventParticipantDAO.cancel).toHaveBeenCalledWith(mockInput);
    });
  });

  describe('readEventParticipants', () => {
    const eventId = '507f1f77bcf86cd799439011';

    const mockParticipants: EventParticipant[] = [
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
      (EventParticipantDAO.readByEvent as jest.Mock).mockResolvedValue(mockParticipants);

      const result = await resolver.readEventParticipants(eventId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventParticipantDAO.readByEvent).toHaveBeenCalledWith(eventId);
      expect(result).toEqual(mockParticipants);
    });

    it('should return empty array when no participants found', async () => {
      (EventParticipantDAO.readByEvent as jest.Mock).mockResolvedValue([]);

      const result = await resolver.readEventParticipants(eventId);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventParticipantDAO.readByEvent).toHaveBeenCalledWith(eventId);
      expect(result).toEqual([]);
    });

    it('should throw validation error for invalid eventId', async () => {
      const validationError = new Error('Invalid MongoDB ID');
      (validation.validateMongodbId as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(resolver.readEventParticipants(eventId)).rejects.toThrow(validationError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventParticipantDAO.readByEvent).not.toHaveBeenCalled();
    });

    it('should propagate DAO errors', async () => {
      const daoError = new Error('Database connection error');
      (EventParticipantDAO.readByEvent as jest.Mock).mockRejectedValue(daoError);

      await expect(resolver.readEventParticipants(eventId)).rejects.toThrow(daoError);
      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventParticipantDAO.readByEvent).toHaveBeenCalledWith(eventId);
    });
  });

  describe('user field resolver', () => {
    const mockParticipant: EventParticipant = {
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
      } as unknown as EventParticipant;
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
      const participantWithEmptyUserId: EventParticipant = {
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

    const mockParticipant: EventParticipant = {
      participantId: 'participant123',
      eventId,
      userId,
      status: ParticipantStatus.Going,
      quantity: 1,
      rsvpAt: new Date(),
    };

    it('should return user RSVP status for an event', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(mockParticipant);

      const result = await resolver.myRsvpStatus(eventId, mockContext);

      expect(validation.validateMongodbId).toHaveBeenCalledWith(eventId);
      expect(EventParticipantDAO.readByEventAndUser).toHaveBeenCalledWith(eventId, userId);
      expect(result).toEqual(mockParticipant);
    });

    it('should return null when user has not RSVPd', async () => {
      const mockContext = createMockContext({ user: { userId } as User });
      (EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);

      const result = await resolver.myRsvpStatus(eventId, mockContext);

      expect(EventParticipantDAO.readByEventAndUser).toHaveBeenCalledWith(eventId, userId);
      expect(result).toBeNull();
    });

    it('should return null when user is not authenticated', async () => {
      const mockContext = createMockContext({ user: undefined });

      const result = await resolver.myRsvpStatus(eventId, mockContext);

      expect(result).toBeNull();
      expect(EventParticipantDAO.readByEventAndUser).not.toHaveBeenCalled();
    });
  });

  describe('myRsvps', () => {
    const userId = '507f1f77bcf86cd799439012';

    const mockRsvps: EventParticipant[] = [
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
      (EventParticipantDAO.readByUser as jest.Mock).mockResolvedValue(mockRsvps);

      const result = await resolver.myRsvps(false, mockContext);

      expect(EventParticipantDAO.readByUser).toHaveBeenCalledWith(userId, true);
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
      (EventParticipantDAO.readByUser as jest.Mock).mockResolvedValue(rsvpsWithCancelled);

      const result = await resolver.myRsvps(true, mockContext);

      expect(EventParticipantDAO.readByUser).toHaveBeenCalledWith(userId, false);
      expect(result).toEqual(rsvpsWithCancelled);
    });

    it('should return empty array when user is not authenticated', async () => {
      const mockContext = createMockContext({ user: undefined });

      const result = await resolver.myRsvps(false, mockContext);

      expect(result).toEqual([]);
      expect(EventParticipantDAO.readByUser).not.toHaveBeenCalled();
    });
  });
});
