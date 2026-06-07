import type { Notification, NotificationType } from '@gatherle/commons/server/types';
import { NotificationType as NotificationTypeEnum, PushSubscriptionProvider } from '@gatherle/commons/server/types';
import { NotificationDAO, PushSubscriptionDAO, UserDAO } from '@/mongodb/dao';
import { sendFirebasePushDeliveries } from './firebaseCloudMessaging';
import { logger } from '@/utils/logger';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_LIMIT = 100;
const DEFAULT_ACTION_URL = '/account/notifications';

const PUSH_ENABLED_NOTIFICATION_TYPES = new Set<NotificationType>([
  NotificationTypeEnum.FOLLOW_RECEIVED,
  NotificationTypeEnum.FOLLOW_REQUEST,
  NotificationTypeEnum.FOLLOW_ACCEPTED,
  NotificationTypeEnum.ORG_INVITE,
  NotificationTypeEnum.ORG_ROLE_CHANGED,
]);

type ExpoPushMessage = {
  body: string;
  channelId: string;
  data: {
    actionUrl: string;
    notificationId: string;
  };
  sound: 'default';
  title: string;
  to: string;
};

type PendingDelivery = {
  actionUrl: string;
  body: string;
  notificationId: string;
  provider: PushSubscriptionProvider;
  title: string;
  token: string;
  userId: string;
};

type ExpoPushTicket = {
  details?: {
    error?: string;
  };
  id?: string;
  message?: string;
  status?: 'error' | 'ok';
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
  errors?: Array<Record<string, unknown>>;
};

type PushDeliveryResult = {
  deliveredNotificationIds: string[];
  deliveredTokens: string[];
  staleTokens: string[];
};

function countByProvider<T extends { provider: PushSubscriptionProvider }>(items: T[]): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.provider] = (counts[item.provider] ?? 0) + 1;
    return counts;
  }, {});
}

function chunkDeliveries<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function createEmptyDeliveryResult(): PushDeliveryResult {
  return {
    deliveredNotificationIds: [],
    deliveredTokens: [],
    staleTokens: [],
  };
}

function mergeDeliveryResults(...results: Array<PushDeliveryResult | null>): PushDeliveryResult {
  const deliveredNotificationIds = new Set<string>();
  const deliveredTokens = new Set<string>();
  const staleTokens = new Set<string>();

  results
    .filter((result): result is PushDeliveryResult => result != null)
    .forEach((result) => {
      result.deliveredNotificationIds.forEach((notificationId) => deliveredNotificationIds.add(notificationId));
      result.deliveredTokens.forEach((token) => deliveredTokens.add(token));
      result.staleTokens.forEach((token) => staleTokens.add(token));
    });

  return {
    deliveredNotificationIds: [...deliveredNotificationIds],
    deliveredTokens: [...deliveredTokens],
    staleTokens: [...staleTokens],
  };
}

async function sendExpoPushDeliveries(deliveries: PendingDelivery[]): Promise<PushDeliveryResult> {
  if (deliveries.length === 0) {
    return createEmptyDeliveryResult();
  }

  logger.info('Dispatching Expo push deliveries', {
    deliveryCount: deliveries.length,
  });

  const deliveredNotificationIds = new Set<string>();
  const deliveredTokens = new Set<string>();
  const staleTokens = new Set<string>();

  for (const batch of chunkDeliveries(deliveries, EXPO_PUSH_BATCH_LIMIT)) {
    const messages: ExpoPushMessage[] = batch.map((delivery) => ({
      to: delivery.token,
      title: delivery.title,
      body: delivery.body,
      sound: 'default',
      channelId: 'default',
      data: {
        actionUrl: delivery.actionUrl,
        notificationId: delivery.notificationId,
      },
    }));

    let response: Response;

    try {
      response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    } catch (error) {
      logger.warn('Expo push request failed before a response was received', { error, deliveryCount: batch.length });
      continue;
    }

    if (!response.ok) {
      logger.warn('Expo push request returned a non-success status', {
        status: response.status,
        statusText: response.statusText,
        deliveryCount: batch.length,
      });
      continue;
    }

    let payload: ExpoPushResponse;

    try {
      payload = (await response.json()) as ExpoPushResponse;
    } catch (error) {
      logger.warn('Expo push response could not be parsed as JSON', { error, deliveryCount: batch.length });
      continue;
    }

    const tickets = Array.isArray(payload.data) ? payload.data : [];

    tickets.forEach((ticket, index) => {
      const delivery = batch[index];
      if (!delivery) {
        return;
      }

      if (ticket.status === 'ok') {
        deliveredNotificationIds.add(delivery.notificationId);
        deliveredTokens.add(delivery.token);
        return;
      }

      const expoError = ticket.details?.error;
      if (expoError === 'DeviceNotRegistered') {
        staleTokens.add(delivery.token);
      }

      logger.warn('Expo push delivery failed', {
        notificationId: delivery.notificationId,
        token: delivery.token,
        userId: delivery.userId,
        expoError,
        message: ticket.message,
      });
    });
  }

  logger.info('Expo push deliveries finished', {
    deliveryCount: deliveries.length,
    deliveredNotificationCount: deliveredNotificationIds.size,
    deliveredTokenCount: deliveredTokens.size,
    staleTokenCount: staleTokens.size,
  });

  return {
    deliveredNotificationIds: [...deliveredNotificationIds],
    deliveredTokens: [...deliveredTokens],
    staleTokens: [...staleTokens],
  };
}

