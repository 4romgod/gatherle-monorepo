import {
  isMobileRealtimeFollowRequestPayload,
  isMobileRealtimeNotificationDeletedPayload,
  isMobileRealtimeNotificationPayload,
  isMobileRealtimeNotificationsAllReadPayload,
  parseNotificationRealtimeEvent,
} from '@/lib/notifications/notificationRealtimeProtocol';

const notificationPayload = {
  notification: {
    notificationId: 'notification-1',
    recipientUserId: 'user-1',
    type: 'FOLLOW_REQUEST',
    title: 'Follow request',
    message: 'A follow request arrived',
    isRead: false,
    createdAt: '2026-05-26T10:00:00.000Z',
  },
  unreadCount: 2,
};

describe('mobile notification realtime protocol', () => {
  it('validates notification payload shapes', () => {
    expect(isMobileRealtimeNotificationPayload(notificationPayload)).toBe(true);
    expect(
      isMobileRealtimeNotificationPayload({
        ...notificationPayload,
        notification: {
          ...notificationPayload.notification,
          isRead: 'false',
        },
      }),
    ).toBe(false);

    expect(isMobileRealtimeNotificationDeletedPayload({ notificationId: 'notification-1', unreadCount: 1 })).toBe(true);
    expect(isMobileRealtimeNotificationDeletedPayload({ unreadCount: 1 })).toBe(false);

    expect(isMobileRealtimeNotificationsAllReadPayload({ unreadCount: 0, readAt: '2026-05-26T10:01:00.000Z' })).toBe(
      true,
    );
    expect(isMobileRealtimeNotificationsAllReadPayload({ unreadCount: '0', readAt: 'x' })).toBe(false);

    expect(
      isMobileRealtimeFollowRequestPayload({
        follow: {
          followId: 'follow-1',
          followerUserId: 'user-2',
          targetType: 'User',
          targetId: 'user-1',
          approvalStatus: 'Pending',
          createdAt: '2026-05-26T10:00:00.000Z',
          updatedAt: '2026-05-26T10:00:00.000Z',
        },
      }),
    ).toBe(true);
    expect(isMobileRealtimeFollowRequestPayload({ follow: { targetType: 'Bad' } })).toBe(false);
  });

  it('parses only known notification realtime envelopes', () => {
    expect(
      parseNotificationRealtimeEvent(JSON.stringify({ type: 'notification.new', payload: notificationPayload })),
    ).toEqual({
      payload: notificationPayload,
      type: 'notification.new',
    });
    expect(
      parseNotificationRealtimeEvent(
        JSON.stringify({ type: 'notification.deleted', payload: { notificationId: 'n1' } }),
      ),
    ).toEqual({
      payload: { notificationId: 'n1' },
      type: 'notification.deleted',
    });
    expect(parseNotificationRealtimeEvent('{bad json')).toBeNull();
    expect(parseNotificationRealtimeEvent(JSON.stringify({ type: 'unknown.event', payload: {} }))).toBeNull();
  });
});
