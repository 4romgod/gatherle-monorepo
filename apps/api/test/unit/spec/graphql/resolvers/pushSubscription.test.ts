import 'reflect-metadata';
import { PushSubscriptionResolver } from '@/graphql/resolvers/pushSubscription';
import { PushSubscriptionDAO } from '@/mongodb/dao';
import { getAuthenticatedUser } from '@/utils';
import { PushSubscriptionPlatform, PushSubscriptionProvider } from '@gatherle/commons/server/types';

jest.mock('@/mongodb/dao', () => ({
  PushSubscriptionDAO: {
    deactivateForUser: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

describe('PushSubscriptionResolver', () => {
  let resolver: PushSubscriptionResolver;

  beforeEach(() => {
    resolver = new PushSubscriptionResolver();
    jest.clearAllMocks();
    (getAuthenticatedUser as jest.Mock).mockReturnValue({ userId: 'user-1' });
  });

  it('registers a push subscription for the authenticated user', async () => {
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
    (PushSubscriptionDAO.register as jest.Mock).mockResolvedValue(registeredSubscription);

    const result = await resolver.registerPushSubscription(
      {
        provider: PushSubscriptionProvider.Fcm,
        platform: PushSubscriptionPlatform.Android,
        token: 'fcm-token-1:APA91bExampleTokenValue',
        deviceInstallationId: 'install-1',
      },
      {} as any,
    );

    expect(PushSubscriptionDAO.register).toHaveBeenCalledWith('user-1', {
      provider: PushSubscriptionProvider.Fcm,
      platform: PushSubscriptionPlatform.Android,
      token: 'fcm-token-1:APA91bExampleTokenValue',
      deviceInstallationId: 'install-1',
    });
    expect(result).toEqual(registeredSubscription);
  });

  it('deactivates a push subscription for the authenticated user', async () => {
    (PushSubscriptionDAO.deactivateForUser as jest.Mock).mockResolvedValue(true);

    const result = await resolver.unregisterPushSubscription('ExponentPushToken[token-1]', {} as any);

    expect(PushSubscriptionDAO.deactivateForUser).toHaveBeenCalledWith('user-1', 'ExponentPushToken[token-1]');
    expect(result).toBe(true);
  });
});