class PushService {
  static supportsNotificationType(type: NotificationType): boolean {
    return PUSH_ENABLED_NOTIFICATION_TYPES.has(type);
  }

  static async sendNotifications(notifications: Notification[]): Promise<void> {
    const supportedNotifications = notifications.filter((notification) =>
      this.supportsNotificationType(notification.type),
    );
    if (supportedNotifications.length === 0) {
      logger.debug('Skipping push delivery because no notifications are push-eligible', {
        notificationCount: notifications.length,
      });
      return;
    }

    const recipientUserIds = [...new Set(supportedNotifications.map((notification) => notification.recipientUserId))];
    if (recipientUserIds.length === 0) {
      logger.debug('Skipping push delivery because there are no push recipients', {
        supportedNotificationCount: supportedNotifications.length,
      });
      return;
    }

    const users = await UserDAO.readUsersByIds(recipientUserIds);
    const pushEnabledUserIds = new Set(
      users.filter((user) => user.preferences?.communicationPrefs?.pushEnabled === true).map((user) => user.userId),
    );

    if (pushEnabledUserIds.size === 0) {
      logger.info('Skipping push delivery because all recipients have push disabled', {
        supportedNotificationCount: supportedNotifications.length,
        recipientUserCount: recipientUserIds.length,
      });
      return;
    }

    const subscriptions = await PushSubscriptionDAO.readActiveByUserIds([...pushEnabledUserIds]);
    logger.info('Resolved push subscriptions for notifications', {
      supportedNotificationCount: supportedNotifications.length,
      recipientUserCount: recipientUserIds.length,
      pushEnabledUserCount: pushEnabledUserIds.size,
      activeSubscriptionCount: subscriptions.length,
      subscriptionsByProvider: countByProvider(subscriptions),
    });

    if (subscriptions.length === 0) {
      logger.info('Skipping push delivery because no active push subscriptions were found', {
        pushEnabledUserCount: pushEnabledUserIds.size,
      });
      return;
    }

    const deliveries: PendingDelivery[] = supportedNotifications.flatMap((notification) =>
      subscriptions
        .filter((subscription) => subscription.userId === notification.recipientUserId)
        .map((subscription) => ({
          actionUrl: notification.actionUrl ?? DEFAULT_ACTION_URL,
          body: notification.message,
          notificationId: notification.notificationId,
          provider: subscription.provider,
          title: notification.title,
          token: subscription.token,
          userId: subscription.userId,
        })),
    );

    if (deliveries.length === 0) {
      logger.warn('Push subscriptions were found but no deliveries were created', {
        supportedNotificationCount: supportedNotifications.length,
        activeSubscriptionCount: subscriptions.length,
      });
      return;
    }

    const expoDeliveries = deliveries.filter((delivery) => delivery.provider === PushSubscriptionProvider.Expo);
    const firebaseDeliveries = deliveries.filter((delivery) => delivery.provider === PushSubscriptionProvider.Fcm);

    logger.info('Dispatching push notifications', {
      notificationCount: supportedNotifications.length,
      recipientUserCount: recipientUserIds.length,
      deliveryCount: deliveries.length,
      deliveriesByProvider: countByProvider(deliveries),
    });

    const [expoDeliveryResult, firebaseDeliveryResult] = await Promise.all([
      sendExpoPushDeliveries(expoDeliveries),
      sendFirebasePushDeliveries(
        firebaseDeliveries.map((delivery) => ({
          actionUrl: delivery.actionUrl,
          body: delivery.body,
          channelId: 'default',
          notificationId: delivery.notificationId,
          title: delivery.title,
          token: delivery.token,
          userId: delivery.userId,
        })),
      ),
    ]);

    const deliveryResult = mergeDeliveryResults(expoDeliveryResult, firebaseDeliveryResult);

    logger.info('Push notifications finished', {
      notificationCount: supportedNotifications.length,
      expoDeliveryCount: expoDeliveries.length,
      firebaseDeliveryCount: firebaseDeliveries.length,
      deliveredNotificationCount: deliveryResult.deliveredNotificationIds.length,
      deliveredTokenCount: deliveryResult.deliveredTokens.length,
      staleTokenCount: deliveryResult.staleTokens.length,
    });

    await Promise.all([
      deliveryResult.deliveredTokens.length > 0
        ? PushSubscriptionDAO.markDelivered(deliveryResult.deliveredTokens)
        : Promise.resolve(),
      deliveryResult.deliveredNotificationIds.length > 0
        ? NotificationDAO.markPushSentMany(deliveryResult.deliveredNotificationIds)
        : Promise.resolve(),
      deliveryResult.staleTokens.length > 0
        ? PushSubscriptionDAO.deactivateByTokens(deliveryResult.staleTokens)
        : Promise.resolve(),
    ]);
  }
}

export default PushService;
