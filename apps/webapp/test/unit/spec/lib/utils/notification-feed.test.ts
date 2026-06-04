import { NotificationType } from '@/data/graphql/types/graphql';
import {
  formatNotificationDateGroupLabel,
  getNotificationEyebrow,
  getNotificationPriority,
  groupNotificationFeedItems,
  sortNotificationFeedItems,
} from '@/lib/utils/notification-feed';

type TestNotification = {
  notificationId: string;
  type: NotificationType;
};

type TestFollowRequest = {
  followId: string;
};

describe('web notification feed helpers', () => {
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

  it.each([
    [NotificationType.NewDeviceLogin, 100],
    [NotificationType.PasswordChanged, 99],
    [NotificationType.EventCancelled, 98],
    [NotificationType.EventReminder_1H, 97],
    [NotificationType.EventReminder_24H, 96],
    [NotificationType.EventUpdated, 94],
    [NotificationType.OrgInvite, 90],
    [NotificationType.OrgRoleChanged, 88],
    [NotificationType.FriendCheckin, 86],
    [NotificationType.FriendRsvp, 84],
    [NotificationType.EventCheckin, 82],
    [NotificationType.EventRsvp, 80],
    [NotificationType.OrgEventPublished, 78],
    [NotificationType.FollowRequest, 76],
    [NotificationType.FollowReceived, 72],
    [NotificationType.FollowAccepted, 70],
    [NotificationType.CommentReply, 68],
    [NotificationType.CommentReceived, 66],
    [NotificationType.Mention, 64],
    [NotificationType.AccountVerified, 50],
    [NotificationType.EventRecommendation, 38],
    [NotificationType.EventSaved, 36],
    [NotificationType.CommentLiked, 30],
    ['UnknownType' as NotificationType, 40],
  ])('returns the expected priority for %s', (type, expected) => {
    expect(getNotificationPriority(type)).toBe(expected);
  });

  it.each([
    [NotificationType.EventReminder_1H, 'Starting soon'],
    [NotificationType.EventReminder_24H, 'Coming up'],
    [NotificationType.EventCancelled, 'Schedule change'],
    [NotificationType.EventUpdated, 'Event update'],
    [NotificationType.FriendRsvp, 'Friend activity'],
    [NotificationType.FriendCheckin, 'Friend activity'],
    [NotificationType.OrgInvite, 'Organization'],
    [NotificationType.OrgRoleChanged, 'Organization'],
    [NotificationType.OrgEventPublished, 'New event'],
    [NotificationType.FollowReceived, 'Connections'],
    [NotificationType.FollowAccepted, 'Connections'],
    [NotificationType.FollowRequest, 'Connections'],
    [NotificationType.CommentReply, 'Conversation'],
    [NotificationType.CommentReceived, 'Conversation'],
    [NotificationType.CommentLiked, 'Conversation'],
    [NotificationType.PasswordChanged, 'Security'],
    [NotificationType.NewDeviceLogin, 'Security'],
    [NotificationType.EventSaved, 'Activity'],
  ])('returns the expected eyebrow for %s', (type, expected) => {
    expect(getNotificationEyebrow(type)).toBe(expected);
  });

  it('formats missing, invalid, same-day, previous-day, and older dates correctly', () => {
    expect(formatNotificationDateGroupLabel()).toBe('Earlier');
    expect(formatNotificationDateGroupLabel('not-a-date')).toBe('Earlier');
    expect(formatNotificationDateGroupLabel('2026-06-04T09:00:00.000Z')).toBe('Today');
    expect(formatNotificationDateGroupLabel('2026-06-03T09:00:00.000Z')).toBe('Yesterday');
    expect(formatNotificationDateGroupLabel('2026-05-30T09:00:00.000Z')).toContain('May');
  });

  it('keeps same-priority items in reverse chronological order and groups invalid dates as earlier', () => {
    const items = sortNotificationFeedItems<TestNotification, TestFollowRequest>([
      {
        createdAt: '2026-06-04T08:00:00.000Z',
        id: 'comment-early',
        kind: 'notification',
        notification: { notificationId: 'comment-early', type: NotificationType.CommentReply },
      },
      {
        createdAt: '2026-06-04T10:00:00.000Z',
        id: 'comment-late',
        kind: 'notification',
        notification: { notificationId: 'comment-late', type: NotificationType.CommentReply },
      },
    ]);

    expect(items.map((item) => item.id)).toEqual(['comment-late', 'comment-early']);

    const groups = groupNotificationFeedItems<TestNotification, TestFollowRequest>([
      {
        createdAt: 'not-a-date',
        id: 'invalid',
        kind: 'notification',
        notification: { notificationId: 'invalid', type: NotificationType.EventSaved },
      },
      {
        createdAt: '',
        id: 'missing',
        kind: 'follow-request',
        request: { followId: 'missing' },
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Earlier');
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['missing', 'invalid']);
  });
});
