import { GraphQLError } from 'graphql';
import { IntentDAO } from '@/mongodb/dao';
import { Intent as IntentModel } from '@/mongodb/models';
import type { Intent, UpsertIntentInput } from '@gatherle/commons/types';
import { IntentSource, IntentStatus, IntentVisibility } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from '@/utils';
import { MockMongoError } from '@/test/utils';
import { ERROR_MESSAGES } from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Intent: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
});

describe('IntentDAO', () => {
  const mockIntent: Intent = {
    intentId: 'intent-1',
    userId: 'user-1',
    eventId: 'event-1',
    status: IntentStatus.Interested,
    visibility: IntentVisibility.Public,
    source: IntentSource.Manual,
    participantId: 'participant-1',
    metadata: {},
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('upserts intent with updates', async () => {
      // Mock findOne to return null (no existing intent)
      (IntentModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      // Mock create to return new intent
      (IntentModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockIntent,
      });

      const input: UpsertIntentInput & { userId: string } = {
        userId: 'user-1',
        eventId: 'event-1',
        status: IntentStatus.Interested,
      };

      const result = await IntentDAO.upsert(input);

      expect(IntentModel.findOne).toHaveBeenCalledWith({ userId: 'user-1', eventId: 'event-1' });
      expect(IntentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', eventId: 'event-1', status: IntentStatus.Interested }),
      );
      expect(result).toEqual(mockIntent);
    });

    it('includes optional fields when provided', async () => {
      (IntentModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (IntentModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockIntent,
      });

      const input: UpsertIntentInput & { userId: string } = {
        userId: 'user-1',
        eventId: 'event-1',
        status: IntentStatus.Going,
        visibility: IntentVisibility.Private,
        source: IntentSource.Invite,
        participantId: 'participant-1',
        metadata: { note: 'invite' },
      };

      await IntentDAO.upsert(input);

      expect(IntentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: IntentStatus.Going,
          visibility: IntentVisibility.Private,
          source: IntentSource.Invite,
          participantId: 'participant-1',
          metadata: { note: 'invite' },
        }),
      );
    });

    it('uses intentId filter when provided and updates existing intent', async () => {
      const mockSave = jest.fn().mockResolvedValue({ toObject: () => mockIntent });
      (IntentModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          ...mockIntent,
          save: mockSave,
          toObject: () => mockIntent,
        }),
      );

      await IntentDAO.upsert({ userId: 'user-1', eventId: 'event-1', intentId: 'intent-1' });

      expect(IntentModel.findOne).toHaveBeenCalledWith({ intentId: 'intent-1' });
      // When no updates are provided, save still happens (no-op update)
      expect(mockSave).toHaveBeenCalled();
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (IntentModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(IntentDAO.upsert({ userId: 'user-1', eventId: 'event-1' })).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (IntentModel.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(IntentDAO.upsert({ userId: 'user-1', eventId: 'event-1' })).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readByUser', () => {
    it('reads user intents', async () => {
      (IntentModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockIntent,
          },
        ]),
      );

      const result = await IntentDAO.readByUser('user-1');

      expect(IntentModel.find).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual([mockIntent]);
    });

    it('wraps errors', async () => {
      (IntentModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(IntentDAO.readByUser('user-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readByEvent', () => {
    it('reads event intents', async () => {
      (IntentModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockIntent,
          },
        ]),
      );

      const result = await IntentDAO.readByEvent('event-1');

      expect(IntentModel.find).toHaveBeenCalledWith({ eventId: 'event-1' });
      expect(result).toEqual([mockIntent]);
    });

    it('wraps errors', async () => {
      (IntentModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(IntentDAO.readByEvent('event-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
