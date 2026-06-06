jest.mock('@/mongodb/dao', () => ({
  NotificationDAO: {
    markPushSentMany: jest.fn(),
  },
  PushSubscriptionDAO: {
    deactivateByTokens: jest.fn(),
    markDelivered: jest.fn(),
    readActiveByUserIds: jest.fn(),
  },
  UserDAO: {
    readUsersByIds: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/services/firebaseCloudMessaging', () => ({
  sendFirebasePushDeliveries: jest.fn(),
}));

import PushService from '@/services/push';
import { sendFirebasePushDeliveries } from '@/services/firebaseCloudMessaging';
import { NotificationDAO, PushSubscriptionDAO, UserDAO } from '@/mongodb/dao';
import { NotificationType, PushSubscriptionProvider } from '@gatherle/commons/server/types';

describe('PushService', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
    (sendFirebasePushDeliveries as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('sends Expo push notifications only to users with push enabled and active subscriptions', async () => {
    (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([
      {
        userId: 'user-enabled',
        preferences: { communicationPrefs: { pushEnabled: true } },
      },
      {
        userId: 'user-disabled',
        preferences: { communicationPrefs: { pushEnabled: false } },
      },
    ]);
    (PushSubscriptionDAO.readActiveByUserIds as jest.Mock).mockResolvedValue([
      {
        provider: PushSubscriptionProvider.Expo,
        userId: 'user-enabled',
        token: 'ExponentPushToken[token-enabled]',
      },
      {
        provider: PushSubscriptionProvider.Expo,
        userId: 'user-disabled',
        token: 'ExponentPushToken[token-disabled]',
      },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: [{ status: 'ok', id: 'ticket-1' }],
      }),
      status: 200,
      statusText: 'OK',
    });

    await PushService.sendNotifications([
      {
        notificationId: 'notif-1',
        recipientUserId: 'user-enabled',
        type: NotificationType.FOLLOW_REQUEST,
        title: 'Follow Request',
        message: 'Someone wants to follow you',
        isRead: false,
        emailSent: false,
        pushSent: false,
        createdAt: new Date('2026-06-05T10:00:00.000Z'),
      } as any,
      {
        notificationId: 'notif-2',
        recipientUserId: 'user-disabled',
        type: NotificationType.FOLLOW_REQUEST,
        title: 'Follow Request',
        message: 'Someone wants to follow you',
        isRead: false,
        emailSent: false,
        pushSent: false,
        createdAt: new Date('2026-06-05T10:00:00.000Z'),
      } as any,
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(NotificationDAO.markPushSentMany).toHaveBeenCalledWith(['notif-1']);
    expect(PushSubscriptionDAO.markDelivered).toHaveBeenCalledWith(['ExponentPushToken[token-enabled]']);
    expect(PushSubscriptionDAO.deactivateByTokens).not.toHaveBeenCalled();
  });

  it('sends Android push notifications directly through FCM', async () => {
    (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([
      {
        userId: 'user-enabled',
        preferences: { communicationPrefs: { pushEnabled: true } },
      },
    ]);
    (PushSubscriptionDAO.readActiveByUserIds as jest.Mock).mockResolvedValue([
      {
        provider: PushSubscriptionProvider.Fcm,
        userId: 'user-enabled',
        token: 'fcm-token-1:APA91bExampleTokenValue',
      },
    ]);
    (sendFirebasePushDeliveries as jest.Mock).mockResolvedValue({
      deliveredNotificationIds: ['notif-1'],
      deliveredTokens: ['fcm-token-1:APA91bExampleTokenValue'],
      staleTokens: [],
    });

    await PushService.sendNotifications([
      {
        notificationId: 'notif-1',
        recipientUserId: 'user-enabled',
        type: NotificationType.FOLLOW_REQUEST,
        title: 'Follow Request',
        message: 'Someone wants to follow you',
        isRead: false,
        emailSent: false,
        pushSent: false,
        createdAt: new Date('2026-06-05T10:00:00.000Z'),
      } as any,
    ]);

    expect(sendFirebasePushDeliveries).toHaveBeenCalledWith([
      expect.objectContaining({
        actionUrl: '/account/notifications',
        notificationId: 'notif-1',
        title: 'Follow Request',
        token: 'fcm-token-1:APA91bExampleTokenValue',
        userId: 'user-enabled',
      }),
    ]);
    expect(NotificationDAO.markPushSentMany).toHaveBeenCalledWith(['notif-1']);
    expect(PushSubscriptionDAO.markDelivered).toHaveBeenCalledWith(['fcm-token-1:APA91bExampleTokenValue']);
    expect(PushSubscriptionDAO.deactivateByTokens).not.toHaveBeenCalled();
  });

  it('deactivates stale tokens reported by Expo', async () => {
    (UserDAO.readUsersByIds as jest.Mock).mockResolvedValue([
      {
        userId: 'user-enabled',
        preferences: { communicationPrefs: { pushEnabled: true } },
      },
    ]);
    (PushSubscriptionDAO.readActiveByUserIds as jest.Mock).mockResolvedValue([
      {
        provider: PushSubscriptionProvider.Expo,
        userId: 'user-enabled',
        token: 'ExponentPushToken[token-stale]',
      },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
      }),
      status: 200,
      statusText: 'OK',
    });

    await PushService.sendNotifications([
      {
        notificationId: 'notif-1',
        recipientUserId: 'user-enabled',
        type: NotificationType.FOLLOW_REQUEST,
        title: 'Follow Request',
        message: 'Someone wants to follow you',
        isRead: false,
        emailSent: false,
        pushSent: false,
        createdAt: new Date('2026-06-05T10:00:00.000Z'),
      } as any,
    ]);

    expect(NotificationDAO.markPushSentMany).not.toHaveBeenCalled();
    expect(PushSubscriptionDAO.markDelivered).not.toHaveBeenCalled();
    expect(PushSubscriptionDAO.deactivateByTokens).toHaveBeenCalledWith(['ExponentPushToken[token-stale]']);
  });
});
