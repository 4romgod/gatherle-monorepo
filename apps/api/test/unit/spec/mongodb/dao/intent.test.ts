import {GraphQLError} from 'graphql';
import {IntentDAO} from '@/mongodb/dao';
import {Intent as IntentModel} from '@/mongodb/models';
import type {Intent, UpsertIntentInput} from '@ntlango/commons/types';
import {IntentSource, IntentStatus, IntentVisibility} from '@ntlango/commons/types';
import {CustomError, ErrorTypes} from '@/utils';
import {MockMongoError} from '@/test/utils';
import {ERROR_MESSAGES} from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Intent: {
    findOneAndUpdate: jest.fn(),
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
      (IntentModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockIntent,
        }),
      );

      const input: UpsertIntentInput & {userId: string} = {
        userId: 'user-1',
        eventId: 'event-1',
        status: IntentStatus.Interested,
      };

      const result = await IntentDAO.upsert(input);

      const [filter, updateQuery] = (IntentModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(filter).toEqual({userId: 'user-1', eventId: 'event-1'});
      expect(updateQuery.$set).toEqual(expect.objectContaining({status: IntentStatus.Interested}));
      expect(updateQuery.$setOnInsert).toEqual(expect.objectContaining({intentId: expect.any(String), userId: 'user-1', eventId: 'event-1'}));
      expect(result).toEqual(mockIntent);
    });

    it('uses intentId filter when provided and skips empty updates', async () => {
      (IntentModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockIntent,
        }),
      );

      await IntentDAO.upsert({userId: 'user-1', eventId: 'event-1', intentId: 'intent-1'});

      const [filter, updateQuery] = (IntentModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(filter).toEqual({intentId: 'intent-1'});
      expect(updateQuery.$set).toBeUndefined();
    });

    it('throws when intent is missing', async () => {
      (IntentModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(IntentDAO.upsert({userId: 'user-1', eventId: 'event-1'})).rejects.toThrow(
        CustomError('Unable to persist intent', ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });

    it('rethrows GraphQLError', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (IntentModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(graphQLError));

      await expect(IntentDAO.upsert({userId: 'user-1', eventId: 'event-1'})).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors', async () => {
      (IntentModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(IntentDAO.upsert({userId: 'user-1', eventId: 'event-1'})).rejects.toThrow(
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

      expect(IntentModel.find).toHaveBeenCalledWith({userId: 'user-1'});
      expect(result).toEqual([mockIntent]);
    });

    it('wraps errors', async () => {
      (IntentModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(IntentDAO.readByUser('user-1')).rejects.toThrow(CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR));
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

      expect(IntentModel.find).toHaveBeenCalledWith({eventId: 'event-1'});
      expect(result).toEqual([mockIntent]);
    });
  });
});
