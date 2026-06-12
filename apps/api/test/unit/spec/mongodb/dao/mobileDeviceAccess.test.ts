import { GraphQLError } from 'graphql';
import MobileDeviceAccessDAO from '@/mongodb/dao/mobileDeviceAccess';
import MobileDeviceAccessModel from '@/mongodb/models/mobileDeviceAccess';
import PushSubscriptionModel from '@/mongodb/models/pushSubscription';
import { emitMobileDeviceAccessMetrics, logDaoError } from '@/utils';
import {
  MobileDeviceAccessPlatform,
  MobileDeviceAccessStatus,
  PushSubscriptionProvider,
} from '@gatherle/commons/server/types';

jest.mock('@/mongodb/models/mobileDeviceAccess', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('@/mongodb/models/pushSubscription', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('@/utils', () => {
  const actual = jest.requireActual('@/utils');
  return {
    ...actual,
    emitMobileDeviceAccessMetrics: jest.fn(),
    logDaoError: jest.fn(),
  };
});

const createExecQuery = <T>(value: T, shouldReject = false) => ({
  exec: jest.fn().mockImplementation(() => (shouldReject ? Promise.reject(value) : Promise.resolve(value))),
});

const createDeviceAccessDocument = (overrides: Record<string, unknown> = {}) => {
  const doc: Record<string, unknown> = {
    deviceInstallationId: 'install-1',
    platform: MobileDeviceAccessPlatform.Android,
    status: MobileDeviceAccessStatus.Approved,
    appVersion: undefined,
    buildVersion: undefined,
    firstSeenAt: new Date('2026-06-09T10:00:00.000Z'),
    lastSeenAt: new Date('2026-06-09T10:00:00.000Z'),
    seenUserIds: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  doc.toObject = jest.fn(() => ({
    appVersion: doc.appVersion,
    buildVersion: doc.buildVersion,
    deviceInstallationId: doc.deviceInstallationId,
    firstSeenAt: doc.firstSeenAt,
    lastSeenAt: doc.lastSeenAt,
    lastSeenUserId: doc.lastSeenUserId,
    platform: doc.platform,
    reviewedAt: doc.reviewedAt,
    reviewedByUserId: doc.reviewedByUserId,
    seenUserIds: doc.seenUserIds,
    status: doc.status,
  }));

  return doc;
};

describe('MobileDeviceAccessDAO', () => {
  const modelMock = MobileDeviceAccessModel as unknown as {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    updateOne: jest.Mock;
  };
  const pushSubscriptionModelMock = PushSubscriptionModel as unknown as {
    find: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('updates an existing installation heartbeat and trims version metadata', async () => {
      const existingDoc = createDeviceAccessDocument({
        appVersion: '1.0.0',
        buildVersion: '100',
        status: MobileDeviceAccessStatus.Approved,
      });
      modelMock.findOne.mockReturnValue(createExecQuery(existingDoc));

      const result = await MobileDeviceAccessDAO.register({
        appVersion: ' 2.0.0 ',
        buildVersion: ' 200 ',
        deviceInstallationId: 'install-1',
        platform: MobileDeviceAccessPlatform.Ios,
      });

      expect(existingDoc.platform).toBe(MobileDeviceAccessPlatform.Ios);
      expect(existingDoc.appVersion).toBe('2.0.0');
      expect(existingDoc.buildVersion).toBe('200');
      expect(existingDoc.save).toHaveBeenCalledTimes(1);
      expect(emitMobileDeviceAccessMetrics).toHaveBeenCalledWith({
        appVersion: '2.0.0',
        buildVersion: '200',
        deviceInstallationId: 'install-1',
        metrics: {
          InstallationHeartbeat: 1,
        },
        status: MobileDeviceAccessStatus.Approved,
      });
      expect(result.deviceAccess).toMatchObject({
        appVersion: '2.0.0',
        buildVersion: '200',
        deviceInstallationId: 'install-1',
        platform: MobileDeviceAccessPlatform.Ios,
        status: MobileDeviceAccessStatus.Approved,
      });
      expect(result.registrationSecret).toEqual(expect.any(String));
    });

    it('creates a new installation record and emits registration metrics', async () => {
      const createdDoc = createDeviceAccessDocument({
        deviceInstallationId: 'install-2',
      });
      modelMock.findOne.mockReturnValue(createExecQuery(null));
      modelMock.create.mockResolvedValue(createdDoc);

      const result = await MobileDeviceAccessDAO.register({
        appVersion: ' 3.0.0 ',
        buildVersion: ' 300 ',
        deviceInstallationId: 'install-2',
        platform: MobileDeviceAccessPlatform.Android,
      });

      expect(modelMock.create).toHaveBeenCalledWith({
        appVersion: '3.0.0',
        buildVersion: '300',
        deviceInstallationId: 'install-2',
        firstSeenAt: expect.any(Date),
        lastSeenAt: expect.any(Date),
        platform: MobileDeviceAccessPlatform.Android,
        registrationSecret: expect.any(String),
        status: MobileDeviceAccessStatus.Approved,
      });
      expect(emitMobileDeviceAccessMetrics).toHaveBeenCalledWith({
        appVersion: '3.0.0',
        buildVersion: '300',
        deviceInstallationId: 'install-2',
        metrics: {
          InstallationHeartbeat: 1,
          InstallationRegistration: 1,
        },
        status: MobileDeviceAccessStatus.Approved,
      });
      expect(result.deviceAccess).toMatchObject({
        deviceInstallationId: 'install-2',
        platform: MobileDeviceAccessPlatform.Android,
      });
      expect(result.registrationSecret).toEqual(expect.any(String));
    });

    it('promotes legacy pending installations to approved when they check in again', async () => {
      const existingDoc = createDeviceAccessDocument({
        status: MobileDeviceAccessStatus.Pending,
      });
      modelMock.findOne.mockReturnValue(createExecQuery(existingDoc));

      const result = await MobileDeviceAccessDAO.register({
        deviceInstallationId: 'install-legacy',
        platform: MobileDeviceAccessPlatform.Android,
      });

      expect(existingDoc.status).toBe(MobileDeviceAccessStatus.Approved);
      expect(existingDoc.save).toHaveBeenCalledTimes(1);
      expect(result.deviceAccess.status).toBe(MobileDeviceAccessStatus.Approved);
    });

    it('rethrows GraphQLError failures during registration', async () => {
      const error = new GraphQLError('bad register');
      modelMock.findOne.mockReturnValue(createExecQuery(error, true));

      await expect(
        MobileDeviceAccessDAO.register({
          deviceInstallationId: 'install-1',
          platform: MobileDeviceAccessPlatform.Android,
        }),
      ).rejects.toBe(error);

      expect(logDaoError).toHaveBeenCalledWith('Error registering mobile device access', {
        deviceInstallationId: 'install-1',
        error,
      });
    });

    it('wraps unknown registration failures', async () => {
      const error = new Error('mongo down');
      modelMock.findOne.mockReturnValue(createExecQuery(error, true));

      await expect(
        MobileDeviceAccessDAO.register({
          deviceInstallationId: 'install-1',
          platform: MobileDeviceAccessPlatform.Android,
        }),
      ).rejects.toBeInstanceOf(GraphQLError);
    });
  });

  describe('readByDeviceInstallationId', () => {
    it('returns the device access record when found', async () => {
      const deviceAccess = createDeviceAccessDocument();
      modelMock.findOne.mockReturnValue(createExecQuery(deviceAccess));

      await expect(MobileDeviceAccessDAO.readByDeviceInstallationId('install-1')).resolves.toMatchObject({
        deviceInstallationId: 'install-1',
      });
    });

    it('returns null when the installation is unknown', async () => {
      modelMock.findOne.mockReturnValue(createExecQuery(null));

      await expect(MobileDeviceAccessDAO.readByDeviceInstallationId('missing')).resolves.toBeNull();
    });

    it('wraps unexpected read failures', async () => {
      const error = new Error('read failed');
      modelMock.findOne.mockReturnValue(createExecQuery(error, true));

      await expect(MobileDeviceAccessDAO.readByDeviceInstallationId('install-1')).rejects.toBeInstanceOf(GraphQLError);
      expect(logDaoError).toHaveBeenCalledWith('Error reading mobile device access by installation ID', {
        deviceInstallationId: 'install-1',
        error,
      });
    });
  });

  describe('readMany', () => {
    it('applies status and text-search filters before sorting by recency', async () => {
      const sortExec = jest.fn().mockResolvedValue([createDeviceAccessDocument()]);
      const sort = jest.fn().mockReturnValue({ exec: sortExec });
      modelMock.find.mockReturnValue({ sort });

      const result = await MobileDeviceAccessDAO.readMany({
        search: ' user-1 ',
        status: MobileDeviceAccessStatus.Blocked,
      });

      expect(modelMock.find).toHaveBeenCalledWith({
        $or: [
          { deviceInstallationId: { $regex: 'user-1', $options: 'i' } },
          { appVersion: { $regex: 'user-1', $options: 'i' } },
          { buildVersion: { $regex: 'user-1', $options: 'i' } },
          { applicationId: { $regex: 'user-1', $options: 'i' } },
          { deviceBrand: { $regex: 'user-1', $options: 'i' } },
          { deviceModel: { $regex: 'user-1', $options: 'i' } },
          { osVersion: { $regex: 'user-1', $options: 'i' } },
          { lastSeenUserId: { $regex: 'user-1', $options: 'i' } },
          { seenUserIds: { $regex: 'user-1', $options: 'i' } },
        ],
        status: MobileDeviceAccessStatus.Blocked,
      });
      expect(sort).toHaveBeenCalledWith({ lastSeenAt: -1, createdAt: -1 });
      expect(result).toHaveLength(1);
    });

    it('reads all records when no filters are provided', async () => {
      const sortExec = jest.fn().mockResolvedValue([]);
      modelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: sortExec }),
      });

      await expect(MobileDeviceAccessDAO.readMany()).resolves.toEqual([]);
      expect(modelMock.find).toHaveBeenCalledWith({});
    });

    it('wraps unexpected list failures', async () => {
      const error = new Error('list failed');
      modelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(createExecQuery(error, true)),
      });

      await expect(MobileDeviceAccessDAO.readMany({ search: 'boom' })).rejects.toBeInstanceOf(GraphQLError);
      expect(logDaoError).toHaveBeenCalledWith('Error reading mobile device access records', {
        error,
        filters: {
          $or: [
            { deviceInstallationId: { $regex: 'boom', $options: 'i' } },
            { appVersion: { $regex: 'boom', $options: 'i' } },
            { buildVersion: { $regex: 'boom', $options: 'i' } },
            { applicationId: { $regex: 'boom', $options: 'i' } },
            { deviceBrand: { $regex: 'boom', $options: 'i' } },
            { deviceModel: { $regex: 'boom', $options: 'i' } },
            { osVersion: { $regex: 'boom', $options: 'i' } },
            { lastSeenUserId: { $regex: 'boom', $options: 'i' } },
            { seenUserIds: { $regex: 'boom', $options: 'i' } },
          ],
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('updates installation status and review metadata', async () => {
      const deviceAccess = createDeviceAccessDocument();
      modelMock.findOne.mockReturnValue(createExecQuery(deviceAccess));

      const result = await MobileDeviceAccessDAO.updateStatus(
        {
          deviceInstallationId: 'install-1',
          status: MobileDeviceAccessStatus.Approved,
        },
        'admin-1',
      );

      expect(deviceAccess.status).toBe(MobileDeviceAccessStatus.Approved);
      expect(deviceAccess.reviewedByUserId).toBe('admin-1');
      expect(deviceAccess.reviewedAt).toEqual(expect.any(Date));
      expect(deviceAccess.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        deviceInstallationId: 'install-1',
        reviewedByUserId: 'admin-1',
        status: MobileDeviceAccessStatus.Approved,
      });
    });

    it('throws NOT_FOUND when the installation does not exist', async () => {
      modelMock.findOne.mockReturnValue(createExecQuery(null));

      await expect(
        MobileDeviceAccessDAO.updateStatus(
          {
            deviceInstallationId: 'missing',
            status: MobileDeviceAccessStatus.Blocked,
          },
          'admin-1',
        ),
      ).rejects.toMatchObject({
        extensions: {
          code: 'NOT_FOUND',
        },
      });
    });

    it('wraps unexpected update failures', async () => {
      const error = new Error('save failed');
      modelMock.findOne.mockReturnValue(createExecQuery(error, true));

      await expect(
        MobileDeviceAccessDAO.updateStatus(
          {
            deviceInstallationId: 'install-1',
            status: MobileDeviceAccessStatus.Blocked,
          },
          'admin-1',
        ),
      ).rejects.toBeInstanceOf(GraphQLError);
    });
  });

  describe('readPushSummariesByDeviceInstallationIds', () => {
    it('returns an empty map without querying when the installation ids collapse to an empty set', async () => {
      await expect(MobileDeviceAccessDAO.readPushSummariesByDeviceInstallationIds([' ', '', '   '])).resolves.toEqual(
        new Map(),
      );
      expect(pushSubscriptionModelMock.find).not.toHaveBeenCalled();
    });

    it('aggregates active subscription counts, providers, and latest delivery timestamps per installation', async () => {
      const exec = jest.fn().mockResolvedValue([
        {
          deviceInstallationId: 'install-1',
          lastDeliveredAt: new Date('2026-06-11T08:00:00.000Z'),
          lastRegisteredAt: new Date('2026-06-11T09:00:00.000Z'),
          provider: PushSubscriptionProvider.Expo,
        },
        {
          deviceInstallationId: ' install-1 ',
          lastDeliveredAt: new Date('2026-06-11T10:00:00.000Z'),
          lastRegisteredAt: new Date('2026-06-11T11:00:00.000Z'),
          provider: PushSubscriptionProvider.Fcm,
        },
        {
          deviceInstallationId: 'install-2',
          lastRegisteredAt: new Date('2026-06-12T07:00:00.000Z'),
          provider: PushSubscriptionProvider.Expo,
        },
        {
          deviceInstallationId: '   ',
          lastDeliveredAt: new Date('2026-06-13T10:00:00.000Z'),
          lastRegisteredAt: new Date('2026-06-13T10:00:00.000Z'),
          provider: PushSubscriptionProvider.Expo,
        },
      ]);
      const lean = jest.fn().mockReturnValue({ exec });
      pushSubscriptionModelMock.find.mockReturnValue({ lean });

      const result = await MobileDeviceAccessDAO.readPushSummariesByDeviceInstallationIds([
        ' install-1 ',
        'install-2',
        'install-3',
        'install-1',
      ]);

      expect(pushSubscriptionModelMock.find).toHaveBeenCalledWith({
        deviceInstallationId: { $in: ['install-1', 'install-2', 'install-3'] },
        isActive: true,
      });
      expect(lean).toHaveBeenCalledTimes(1);
      expect(result.get('install-1')).toEqual({
        activeSubscriptionCount: 2,
        hasActiveSubscription: true,
        lastDeliveredAt: new Date('2026-06-11T10:00:00.000Z'),
        lastRegisteredAt: new Date('2026-06-11T11:00:00.000Z'),
        providers: [PushSubscriptionProvider.Expo, PushSubscriptionProvider.Fcm],
      });
      expect(result.get('install-2')).toEqual({
        activeSubscriptionCount: 1,
        hasActiveSubscription: true,
        lastDeliveredAt: undefined,
        lastRegisteredAt: new Date('2026-06-12T07:00:00.000Z'),
        providers: [PushSubscriptionProvider.Expo],
      });
      expect(result.get('install-3')).toEqual({
        activeSubscriptionCount: 0,
        hasActiveSubscription: false,
        providers: [],
      });
    });

    it('wraps unexpected push-summary query failures', async () => {
      const error = new Error('push summary failed');
      const uniqueIds = ['install-1', 'install-2'];
      pushSubscriptionModelMock.find.mockReturnValue({
        lean: jest.fn().mockReturnValue(createExecQuery(error, true)),
      });

      await expect(
        MobileDeviceAccessDAO.readPushSummariesByDeviceInstallationIds([' install-1 ', 'install-2', 'install-1']),
      ).rejects.toBeInstanceOf(GraphQLError);
      expect(logDaoError).toHaveBeenCalledWith('Error reading mobile device push summaries', {
        deviceInstallationIds: uniqueIds,
        error,
      });
    });
  });

  describe('recordAuthenticatedUse', () => {
    it('stores the latest authenticated user and trimmed version metadata', async () => {
      modelMock.updateOne.mockReturnValue(createExecQuery({ acknowledged: true }));

      await expect(
        MobileDeviceAccessDAO.recordAuthenticatedUse({
          appVersion: ' 4.0.0 ',
          buildVersion: ' 400 ',
          deviceInstallationId: 'install-1',
          userId: 'user-1',
        }),
      ).resolves.toBeUndefined();

      expect(modelMock.updateOne).toHaveBeenCalledWith(
        {
          $or: expect.arrayContaining([
            { lastSeenUserId: { $ne: 'user-1' } },
            { lastAuthenticatedAt: { $exists: false } },
            { lastAuthenticatedAt: { $lt: expect.any(Date) } },
            { appVersion: { $ne: '4.0.0' } },
            { buildVersion: { $ne: '400' } },
          ]),
          deviceInstallationId: 'install-1',
        },
        {
          $addToSet: {
            seenUserIds: 'user-1',
          },
          $set: {
            appVersion: '4.0.0',
            buildVersion: '400',
            lastAuthenticatedAt: expect.any(Date),
            lastSeenAt: expect.any(Date),
            lastSeenUserId: 'user-1',
          },
        },
      );
    });

    it('omits version comparisons when app metadata is not provided', async () => {
      modelMock.updateOne.mockReturnValue(createExecQuery({ acknowledged: true }));

      await MobileDeviceAccessDAO.recordAuthenticatedUse({
        deviceInstallationId: 'install-2',
        userId: 'user-2',
      });

      const [filter, update] = modelMock.updateOne.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
      expect(filter.$or).toEqual([
        { lastSeenUserId: { $ne: 'user-2' } },
        { lastAuthenticatedAt: { $exists: false } },
        { lastAuthenticatedAt: { $lt: expect.any(Date) } },
      ]);
      expect(update).toEqual({
        $addToSet: {
          seenUserIds: 'user-2',
        },
        $set: {
          lastAuthenticatedAt: expect.any(Date),
          lastSeenAt: expect.any(Date),
          lastSeenUserId: 'user-2',
        },
      });
    });

    it('wraps unexpected heartbeat persistence failures', async () => {
      const error = new Error('update failed');
      modelMock.updateOne.mockReturnValue(createExecQuery(error, true));

      await expect(
        MobileDeviceAccessDAO.recordAuthenticatedUse({
          deviceInstallationId: 'install-1',
          userId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(GraphQLError);

      expect(logDaoError).toHaveBeenCalledWith('Error recording authenticated mobile installation use', {
        deviceInstallationId: 'install-1',
        error,
        userId: 'user-1',
      });
    });
  });
});
