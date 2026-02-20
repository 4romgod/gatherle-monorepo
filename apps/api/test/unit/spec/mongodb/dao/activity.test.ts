import { GraphQLError } from 'graphql';
import { ActivityDAO } from '@/mongodb/dao';
import { Activity as ActivityModel } from '@/mongodb/models';
import type { Activity as ActivityEntity, CreateActivityInput } from '@gatherle/commons/types';
import { ActivityObjectType, ActivityVerb, ActivityVisibility } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from '@/utils';
import { MockMongoError } from '@/test/utils';
import { ERROR_MESSAGES } from '@/validation';

jest.mock('@/mongodb/models', () => ({
  Activity: {
    create: jest.fn(),
    find: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
});

describe('ActivityDAO', () => {
  const mockActivity: ActivityEntity = {
    activityId: 'activity-1',
    actorId: 'actor-1',
    verb: ActivityVerb.Published,
    objectType: ActivityObjectType.Event,
    objectId: 'event-1',
    targetType: ActivityObjectType.Event,
    targetId: 'event-1',
    visibility: ActivityVisibility.Public,
    eventAt: new Date('2024-01-01T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    metadata: {},
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates an activity and returns the object', async () => {
      (ActivityModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockActivity,
      });

      const input: CreateActivityInput & { actorId: string } = {
        actorId: 'actor-1',
        verb: ActivityVerb.Published,
        objectType: ActivityObjectType.Event,
        objectId: 'event-1',
        targetType: ActivityObjectType.Event,
        targetId: 'event-1',
        visibility: ActivityVisibility.Public,
        eventAt: new Date('2024-01-01T00:00:00Z'),
        metadata: {},
      };

      const result = await ActivityDAO.create(input);

      expect(ActivityModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...input, activityId: expect.any(String) }),
      );
      expect(result).toEqual(mockActivity);
    });

    it('rethrows GraphQLError from create', async () => {
      const graphQLError = new GraphQLError('GraphQL Error');
      (ActivityModel.create as jest.Mock).mockRejectedValue(graphQLError);

      const input: CreateActivityInput & { actorId: string } = {
        actorId: 'actor-1',
        verb: ActivityVerb.Published,
        objectType: ActivityObjectType.Event,
        objectId: 'event-1',
        targetType: ActivityObjectType.Event,
        targetId: 'event-1',
        visibility: ActivityVisibility.Public,
        eventAt: new Date('2024-01-01T00:00:00Z'),
        metadata: {},
      };

      await expect(ActivityDAO.create(input)).rejects.toThrow(graphQLError);
    });

    it('wraps unknown errors from create', async () => {
      (ActivityModel.create as jest.Mock).mockRejectedValue(new MockMongoError(0));

      const input: CreateActivityInput & { actorId: string } = {
        actorId: 'actor-1',
        verb: ActivityVerb.Published,
        objectType: ActivityObjectType.Event,
        objectId: 'event-1',
        targetType: ActivityObjectType.Event,
        targetId: 'event-1',
        visibility: ActivityVisibility.Public,
        eventAt: new Date('2024-01-01T00:00:00Z'),
        metadata: {},
      };

      await expect(ActivityDAO.create(input)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readByActor', () => {
    it('reads activities by actor and clamps limit', async () => {
      (ActivityModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockActivity,
          },
        ]),
      );

      const result = await ActivityDAO.readByActor('actor-1', 200);

      expect(ActivityModel.find).toHaveBeenCalledWith({ actorId: 'actor-1' });
      expect(result).toEqual([mockActivity]);
      const query = (ActivityModel.find as jest.Mock).mock.results[0].value;
      expect(query.limit).toHaveBeenCalledWith(100);
    });

    it('wraps errors when reading by actor', async () => {
      (ActivityModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(ActivityDAO.readByActor('actor-1')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('readByActorIds', () => {
    it('returns empty array when actorIds is empty', async () => {
      const result = await ActivityDAO.readByActorIds([]);

      expect(result).toEqual([]);
      expect(ActivityModel.find).not.toHaveBeenCalled();
    });

    it('reads activities for multiple actors', async () => {
      (ActivityModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([
          {
            toObject: () => mockActivity,
          },
        ]),
      );

      const result = await ActivityDAO.readByActorIds(['actor-1', 'actor-2'], 0);

      expect(ActivityModel.find).toHaveBeenCalledWith({ actorId: { $in: ['actor-1', 'actor-2'] } });
      expect(result).toEqual([mockActivity]);
      const query = (ActivityModel.find as jest.Mock).mock.results[0].value;
      expect(query.limit).toHaveBeenCalledWith(1);
    });

    it('wraps errors when reading by actor ids', async () => {
      (ActivityModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new MockMongoError(0)));

      await expect(ActivityDAO.readByActorIds(['actor-1'])).rejects.toThrow(
        CustomError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, ErrorTypes.INTERNAL_SERVER_ERROR),
      );
    });
  });
});
