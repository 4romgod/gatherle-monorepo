import type { Notification } from '@ntlango/commons/types';
import { FollowApprovalStatus, FollowTargetType, ParticipantStatus } from '@ntlango/commons/types';
import { NotificationDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import {
  publishEventRsvpUpdated,
  publishFollowRequestCreated,
  publishFollowRequestUpdated,
  publishNotificationCreated,
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

    await publishEventRsvpUpdated(['user-1', 'user-1', '   ', 'user-2'], eventRsvpPayload);

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
});
