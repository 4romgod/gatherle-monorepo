import { GraphQLError } from 'graphql';
import { WebSocketConnectionDAO } from '@/mongodb/dao';
import { WebSocketConnection as WebSocketConnectionModel } from '@/mongodb/models';
import { MockMongoError } from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  WebSocketConnection: {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  KnownCommonError: jest.fn((error: unknown) => {
    if (error instanceof GraphQLError) return error;
    return new GraphQLError('Internal server error');
  }),
  logDaoError: jest.fn(),
}));

const createExecQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const createFailedExecQuery = <T>(error: T) => ({
  exec: jest.fn().mockRejectedValue(error),
});

const BASE_INPUT = {
  connectionId: 'conn-1',
  userId: 'user-1',
  domainName: 'abc.execute-api.us-east-1.amazonaws.com',
  stage: 'beta',
};

const BASE_RECORD = {
  connectionId: 'conn-1',
  userId: 'user-1',
  domainName: 'abc.execute-api.us-east-1.amazonaws.com',
  stage: 'beta',
  connectedAt: new Date('2026-01-01T00:00:00Z'),
  lastSeenAt: new Date('2026-01-01T00:01:00Z'),
};

describe('WebSocketConnectionDAO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertConnection', () => {
    it('returns record on success', async () => {
      (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createExecQuery({ toObject: () => BASE_RECORD }),
      );

      const result = await WebSocketConnectionDAO.upsertConnection(BASE_INPUT);

      expect(WebSocketConnectionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { connectionId: 'conn-1' },
        expect.objectContaining({
          $set: expect.objectContaining({ userId: 'user-1', domainName: BASE_INPUT.domainName }),
          $setOnInsert: expect.objectContaining({ connectedAt: expect.any(Date) }),
        }),
        { new: true, upsert: true },
      );
      expect(result).toEqual(BASE_RECORD);
    });

    it('sets expiresAt when ttlHours > 0', async () => {
      (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createExecQuery({ toObject: () => BASE_RECORD }),
      );
      const before = Date.now();

      await WebSocketConnectionDAO.upsertConnection({ ...BASE_INPUT, ttlHours: 24 });

      const after = Date.now();
      const setPayload = (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
      expect(setPayload.expiresAt).toBeInstanceOf(Date);
      expect(setPayload.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 24 * 3600 * 1000);
      expect(setPayload.expiresAt.getTime()).toBeLessThanOrEqual(after + 24 * 3600 * 1000);
    });

    it('expiresAt is undefined when ttlHours is 0', async () => {
      (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createExecQuery({ toObject: () => BASE_RECORD }),
      );

      await WebSocketConnectionDAO.upsertConnection({ ...BASE_INPUT, ttlHours: 0 });

      const setPayload = (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
      expect(setPayload.expiresAt).toBeUndefined();
    });

    it('expiresAt is undefined when ttlHours is omitted', async () => {
      (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createExecQuery({ toObject: () => BASE_RECORD }),
      );

      await WebSocketConnectionDAO.upsertConnection(BASE_INPUT);

      const setPayload = (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mock.calls[0][1].$set;
      expect(setPayload.expiresAt).toBeUndefined();
    });

    it('throws when model returns null', async () => {
      (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mockReturnValue(createExecQuery(null));

      await expect(WebSocketConnectionDAO.upsertConnection(BASE_INPUT)).rejects.toBeInstanceOf(GraphQLError);
    });

    it('re-throws DB errors via KnownCommonError', async () => {
      (WebSocketConnectionModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createFailedExecQuery(new MockMongoError(0)),
      );

      await expect(WebSocketConnectionDAO.upsertConnection(BASE_INPUT)).rejects.toBeInstanceOf(GraphQLError);
    });
  });

  describe('readConnectionByConnectionId', () => {
    it('returns record when connection is found', async () => {
      (WebSocketConnectionModel.findOne as jest.Mock).mockReturnValue(createExecQuery({ toObject: () => BASE_RECORD }));

      const result = await WebSocketConnectionDAO.readConnectionByConnectionId('conn-1');

      expect(WebSocketConnectionModel.findOne).toHaveBeenCalledWith({ connectionId: 'conn-1' });
      expect(result).toEqual(BASE_RECORD);
    });

    it('returns null when connection is not found', async () => {
      (WebSocketConnectionModel.findOne as jest.Mock).mockReturnValue(createExecQuery(null));

      const result = await WebSocketConnectionDAO.readConnectionByConnectionId('conn-missing');

      expect(result).toBeNull();
    });

    it('re-throws DB errors via KnownCommonError', async () => {
      (WebSocketConnectionModel.findOne as jest.Mock).mockReturnValue(createFailedExecQuery(new MockMongoError(0)));

      await expect(WebSocketConnectionDAO.readConnectionByConnectionId('conn-1')).rejects.toBeInstanceOf(GraphQLError);
    });
  });

  describe('touchConnection', () => {
    it('calls updateOne with correct filter and updates lastSeenAt', async () => {
      (WebSocketConnectionModel.updateOne as jest.Mock).mockReturnValue(createExecQuery({ modifiedCount: 1 }));

      await WebSocketConnectionDAO.touchConnection('conn-1');

      expect(WebSocketConnectionModel.updateOne).toHaveBeenCalledWith(
        { connectionId: 'conn-1' },
        { $set: expect.objectContaining({ lastSeenAt: expect.any(Date) }) },
      );
    });

    it('sets expiresAt in the update when ttlHours is provided', async () => {
      (WebSocketConnectionModel.updateOne as jest.Mock).mockReturnValue(createExecQuery({ modifiedCount: 1 }));
      const before = Date.now();

      await WebSocketConnectionDAO.touchConnection('conn-1', 12);

      const after = Date.now();
      const setPayload = (WebSocketConnectionModel.updateOne as jest.Mock).mock.calls[0][1].$set;
      expect(setPayload.expiresAt).toBeInstanceOf(Date);
      expect(setPayload.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 12 * 3600 * 1000);
      expect(setPayload.expiresAt.getTime()).toBeLessThanOrEqual(after + 12 * 3600 * 1000);
    });

    it('expiresAt is undefined in the update when ttlHours is omitted', async () => {
      (WebSocketConnectionModel.updateOne as jest.Mock).mockReturnValue(createExecQuery({ modifiedCount: 1 }));

      await WebSocketConnectionDAO.touchConnection('conn-1');

      const setPayload = (WebSocketConnectionModel.updateOne as jest.Mock).mock.calls[0][1].$set;
      expect(setPayload.expiresAt).toBeUndefined();
    });

    it('re-throws DB errors via KnownCommonError', async () => {
      (WebSocketConnectionModel.updateOne as jest.Mock).mockReturnValue(createFailedExecQuery(new MockMongoError(0)));

      await expect(WebSocketConnectionDAO.touchConnection('conn-1')).rejects.toBeInstanceOf(GraphQLError);
    });
  });

  describe('removeConnection', () => {
    it('returns true when deletedCount > 0', async () => {
      (WebSocketConnectionModel.deleteOne as jest.Mock).mockReturnValue(createExecQuery({ deletedCount: 1 }));

      const result = await WebSocketConnectionDAO.removeConnection('conn-1');

      expect(WebSocketConnectionModel.deleteOne).toHaveBeenCalledWith({ connectionId: 'conn-1' });
      expect(result).toBe(true);
    });

    it('returns false when deletedCount === 0', async () => {
      (WebSocketConnectionModel.deleteOne as jest.Mock).mockReturnValue(createExecQuery({ deletedCount: 0 }));

      const result = await WebSocketConnectionDAO.removeConnection('conn-missing');

      expect(result).toBe(false);
    });

    it('re-throws DB errors via KnownCommonError', async () => {
      (WebSocketConnectionModel.deleteOne as jest.Mock).mockReturnValue(createFailedExecQuery(new MockMongoError(0)));

      await expect(WebSocketConnectionDAO.removeConnection('conn-1')).rejects.toBeInstanceOf(GraphQLError);
    });
  });

  describe('readConnectionsByUserId', () => {
    it('returns mapped array of records', async () => {
      const records = [
        { toObject: () => BASE_RECORD },
        { toObject: () => ({ ...BASE_RECORD, connectionId: 'conn-2' }) },
      ];
      (WebSocketConnectionModel.find as jest.Mock).mockReturnValue(createExecQuery(records));

      const result = await WebSocketConnectionDAO.readConnectionsByUserId('user-1');

      expect(WebSocketConnectionModel.find).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(BASE_RECORD);
      expect(result[1].connectionId).toBe('conn-2');
    });

    it('returns empty array when user has no connections', async () => {
      (WebSocketConnectionModel.find as jest.Mock).mockReturnValue(createExecQuery([]));

      const result = await WebSocketConnectionDAO.readConnectionsByUserId('user-no-connections');

      expect(result).toEqual([]);
    });

    it('re-throws DB errors via KnownCommonError', async () => {
      (WebSocketConnectionModel.find as jest.Mock).mockReturnValue(createFailedExecQuery(new MockMongoError(0)));

      await expect(WebSocketConnectionDAO.readConnectionsByUserId('user-1')).rejects.toBeInstanceOf(GraphQLError);
    });
  });
});
