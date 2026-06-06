import { GraphQLError } from 'graphql';
import { PushSubscriptionDAO } from '@/mongodb/dao';
import { PushSubscription as PushSubscriptionModel } from '@/mongodb/models';
import { PushSubscriptionPlatform, PushSubscriptionProvider } from '@gatherle/commons/server/types';
import { MockMongoError } from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  PushSubscription: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  exec: jest.fn().mockRejectedValue(error),
});

describe('PushSubscriptionDAO', () => {
  const registeredSubscription = {
    pushSubscriptionId: 'push-1',
    userId: 'user-1',
    provider: PushSubscriptionProvider.Fcm,
    platform: PushSubscriptionPlatform.Android,
    token: 'fcm-token-1:APA91bExampleTokenValue',
    deviceInstallationId: 'install-1',
    isActive: true,
    lastRegisteredAt: new Date('2026-06-05T10:00:00.000Z'),
    lastDeliveredAt: undefined,
    createdAt: new Date('2026-06-05T10:00:00.000Z'),
    updatedAt: new Date('2026-06-05T10:00:00.000Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new push subscription when the token is not known', async () => {
    (PushSubscriptionModel.updateMany as jest.Mock)
      .mockReturnValueOnce(createMockSuccessMongooseQuery({ modifiedCount: 0 }))
      .mockReturnValueOnce(createMockSuccessMongooseQuery({ modifiedCount: 0 }));
    (PushSubscriptionModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
    (PushSubscriptionModel.create as jest.Mock).mockResolvedValue({
      _id: 'mongo-1',
      toObject: () => registeredSubscription,
    });

    const result = await PushSubscriptionDAO.register('user-1', {
      provider: PushSubscriptionProvider.Fcm,
      platform: PushSubscriptionPlatform.Android,
      token: 'fcm-token-1:APA91bExampleTokenValue',
      deviceInstallationId: 'install-1',
    });

    expect(PushSubscriptionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: PushSubscriptionProvider.Fcm,
        platform: PushSubscriptionPlatform.Android,
        token: 'fcm-token-1:APA91bExampleTokenValue',
        deviceInstallationId: 'install-1',
        isActive: true,
      }),
    );
    expect(result).toEqual(registeredSubscription);
  });

  it('reactivates an existing token when it already exists', async () => {
    const existingSubscription = {
      _id: 'mongo-existing',
      userId: 'user-9',
      provider: PushSubscriptionProvider.Expo,
      platform: PushSubscriptionPlatform.Ios,
      token: 'ExponentPushToken[token-1]',
      deviceInstallationId: 'old-install',
      isActive: false,
      lastRegisteredAt: new Date('2026-06-04T10:00:00.000Z'),
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => registeredSubscription,
    };

    (PushSubscriptionModel.updateMany as jest.Mock)
      .mockReturnValueOnce(createMockSuccessMongooseQuery({ modifiedCount: 1 }))
      .mockReturnValueOnce(createMockSuccessMongooseQuery({ modifiedCount: 0 }));
    (PushSubscriptionModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(existingSubscription));

    const result = await PushSubscriptionDAO.register('user-1', {
      platform: PushSubscriptionPlatform.Android,
      token: 'ExponentPushToken[token-1]',
      deviceInstallationId: 'install-1',
    });

    expect(existingSubscription.save).toHaveBeenCalled();
    expect(result).toEqual(registeredSubscription);
  });

  it('infers FCM for Android tokens when the provider is omitted', async () => {
    (PushSubscriptionModel.updateMany as jest.Mock)
      .mockReturnValueOnce(createMockSuccessMongooseQuery({ modifiedCount: 0 }))
      .mockReturnValueOnce(createMockSuccessMongooseQuery({ modifiedCount: 0 }));
    (PushSubscriptionModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
    (PushSubscriptionModel.create as jest.Mock).mockResolvedValue({
      _id: 'mongo-1',
      toObject: () => registeredSubscription,
    });

    await PushSubscriptionDAO.register('user-1', {
      platform: PushSubscriptionPlatform.Android,
      token: 'fcm-token-1:APA91bExampleTokenValue',
      deviceInstallationId: 'install-1',
    });

    expect(PushSubscriptionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: PushSubscriptionProvider.Fcm,
      }),
    );
  });

  it('deactivates a token for a specific user', async () => {
    (PushSubscriptionModel.updateOne as jest.Mock).mockReturnValue(
      createMockSuccessMongooseQuery({ modifiedCount: 1 }),
    );

    const result = await PushSubscriptionDAO.deactivateForUser('user-1', 'fcm-token-1:APA91bExampleTokenValue');

    expect(PushSubscriptionModel.updateOne).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        token: 'fcm-token-1:APA91bExampleTokenValue',
        isActive: true,
      },
      {
        isActive: false,
      },
    );
    expect(result).toBe(true);
  });

  it('wraps unexpected register errors', async () => {
    (PushSubscriptionModel.updateMany as jest.Mock).mockReturnValue(
      createMockFailedMongooseQuery(new MockMongoError(11000, 'duplicate key')),
    );

    await expect(
      PushSubscriptionDAO.register('user-1', {
        provider: PushSubscriptionProvider.Fcm,
        platform: PushSubscriptionPlatform.Android,
        token: 'fcm-token-1:APA91bExampleTokenValue',
        deviceInstallationId: 'install-1',
      }),
    ).rejects.toThrow(GraphQLError);
  });

  it('deduplicates active subscriptions per token and device before returning them', async () => {
    const freshestSubscription = {
      _id: 'mongo-1',
      userId: 'user-1',
      provider: PushSubscriptionProvider.Fcm,
      platform: PushSubscriptionPlatform.Android,
      token: 'fcm-token-1',
      deviceInstallationId: 'install-1',
      isActive: true,
      lastRegisteredAt: new Date('2026-06-06T10:00:00.000Z'),
      createdAt: new Date('2026-06-06T09:00:00.000Z'),
      toObject: () => ({ ...registeredSubscription, token: 'fcm-token-1' }),
    };
    const duplicateSameDevice = {
      _id: 'mongo-2',
      userId: 'user-1',
      provider: PushSubscriptionProvider.Fcm,
      platform: PushSubscriptionPlatform.Android,
      token: 'fcm-token-2',
      deviceInstallationId: 'install-1',
      isActive: true,
      lastRegisteredAt: new Date('2026-06-06T08:00:00.000Z'),
      createdAt: new Date('2026-06-06T08:00:00.000Z'),
      toObject: () => ({ ...registeredSubscription, token: 'fcm-token-2' }),
    };
    const duplicateSameToken = {
      _id: 'mongo-3',
      userId: 'user-1',
      provider: PushSubscriptionProvider.Fcm,
      platform: PushSubscriptionPlatform.Android,
      token: 'fcm-token-1',
      deviceInstallationId: 'install-2',
      isActive: true,
      lastRegisteredAt: new Date('2026-06-06T07:00:00.000Z'),
      createdAt: new Date('2026-06-06T07:00:00.000Z'),
      toObject: () => ({ ...registeredSubscription, token: 'fcm-token-1', deviceInstallationId: 'install-2' }),
    };

    (PushSubscriptionModel.find as jest.Mock).mockReturnValue(
      createMockSuccessMongooseQuery([duplicateSameDevice, freshestSubscription, duplicateSameToken]),
    );
    (PushSubscriptionModel.updateMany as jest.Mock).mockReturnValue(
      createMockSuccessMongooseQuery({ modifiedCount: 2 }),
    );

    const result = await PushSubscriptionDAO.readActiveByUserIds(['user-1']);

    expect(PushSubscriptionModel.updateMany).toHaveBeenCalledWith(
      {
        _id: { $in: ['mongo-2', 'mongo-3'] },
      },
      {
        isActive: false,
      },
    );
    expect(result).toEqual([{ ...registeredSubscription, token: 'fcm-token-1' }]);
  });
});
