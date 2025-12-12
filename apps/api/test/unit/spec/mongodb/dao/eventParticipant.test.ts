import {EventParticipantDAO} from '@/mongodb/dao';
import {EventParticipant as EventParticipantModel} from '@/mongodb/models';
import {
  EventParticipant,
  UpsertEventParticipantInput,
  CancelEventParticipantInput,
  ParticipantStatus,
  ParticipantVisibility,
} from '@ntlango/commons/types';
import {CustomError, ErrorTypes} from '@/utils';
import {GraphQLError} from 'graphql';
import {MockMongoError} from '@/test/utils';
import {Types} from 'mongoose';

jest.mock('@/mongodb/models', () => ({
  EventParticipant: {
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
  },
}));

// Helper function to create a mock mongoose chainable query
const createMockSuccessMongooseQuery = <T>(result: T) => ({
  ...result,
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  ...error,
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

    it('should upsert a participant and return the participant object', async () => {
      const mockResult = {
        ...mockEventParticipant,
        quantity: 2,
        sharedVisibility: ParticipantVisibility.Public,
        toObject: jest.fn().mockReturnValue({
          ...mockEventParticipant,
          quantity: 2,
          sharedVisibility: ParticipantVisibility.Public,
        }),
      };

      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockResult));

      const result = await EventParticipantDAO.upsert(mockUpsertInput);

      expect(result).toEqual({
        ...mockEventParticipant,
        quantity: 2,
        sharedVisibility: ParticipantVisibility.Public,
      });
      expect(EventParticipantModel.findOneAndUpdate).toHaveBeenCalledWith(
        {eventId: mockEventId, userId: mockUserId},
        {
          status: ParticipantStatus.Going,
          quantity: 2,
          invitedBy: 'user789',
          sharedVisibility: ParticipantVisibility.Public,
          $setOnInsert: {
            participantId: expect.any(String),
            rsvpAt: expect.any(Date),
          },
        },
        {new: true, upsert: true, setDefaultsOnInsert: true},
      );
    });

    it('should create a new participant with $setOnInsert fields on first upsert', async () => {
      const mockResult = {
        ...mockEventParticipant,
        toObject: jest.fn().mockReturnValue(mockEventParticipant),
      };

      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockResult));

      const result = await EventParticipantDAO.upsert(mockUpsertInput);

      expect(result).toEqual(mockEventParticipant);
      const callArgs = (EventParticipantModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(callArgs[1].$setOnInsert).toHaveProperty('participantId');
      expect(callArgs[1].$setOnInsert).toHaveProperty('rsvpAt');
      expect(callArgs[1].$setOnInsert.rsvpAt).toBeInstanceOf(Date);
    });

    it('should throw INTERNAL_SERVER_ERROR when findOneAndUpdate returns null', async () => {
      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventParticipantDAO.upsert(mockUpsertInput)).rejects.toThrow(
        CustomError('Unable to upsert participant', ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when findOneAndUpdate throws an unknown error', async () => {
      const mockError = new Error('Database Error');
      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.upsert(mockUpsertInput)).rejects.toThrow(GraphQLError);
    });

    it('should re-throw GraphQLError when findOneAndUpdate throws a GraphQLError', async () => {
      const mockGraphqlError = new GraphQLError('GraphQL Error');
      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockGraphqlError));

      await expect(EventParticipantDAO.upsert(mockUpsertInput)).rejects.toThrow(mockGraphqlError);
    });

    it('should handle upsert with minimal required fields', async () => {
      const minimalInput: UpsertEventParticipantInput = {
        eventId: mockEventId,
        userId: mockUserId,
        status: ParticipantStatus.Interested,
      };

      const mockResult = {
        ...mockEventParticipant,
        status: ParticipantStatus.Interested,
        quantity: undefined,
        invitedBy: undefined,
        sharedVisibility: undefined,
        toObject: jest.fn().mockReturnValue({
          ...mockEventParticipant,
          status: ParticipantStatus.Interested,
          quantity: undefined,
          invitedBy: undefined,
          sharedVisibility: undefined,
        }),
      };

      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockResult));

      const result = await EventParticipantDAO.upsert(minimalInput);

      expect(result.status).toBe(ParticipantStatus.Interested);
      expect(EventParticipantModel.findOneAndUpdate).toHaveBeenCalledWith(
        {eventId: mockEventId, userId: mockUserId},
        expect.objectContaining({
          status: ParticipantStatus.Interested,
        }),
        {new: true, upsert: true, setDefaultsOnInsert: true},
      );
    });
  });

  describe('cancel', () => {
    const mockCancelInput: CancelEventParticipantInput = {
      eventId: mockEventId,
      userId: mockUserId,
    };

    it('should cancel a participant and return the updated participant object', async () => {
      const mockCancelledParticipant = {
        ...mockEventParticipant,
        status: ParticipantStatus.Cancelled,
        cancelledAt: new Date('2024-01-02T00:00:00.000Z'),
        toObject: jest.fn().mockReturnValue({
          ...mockEventParticipant,
          status: ParticipantStatus.Cancelled,
          cancelledAt: new Date('2024-01-02T00:00:00.000Z'),
        }),
      };

      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockCancelledParticipant));

      const result = await EventParticipantDAO.cancel(mockCancelInput);

      expect(result.status).toBe(ParticipantStatus.Cancelled);
      expect(result.cancelledAt).toBeDefined();
      expect(EventParticipantModel.findOneAndUpdate).toHaveBeenCalledWith(
        {eventId: mockEventId, userId: mockUserId},
        {status: ParticipantStatus.Cancelled, cancelledAt: expect.any(Date)},
        {new: true},
      );
    });

    it('should throw NOT_FOUND GraphQLError when participant is not found', async () => {
      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(EventParticipantDAO.cancel(mockCancelInput)).rejects.toThrow(
        CustomError(`Participant not found for event ${mockEventId}`, ErrorTypes.NOT_FOUND),
      );
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when findOneAndUpdate throws an unknown error', async () => {
      const mockError = new MockMongoError(0);
      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(EventParticipantDAO.cancel(mockCancelInput)).rejects.toThrow(GraphQLError);
    });

    it('should re-throw GraphQLError when findOneAndUpdate throws a GraphQLError', async () => {
      const mockGraphqlError = new GraphQLError('GraphQL Error');
      (EventParticipantModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockGraphqlError));

      await expect(EventParticipantDAO.cancel(mockCancelInput)).rejects.toThrow(mockGraphqlError);
    });

    it('should return mock participant when EventParticipant model is not available', async () => {
      // Save original method
      const originalFindOneAndUpdate = EventParticipantModel.findOneAndUpdate;
      
      // Temporarily set to undefined to simulate unavailable model
      (EventParticipantModel as any).findOneAndUpdate = undefined;

      const result = await EventParticipantDAO.cancel(mockCancelInput);

      expect(result).toEqual({
        participantId: `${mockEventId}-${mockUserId}`,
        eventId: mockEventId,
        userId: mockUserId,
        status: ParticipantStatus.Cancelled,
      });

      // Restore original method
      (EventParticipantModel as any).findOneAndUpdate = originalFindOneAndUpdate;
    });
  });

  describe('readByEvent', () => {
    it('should return an array of participants for an event', async () => {
      const mockParticipants = [
        {
          ...mockEventParticipant,
          userId: 'user1',
          toObject: jest.fn().mockReturnValue({...mockEventParticipant, userId: 'user1'}),
        },
        {
          ...mockEventParticipant,
          userId: 'user2',
          toObject: jest.fn().mockReturnValue({...mockEventParticipant, userId: 'user2'}),
        },
      ];

      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockParticipants));

      const result = await EventParticipantDAO.readByEvent(mockEventId);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user1');
      expect(result[1].userId).toBe('user2');
      expect(EventParticipantModel.find).toHaveBeenCalledWith({eventId: mockEventId});
    });

    it('should return an empty array when no participants are found for an event', async () => {
      (EventParticipantModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));

      const result = await EventParticipantDAO.readByEvent(mockEventId);

      expect(result).toEqual([]);
      expect(EventParticipantModel.find).toHaveBeenCalledWith({eventId: mockEventId});
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
          toObject: jest.fn().mockReturnValue({...mockEventParticipant, userId: 'user1', status: ParticipantStatus.Going}),
        },
        {
          ...mockEventParticipant,
          userId: 'user2',
          status: ParticipantStatus.Interested,
          toObject: jest.fn().mockReturnValue({...mockEventParticipant, userId: 'user2', status: ParticipantStatus.Interested}),
        },
        {
          ...mockEventParticipant,
          userId: 'user3',
          status: ParticipantStatus.Cancelled,
          toObject: jest.fn().mockReturnValue({...mockEventParticipant, userId: 'user3', status: ParticipantStatus.Cancelled}),
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
});
