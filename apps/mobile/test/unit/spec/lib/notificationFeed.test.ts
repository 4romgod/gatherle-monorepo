import { NotificationType } from '@data/graphql/types/graphql';
import {
  getNotificationEyebrow,
  groupNotificationFeedItems,
  sortNotificationFeedItems,
} from '@/lib/notifications/feed';

type TestNotification = {
  notificationId: string;
  type: NotificationType;
};

type TestFollowRequest = {
  followId: string;
};

describe('mobile notification feed helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-04T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps date groups chronological while ranking items by priority within a day', () => {
    const groups = groupNotificationFeedItems<TestNotification, TestFollowRequest>([
      {
        createdAt: '2026-06-03T20:00:00.000Z',
        id: 'yesterday-security',
        kind: 'notification',
        notification: { notificationId: 'yesterday-security', type: NotificationType.NewDeviceLogin },
      },
      {
        createdAt: '2026-06-04T09:00:00.000Z',
        id: 'today-recommendation',
        kind: 'notification',
        notification: { notificationId: 'today-recommendation', type: NotificationType.EventRecommendation },
      },
      {
        createdAt: '2026-06-04T07:00:00.000Z',
        id: 'today-reminder',
        kind: 'notification',
        notification: { notificationId: 'today-reminder', type: NotificationType.EventReminder_1H },
      },
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['today-reminder', 'today-recommendation']);
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['yesterday-security']);
  });

  it('ranks follow requests against notifications within the same day', () => {
    const items = sortNotificationFeedItems<TestNotification, TestFollowRequest>([
      {
        createdAt: '2026-06-04T10:00:00.000Z',
        id: 'comment',
        kind: 'notification',
        notification: { notificationId: 'comment', type: NotificationType.CommentReply },
      },
      {
        createdAt: '2026-06-04T08:00:00.000Z',
        id: 'follow-request',
        kind: 'follow-request',
        request: { followId: 'follow-request' },
      },
      {
        createdAt: '2026-06-04T09:00:00.000Z',
        id: 'reminder',
        kind: 'notification',
        notification: { notificationId: 'reminder', type: NotificationType.EventReminder_24H },
      },
    ]);

    expect(items.map((item) => item.id)).toEqual(['reminder', 'follow-request', 'comment']);
  });

  it('maps representative notification eyebrows', () => {
    expect(getNotificationEyebrow(NotificationType.EventReminder_1H)).toBe('Starting soon');
    expect(getNotificationEyebrow(NotificationType.OrgInvite)).toBe('Organization');
    expect(getNotificationEyebrow(NotificationType.CommentReply)).toBe('Conversation');
    expect(getNotificationEyebrow(NotificationType.NewDeviceLogin)).toBe('Security');
    expect(getNotificationEyebrow(NotificationType.EventSaved)).toBe('Activity');
  });
});
