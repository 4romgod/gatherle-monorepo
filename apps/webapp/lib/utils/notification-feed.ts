import { NotificationType } from '@/data/graphql/types/graphql';

export type NotificationFeedItem<TNotification extends { type: NotificationType }, TFollowRequest> =
  | { createdAt: string; id: string; kind: 'notification'; notification: TNotification }
  | { createdAt: string; id: string; kind: 'follow-request'; request: TFollowRequest };

export type NotificationFeedGroup<TNotification extends { type: NotificationType }, TFollowRequest> = {
  items: NotificationFeedItem<TNotification, TFollowRequest>[];
  label: string;
};

const FOLLOW_REQUEST_PRIORITY = 76;

function getNotificationTimestamp(createdAt?: string | null): number {
  if (!createdAt) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(createdAt).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function getNotificationDaySortKey(createdAt?: string | null): number {
  const timestamp = getNotificationTimestamp(createdAt);
  if (timestamp === Number.NEGATIVE_INFINITY) {
    return Number.NEGATIVE_INFINITY;
  }

  const target = new Date(timestamp);
  return new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
}

function getFeedItemPriority<TNotification extends { type: NotificationType }, TFollowRequest>(
  item: NotificationFeedItem<TNotification, TFollowRequest>,
): number {
  return item.kind === 'follow-request' ? FOLLOW_REQUEST_PRIORITY : getNotificationPriority(item.notification.type);
}

export function getNotificationPriority(type: NotificationType): number {
  switch (type) {
    case NotificationType.NewDeviceLogin:
      return 100;
    case NotificationType.PasswordChanged:
      return 99;
    case NotificationType.EventCancelled:
      return 98;
    case NotificationType.EventReminder_1H:
      return 97;
    case NotificationType.EventReminder_24H:
      return 96;
    case NotificationType.EventUpdated:
      return 94;
    case NotificationType.OrgInvite:
      return 90;
    case NotificationType.OrgRoleChanged:
      return 88;
    case NotificationType.FriendCheckin:
      return 86;
    case NotificationType.FriendRsvp:
      return 84;
    case NotificationType.EventCheckin:
      return 82;
    case NotificationType.EventRsvp:
      return 80;
    case NotificationType.OrgEventPublished:
      return 78;
    case NotificationType.FollowRequest:
      return FOLLOW_REQUEST_PRIORITY;
    case NotificationType.FollowReceived:
      return 72;
    case NotificationType.FollowAccepted:
      return 70;
    case NotificationType.CommentReply:
      return 68;
    case NotificationType.CommentReceived:
      return 66;
    case NotificationType.Mention:
      return 64;
    case NotificationType.AccountVerified:
      return 50;
    case NotificationType.EventRecommendation:
      return 38;
    case NotificationType.EventSaved:
      return 36;
    case NotificationType.CommentLiked:
      return 30;
    default:
      return 40;
  }
}

export function getNotificationEyebrow(type: NotificationType): string {
  switch (type) {
    case NotificationType.EventReminder_1H:
      return 'Starting soon';
    case NotificationType.EventReminder_24H:
      return 'Coming up';
    case NotificationType.EventCancelled:
      return 'Schedule change';
    case NotificationType.EventUpdated:
      return 'Event update';
    case NotificationType.FriendRsvp:
    case NotificationType.FriendCheckin:
      return 'Friend activity';
    case NotificationType.OrgInvite:
    case NotificationType.OrgRoleChanged:
      return 'Organization';
    case NotificationType.OrgEventPublished:
      return 'New event';
    case NotificationType.FollowReceived:
    case NotificationType.FollowAccepted:
    case NotificationType.FollowRequest:
      return 'Connections';
    case NotificationType.CommentReply:
    case NotificationType.CommentReceived:
    case NotificationType.CommentLiked:
      return 'Conversation';
    case NotificationType.PasswordChanged:
    case NotificationType.NewDeviceLogin:
      return 'Security';
    default:
      return 'Activity';
  }
}

export function formatNotificationDateGroupLabel(createdAt?: string | null) {
  if (!createdAt) {
    return 'Earlier';
  }

  const target = new Date(createdAt);
  if (Number.isNaN(target.getTime())) {
    return 'Earlier';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const dayDiff = Math.round((startOfTarget - startOfToday) / 86400000);

  if (dayDiff === 0) {
    return 'Today';
  }

  if (dayDiff === -1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(target);
}

export function sortNotificationFeedItems<TNotification extends { type: NotificationType }, TFollowRequest>(
  items: NotificationFeedItem<TNotification, TFollowRequest>[],
): NotificationFeedItem<TNotification, TFollowRequest>[] {
  return [...items].sort((left, right) => {
    const leftDayKey = getNotificationDaySortKey(left.createdAt);
    const rightDayKey = getNotificationDaySortKey(right.createdAt);
    if (leftDayKey !== rightDayKey) {
      return rightDayKey - leftDayKey;
    }

    const leftPriority = getFeedItemPriority(left);
    const rightPriority = getFeedItemPriority(right);
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    return getNotificationTimestamp(right.createdAt) - getNotificationTimestamp(left.createdAt);
  });
}

export function groupNotificationFeedItems<TNotification extends { type: NotificationType }, TFollowRequest>(
  items: NotificationFeedItem<TNotification, TFollowRequest>[],
): NotificationFeedGroup<TNotification, TFollowRequest>[] {
  const groups = new Map<number, NotificationFeedGroup<TNotification, TFollowRequest>>();

  for (const item of sortNotificationFeedItems(items)) {
    const groupKey = getNotificationDaySortKey(item.createdAt);
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.items.push(item);
      continue;
    }

    groups.set(groupKey, {
      items: [item],
      label: formatNotificationDateGroupLabel(item.createdAt),
    });
  }

  return Array.from(groups.values());
}
