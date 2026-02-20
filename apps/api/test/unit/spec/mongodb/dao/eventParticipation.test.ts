import { EventParticipantDAO } from '@/mongodb/dao';
import { EventParticipant as EventParticipantModel } from '@/mongodb/models';
import type {
  EventParticipant,
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
} from '@gatherle/commons/types';
import { ParticipantStatus, ParticipantVisibility } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from '@/utils';
import { GraphQLError } from 'graphql';
import { MockMongoError } from '@/test/utils';
import { Types } from 'mongoose';

jest.mock('@/mongodb/models', () => ({
  EventParticipant: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

// Helper function to create a mock mongoose chainable query
const createMockSuccessMongooseQuery = <T>(result: T) => ({
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
});

describe('EventParticipantDAO', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockParticipantId = new Types.ObjectId().toString();
  const mockEventId = 'event123';
  const mockUserId = 'user456';

  const mockEventParticipant: EventParticipant = {
    participantId: mockParticipantId,
    eventId: mockEventId,
    userId: mockUserId,
    status: ParticipantStatus.Going,
    quantity: 1,
    invitedBy: 'user789',
    sharedVisibility: ParticipantVisibility.Followers,
    rsvpAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  describe('upsert', () => {
    const mockUpsertInput: UpsertEventParticipantInput = {
      eventId: mockEventId,
      userId: mockUserId,
      status: ParticipantStatus.Going,
      quantity: 2,
      invitedBy: 'user789',
      sharedVisibility: ParticipantVisibility.Public,
    };

    it('should update existing participant', async () => {
      const existingParticipant = {
        ...mockEventParticipant,
        status: ParticipantStatus.Interested,
        save: jest.fn().mockResolvedValue({ ...mockEventParticipant, quantity: 2, status: ParticipantStatus.Going }),
        toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, quantity: 2, status: ParticipantStatus.Going }),
      };

      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(existingParticipant));

      const result = await EventParticipantDAO.upsert(mockUpsertInput);

      expect(result.status).toBe(ParticipantStatus.Going);
      expect(result.quantity).toBe(2);
      expect(EventParticipantModel.findOne).toHaveBeenCalledWith({ eventId: mockEventId, userId: mockUserId });
      expect(existingParticipant.save).toHaveBeenCalled();
    });

    it('should create new participant when not found', async () => {
      const newParticipant = {
        ...mockEventParticipant,
        quantity: 2,
        toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, quantity: 2 }),
      };

      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (EventParticipantModel.create as jest.Mock).mockResolvedValue(newParticipant);

      const result = await EventParticipantDAO.upsert(mockUpsertInput);

      expect(result.quantity).toBe(2);
      expect(EventParticipantModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: mockEventId,
          userId: mockUserId,
          status: ParticipantStatus.Going,
          quantity: 2,
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database Error');
      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.upsert(mockUpsertInput)).rejects.toThrow(GraphQLError);
    });

    it('should re-throw GraphQLError', async () => {
      const mockGraphqlError = new GraphQLError('GraphQL Error');
      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockGraphqlError));

      await expect(EventParticipantDAO.upsert(mockUpsertInput)).rejects.toThrow(mockGraphqlError);
    });

    it('should default status to Going when not provided', async () => {
      const minimalInput: UpsertEventParticipantInput = {
        eventId: mockEventId,
        userId: mockUserId,
      };

      const newParticipant = {
        ...mockEventParticipant,
        status: ParticipantStatus.Going,
        toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, status: ParticipantStatus.Going }),
      };

      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (EventParticipantModel.create as jest.Mock).mockResolvedValue(newParticipant);

      const result = await EventParticipantDAO.upsert(minimalInput);

      expect(result.status).toBe(ParticipantStatus.Going);
    });
  });

  describe('cancel', () => {
    const mockCancelInput: CancelEventParticipantInput = {
      eventId: mockEventId,
      userId: mockUserId,
    };

    it('should cancel a participant and return the updated participant object', async () => {
      const existingParticipant = {
        ...mockEventParticipant,
        save: jest.fn().mockResolvedValue({ ...mockEventParticipant, status: ParticipantStatus.Cancelled }),
        toObject: jest.fn().mockReturnValue({
          ...mockEventParticipant,
          status: ParticipantStatus.Cancelled,
          cancelledAt: expect.any(Date),
        }),
      };

      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(existingParticipant));

      const result = await EventParticipantDAO.cancel(mockCancelInput);

      expect(result.status).toBe(ParticipantStatus.Cancelled);
      expect(EventParticipantModel.findOne).toHaveBeenCalledWith({ eventId: mockEventId, userId: mockUserId });
      expect(existingParticipant.save).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND GraphQLError when participant is not found', async () => {
      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventParticipantDAO.cancel(mockCancelInput)).rejects.toThrow(
        CustomError(`Participant not found for event ${mockEventId}`, ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new MockMongoError(0);
      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.cancel(mockCancelInput)).rejects.toThrow(GraphQLError);
    });

    it('should re-throw GraphQLError', async () => {
      const mockGraphqlError = new GraphQLError('GraphQL Error');
      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockGraphqlError));

      await expect(EventParticipantDAO.cancel(mockCancelInput)).rejects.toThrow(mockGraphqlError);
    });
  });

  describe('readByEvent', () => {
    it('should return an array of participants for an event', async () => {
      const mockParticipants = [
        {
          ...mockEventParticipant,
          userId: 'user1',
          toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, userId: 'user1' }),
        },
        {
          ...mockEventParticipant,
          userId: 'user2',
          toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, userId: 'user2' }),
        },
      ];

      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockParticipants));

      const result = await EventParticipantDAO.readByEvent(mockEventId);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user1');
      expect(result[1].userId).toBe('user2');
      expect(EventParticipantModel.find).toHaveBeenCalledWith({ eventId: mockEventId });
    });

    it('should return an empty array when no participants are found for an event', async () => {
      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      const result = await EventParticipantDAO.readByEvent(mockEventId);

      expect(result).toEqual([]);
      expect(EventParticipantModel.find).toHaveBeenCalledWith({ eventId: mockEventId });
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when find throws an unknown error', async () => {
      const mockError = new Error('Database Error');
      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.readByEvent(mockEventId)).rejects.toThrow(GraphQLError);
    });

    it('should handle multiple participants with different statuses', async () => {
      const mockParticipants = [
        {
          ...mockEventParticipant,
          userId: 'user1',
          status: ParticipantStatus.Going,
          toObject: jest
            .fn()
            .mockReturnValue({ ...mockEventParticipant, userId: 'user1', status: ParticipantStatus.Going }),
        },
        {
          ...mockEventParticipant,
          userId: 'user2',
          status: ParticipantStatus.Interested,
          toObject: jest
            .fn()
            .mockReturnValue({ ...mockEventParticipant, userId: 'user2', status: ParticipantStatus.Interested }),
        },
        {
          ...mockEventParticipant,
          userId: 'user3',
          status: ParticipantStatus.Cancelled,
          toObject: jest
            .fn()
            .mockReturnValue({ ...mockEventParticipant, userId: 'user3', status: ParticipantStatus.Cancelled }),
        },
      ];

      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockParticipants));

      const result = await EventParticipantDAO.readByEvent(mockEventId);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe(ParticipantStatus.Going);
      expect(result[1].status).toBe(ParticipantStatus.Interested);
      expect(result[2].status).toBe(ParticipantStatus.Cancelled);
    });
  });

  describe('readByUser', () => {
    it('should return RSVPs for a user excluding cancelled by default', async () => {
      const mockParticipants = [
        {
          ...mockEventParticipant,
          eventId: 'event1',
          toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, eventId: 'event1' }),
        },
        {
          ...mockEventParticipant,
          eventId: 'event2',
          toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, eventId: 'event2' }),
        },
      ];

      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockParticipants));

      const result = await EventParticipantDAO.readByUser(mockUserId);

      expect(result).toHaveLength(2);
      expect(EventParticipantModel.find).toHaveBeenCalledWith({
        userId: mockUserId,
        status: { $ne: ParticipantStatus.Cancelled },
      });
    });

    it('should include cancelled RSVPs when activeOnly is false', async () => {
      const mockParticipants = [
        {
          ...mockEventParticipant,
          status: ParticipantStatus.Cancelled,
          toObject: jest.fn().mockReturnValue({ ...mockEventParticipant, status: ParticipantStatus.Cancelled }),
        },
      ];

      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockParticipants));

      const result = await EventParticipantDAO.readByUser(mockUserId, false);

      expect(result).toHaveLength(1);
      expect(EventParticipantModel.find).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should return empty array when user has no RSVPs', async () => {
      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      const result = await EventParticipantDAO.readByUser(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database Error');
      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.readByUser(mockUserId)).rejects.toThrow(GraphQLError);
    });
  });

  describe('readByEventAndUser', () => {
    it('should return the participant when found', async () => {
      const mockParticipant = {
        ...mockEventParticipant,
        toObject: jest.fn().mockReturnValue(mockEventParticipant),
      };

      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockParticipant));

      const result = await EventParticipantDAO.readByEventAndUser(mockEventId, mockUserId);

      expect(result).toEqual(mockEventParticipant);
      expect(EventParticipantModel.findOne).toHaveBeenCalledWith({ eventId: mockEventId, userId: mockUserId });
    });

    it('should return null when participant is not found', async () => {
      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const result = await EventParticipantDAO.readByEventAndUser(mockEventId, mockUserId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database Error');
      (EventParticipantModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.readByEventAndUser(mockEventId, mockUserId)).rejects.toThrow(GraphQLError);
    });
  });

  describe('countByEvent', () => {
    it('should count participants excluding cancelled by default', async () => {
      (EventParticipantModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(5));

      const result = await EventParticipantDAO.countByEvent(mockEventId);

      expect(result).toBe(5);
      expect(EventParticipantModel.countDocuments).toHaveBeenCalledWith({
        eventId: mockEventId,
        status: { $ne: ParticipantStatus.Cancelled },
      });
    });

    it('should count participants with specific statuses when provided', async () => {
      (EventParticipantModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(3));

      const result = await EventParticipantDAO.countByEvent(mockEventId, [ParticipantStatus.Going]);

      expect(result).toBe(3);
      expect(EventParticipantModel.countDocuments).toHaveBeenCalledWith({
        eventId: mockEventId,
        status: { $in: [ParticipantStatus.Going] },
      });
    });

    it('should count participants with multiple statuses', async () => {
      (EventParticipantModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(7));

      const result = await EventParticipantDAO.countByEvent(mockEventId, [
        ParticipantStatus.Going,
        ParticipantStatus.Interested,
      ]);

      expect(result).toBe(7);
      expect(EventParticipantModel.countDocuments).toHaveBeenCalledWith({
        eventId: mockEventId,
        status: { $in: [ParticipantStatus.Going, ParticipantStatus.Interested] },
      });
    });

    it('should return 0 when no participants match', async () => {
      (EventParticipantModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(0));

      const result = await EventParticipantDAO.countByEvent(mockEventId);

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const mockError = new MockMongoError(0);
      (EventParticipantModel.countDocuments as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.countByEvent(mockEventId)).rejects.toThrow(GraphQLError);
    });
  });
});
