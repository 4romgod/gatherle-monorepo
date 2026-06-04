import type { Notification } from '@gatherle/commons/types';
import { FollowApprovalStatus, FollowTargetType, ParticipantStatus } from '@gatherle/commons/types';
import { NotificationDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import {
  publishEventSaveUpdated,
  publishEventRsvpUpdated,
  publishFollowRequestCreated,
  publishFollowRequestUpdated,
  publishMomentCreatedToRecipients,
  publishMomentDeletedToRecipients,
  publishMomentUpdatedToRecipients,
  publishNotificationDeleted,
  publishNotificationsMarkedAllRead,
  publishNotificationCreated,
  publishNotificationUpdated,
} from '@/websocket/publisher';
import { WEBSOCKET_EVENT_TYPES } from '@/websocket/constants';
import { createRealtimeEventEnvelope, isGoneConnectionError, postToConnection } from '@/websocket/gateway';

jest.mock('@/mongodb/dao', () => ({
  NotificationDAO: {
    countUnread: jest.fn(),
  },
  WebSocketConnectionDAO: {
    readConnectionsByUserId: jest.fn(),
    removeConnection: jest.fn(),
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

jest.mock('@/websocket/gateway', () => ({
  createRealtimeEventEnvelope: jest.fn((type: string, payload: unknown) => ({
    type,
    payload,
    sentAt: '2026-02-16T00:00:00.000Z',
  })),
  isGoneConnectionError: jest.fn(() => false),
  postToConnection: jest.fn().mockResolvedValue(undefined),
}));

describe('websocket publisher', () => {
  const connectionOne = {
    connectionId: 'conn-1',
    userId: 'user-1',
    domainName: 'api.example.com',
    stage: 'beta',
  };

  const connectionTwo = {
    connectionId: 'conn-2',
    userId: 'user-2',
    domainName: 'api.example.com',
    stage: 'beta',
  };

  const notification: Notification = {
    notificationId: 'note-1',
    recipientUserId: 'user-1',
    type: 'FOLLOW_REQUEST',
    title: 'Follow request',
    message: 'A follow request arrived',
    isRead: false,
    createdAt: new Date('2026-02-16T00:00:00.000Z'),
  } as Notification;

  const followSnapshot = {
    followId: 'follow-1',
    followerUserId: 'user-9',
    targetType: FollowTargetType.User,
    targetId: 'user-1',
    approvalStatus: FollowApprovalStatus.Pending,
    createdAt: '2026-02-16T00:00:00.000Z',
    updatedAt: '2026-02-16T00:00:00.000Z',
    follower: {
      userId: 'user-9',
      username: 'follower',
      email: 'follower@example.com',
      given_name: 'Follower',
      family_name: 'User',
      profile_picture: null,
      bio: null,
    },
  };

  const eventRsvpPayload = {
    participant: {
      participantId: 'participant-1',
      eventId: 'event-1',
      userId: 'user-9',
      status: ParticipantStatus.Going,
      quantity: 1,
      sharedVisibility: null,
      rsvpAt: '2026-02-16T00:00:00.000Z',
      cancelledAt: null,
      checkedInAt: null,
      user: {
        userId: 'user-9',
        username: 'follower',
        given_name: 'Follower',
        family_name: 'User',
        profile_picture: null,
      },
    },
    previousStatus: null,
    rsvpCount: 3,
  };

  const moment = {
    momentId: 'moment-1',
    eventId: 'event-1',
    occurrenceId: 'event-1#2026-02-16T00:00:00.000Z',
    authorId: 'user-1',
    type: 'text',
    state: 'Ready',
    caption: null,
    mediaUrl: null,
    thumbnailUrl: null,
    imageDisplayMode: null,
    background: null,
    durationSeconds: null,
    createdAt: '2026-02-16T00:00:00.000Z',
    expiresAt: '2026-02-17T00:00:00.000Z',
    author: {
      userId: 'user-1',
      username: 'alice',
      given_name: 'Alice',
      family_name: 'Smith',
      profile_picture: null,
    },
    event: {
      eventId: 'event-1',
      slug: 'test-event',
      title: 'Test EventSeries',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes notification.new to all active recipient connections', async () => {
    (NotificationDAO.countUnread as jest.Mock).mockResolvedValue(4);
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mockResolvedValue([connectionOne, connectionTwo]);

    await publishNotificationCreated(notification);

    expect(NotificationDAO.countUnread).toHaveBeenCalledWith('user-1');
    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.NOTIFICATION_NEW, {
      notification,
      unreadCount: 4,
    });
    expect(postToConnection).toHaveBeenCalledTimes(2);
  });

  it('publishes notification.updated with the refreshed unread count', async () => {
    (NotificationDAO.countUnread as jest.Mock).mockResolvedValue(2);
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mockResolvedValue([connectionOne]);

    await publishNotificationUpdated(notification);

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.NOTIFICATION_UPDATED, {
      notification,
      unreadCount: 2,
    });
    expect(postToConnection).toHaveBeenCalledTimes(1);
  });

  it('publishes notification.deleted payload with the refreshed unread count', async () => {
    (NotificationDAO.countUnread as jest.Mock).mockResolvedValue(1);
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mockResolvedValue([connectionOne]);

    await publishNotificationDeleted('user-1', 'note-1');

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.NOTIFICATION_DELETED, {
      notificationId: 'note-1',
      unreadCount: 1,
    });
    expect(postToConnection).toHaveBeenCalledTimes(1);
  });

  it('publishes notification.all_read payload with readAt metadata', async () => {
    (NotificationDAO.countUnread as jest.Mock).mockResolvedValue(0);
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mockResolvedValue([connectionOne]);

    await publishNotificationsMarkedAllRead('user-1', '2026-05-26T10:30:00.000Z');

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.NOTIFICATION_ALL_READ, {
      unreadCount: 0,
      readAt: '2026-05-26T10:30:00.000Z',
    });
    expect(postToConnection).toHaveBeenCalledTimes(1);
  });

  it('removes stale connections when publishFollowRequestUpdated hits GoneException', async () => {
    const goneError = { $metadata: { httpStatusCode: 410 } };
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mockResolvedValue([connectionOne]);
    (postToConnection as jest.Mock).mockRejectedValueOnce(goneError);
    (isGoneConnectionError as jest.Mock).mockImplementation((error: unknown) => error === goneError);

    await publishFollowRequestUpdated('user-1', followSnapshot);

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.FOLLOW_REQUEST_UPDATED, {
      follow: followSnapshot,
    });
    expect(WebSocketConnectionDAO.removeConnection).toHaveBeenCalledWith('conn-1');
  });

  it('publishes follow.request.created payload', async () => {
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mockResolvedValue([connectionOne]);

    await publishFollowRequestCreated('user-1', followSnapshot);

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.FOLLOW_REQUEST_CREATED, {
      follow: followSnapshot,
    });
    expect(postToConnection).toHaveBeenCalledTimes(1);
  });

  it('publishes event.rsvp.updated once per unique recipient user', async () => {
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([connectionOne])
      .mockResolvedValueOnce([connectionTwo]);

    await publishEventRsvpUpdated([' user-1 ', 'user-1', '   ', ' user-2 '], eventRsvpPayload);

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(
      WEBSOCKET_EVENT_TYPES.EVENT_RSVP_UPDATED,
      eventRsvpPayload,
    );
    expect((WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'user-1',
      'user-2',
    ]);
    expect(postToConnection).toHaveBeenCalledTimes(2);
  });

  it('publishes event.save.updated to the recipient connections', async () => {
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mockResolvedValue([connectionOne]);

    await publishEventSaveUpdated(' user-1 ', {
      eventId: 'event-1',
      isSaved: true,
      followId: 'follow-1',
    });

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.EVENT_SAVE_UPDATED, {
      eventId: 'event-1',
      isSaved: true,
      followId: 'follow-1',
    });
    expect(WebSocketConnectionDAO.readConnectionsByUserId).toHaveBeenCalledWith('user-1');
    expect(postToConnection).toHaveBeenCalledTimes(1);
  });

  it('publishes moment.created once per unique recipient user', async () => {
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([connectionOne])
      .mockResolvedValueOnce([connectionTwo]);

    await publishMomentCreatedToRecipients([' user-1 ', 'user-1', ' user-2 '], { moment } as any);

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.MOMENT_CREATED, {
      moment,
    });
    expect((WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'user-1',
      'user-2',
    ]);
    expect(postToConnection).toHaveBeenCalledTimes(2);
  });

  it('publishes moment.updated once per unique recipient user', async () => {
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([connectionOne])
      .mockResolvedValueOnce([connectionTwo]);

    await publishMomentUpdatedToRecipients([' user-1 ', ' user-2 '], { moment } as any);

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.MOMENT_UPDATED, {
      moment,
    });
    expect((WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'user-1',
      'user-2',
    ]);
    expect(postToConnection).toHaveBeenCalledTimes(2);
  });

  it('publishes moment.deleted once per unique recipient user', async () => {
    (WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock)
      .mockResolvedValueOnce([connectionOne])
      .mockResolvedValueOnce([connectionTwo]);

    await publishMomentDeletedToRecipients([' user-1 ', ' user-2 ', 'user-2'], {
      momentId: 'moment-1',
      eventId: 'event-1',
      occurrenceId: 'event-1#2026-02-16T00:00:00.000Z',
      authorId: 'user-1',
    });

    expect(createRealtimeEventEnvelope).toHaveBeenCalledWith(WEBSOCKET_EVENT_TYPES.MOMENT_DELETED, {
      momentId: 'moment-1',
      eventId: 'event-1',
      occurrenceId: 'event-1#2026-02-16T00:00:00.000Z',
      authorId: 'user-1',
    });
    expect((WebSocketConnectionDAO.readConnectionsByUserId as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'user-1',
      'user-2',
    ]);
    expect(postToConnection).toHaveBeenCalledTimes(2);
  });
});
