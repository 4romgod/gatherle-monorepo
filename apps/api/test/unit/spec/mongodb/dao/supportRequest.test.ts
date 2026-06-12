import { GraphQLError } from 'graphql';
import SupportRequestDAO from '@/mongodb/dao/supportRequest';
import { SupportRequest as SupportRequestModel } from '@/mongodb/models';
import { logDaoError } from '@/utils';
import { SupportRequestStatus } from '@gatherle/commons/server/types';

jest.mock('@/mongodb/models', () => ({
  SupportRequest: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('@/utils', () => {
  const actual = jest.requireActual('@/utils');
  return {
    ...actual,
    logDaoError: jest.fn(),
  };
});

const createQueryChain = <T>(value: T, shouldReject = false) => {
  const exec = jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value)));
  const limit = jest.fn().mockReturnValue({ exec });
  const sort = jest.fn().mockReturnValue({ limit });
  return { exec, limit, sort };
};

const createSupportRequestDocument = (overrides: Record<string, unknown> = {}) => {
  const object = {
    createdAt: new Date('2026-06-12T08:00:00.000Z'),
    kind: 'Bug',
    message: 'Notifications fail after I save settings.',
    requesterEmail: 'member@example.com',
    requesterUserId: 'user-123',
    status: SupportRequestStatus.Open,
    subject: 'Notifications not working',
    supportRequestId: 'support-1',
    ...overrides,
  };

  return {
    toObject: jest.fn(() => object),
  };
};

describe('SupportRequestDAO', () => {
  const modelMock = SupportRequestModel as unknown as {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readMany', () => {
    it('escapes special regex characters in the admin search term', async () => {
      const queryChain = createQueryChain([createSupportRequestDocument()]);
      modelMock.find.mockReturnValue(queryChain);

      const result = await SupportRequestDAO.readMany({
        limit: 25,
        search: 'alerts(a+)+.png',
        status: SupportRequestStatus.Open,
      });

      expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(queryChain.limit).toHaveBeenCalledWith(25);
      expect(result).toHaveLength(1);

      const filters = modelMock.find.mock.calls[0]?.[0] as {
        $or: Array<Record<string, { $regex: RegExp }>>;
        status: SupportRequestStatus;
      };

      expect(filters.status).toBe(SupportRequestStatus.Open);
      expect(filters.$or).toHaveLength(4);

      for (const matcher of filters.$or) {
        const regex = Object.values(matcher)[0]?.$regex;
        expect(regex).toBeInstanceOf(RegExp);
        expect(regex?.source).toBe('alerts\\(a\\+\\)\\+\\.png');
        expect(regex?.flags).toBe('i');
      }
    });

    it('wraps unexpected read failures', async () => {
      const error = new Error('mongo down');
      modelMock.find.mockReturnValue(createQueryChain(error, true));

      await expect(SupportRequestDAO.readMany({ search: 'alerts' })).rejects.toBeInstanceOf(GraphQLError);
      expect(logDaoError).toHaveBeenCalledWith(
        'Error reading support requests',
        expect.objectContaining({
          error,
          limit: 100,
        }),
      );
    });
  });
});
