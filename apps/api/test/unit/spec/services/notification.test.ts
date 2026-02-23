// Must mock before any imports that use these modules
jest.mock('@/constants', () => ({
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  MONGO_DB_URL: 'mock-url',
  JWT_SECRET: 'test-secret',
  SECRET_ARN: undefined,
  LOG_LEVEL: 1,
  GRAPHQL_API_PATH: '/v1/graphql',
  HttpStatusCode: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHENTICATED: 401,
    UNAUTHORIZED: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
  REGEXT_MONGO_DB_ERROR: /\{ (.*?): (.*?) \}/,
  OPERATION_NAMES: {
    UPDATE_USER: 'updateUser',
    DELETE_USER_BY_ID: 'deleteUserById',
    DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
    DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
    UPDATE_EVENT: 'updateEvent',
    DELETE_EVENT: 'deleteEventById',
  },
}));

jest.mock('@/utils', () => ({
  CustomError: jest.fn((message: string, errorType: any) => {
    const error = new Error(message) as any;
    error.extensions = { code: errorType?.errorCode, http: { status: errorType?.errorStatus } };
    return error;
  }),
  ErrorTypes: {
    BAD_USER_INPUT: { errorCode: 'BAD_USER_INPUT', errorStatus: 400 },
    BAD_REQUEST: { errorCode: 'BAD_REQUEST', errorStatus: 400 },
    CONFLICT: { errorCode: 'CONFLICT', errorStatus: 409 },
    NOT_FOUND: { errorCode: 'NOT_FOUND', errorStatus: 404 },
    UNAUTHENTICATED: { errorCode: 'UNAUTHENTICATED', errorStatus: 401 },
    UNAUTHORIZED: { errorCode: 'UNAUTHORIZED', errorStatus: 403 },
  },
}));

jest.mock('@/mongodb/dao', () => ({
  NotificationDAO: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
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

import { NotificationService } from '@/services';
import { NotificationDAO, UserDAO } from '@/mongodb/dao';
import type { Notification, User } from '@gatherle/commons/types';
import { NotificationType, NotificationTargetType, ParticipantStatus } from '@gatherle/commons/types';

describe('NotificationService', () => {
  const mockNotification: Notification = {
    notificationId: 'notif-1',
    recipientUserId: 'user-1',
    type: NotificationType.FOLLOW_RECEIVED,
    title: 'New Follower',
    message: 'John started following you',
    actorUserId: 'user-2',
    targetType: NotificationTargetType.User,
    targetId: 'user-2',
    isRead: false,
    emailSent: false,
    pushSent: false,
    actionUrl: '/users/user-2',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUser: Partial<User> = {
    userId: 'user-2',
    username: 'johndoe',
    given_name: 'John',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notify', () => {
    it('creates a notification with generated title and message from template', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockUser);
      (NotificationDAO.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await NotificationService.notify({
        type: NotificationType.FOLLOW_RECEIVED,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        targetType: NotificationTargetType.User,
        // No targetSlug needed - social notifications use actorUsername
      });

      expect(UserDAO.readUserById).toHaveBeenCalledWith('user-2');
      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'user-1',
          type: NotificationType.FOLLOW_RECEIVED,
          title: 'New Follower',
          message: 'John started following you',
          actorUserId: 'user-2',
          targetType: NotificationTargetType.User,
          actionUrl: '/users/johndoe', // Uses actor's username
        }),
      );
      expect(result).toEqual(mockNotification);
    });

    it('uses custom title and message when provided', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockUser);
      (NotificationDAO.create as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationService.notify({
        type: NotificationType.FOLLOW_RECEIVED,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        title: 'Custom Title',
        message: 'Custom message',
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Title',
          message: 'Custom message',
        }),
      );
    });

    it('uses custom actionUrl when provided', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockUser);
      (NotificationDAO.create as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationService.notify({
        type: NotificationType.FOLLOW_RECEIVED,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        actionUrl: '/custom/url',
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionUrl: '/custom/url',
        }),
      );
    });

    it('returns null when trying to notify yourself', async () => {
      const result = await NotificationService.notify({
        type: NotificationType.FOLLOW_RECEIVED,
        recipientUserId: 'user-1',
        actorUserId: 'user-1', // Same user
      });

      expect(result).toBeNull();
      expect(NotificationDAO.create).not.toHaveBeenCalled();
    });

    it('uses fallback name when actor not found', async () => {
      (UserDAO.readUserById as jest.Mock).mockRejectedValue(new Error('User not found'));
      (NotificationDAO.create as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationService.notify({
        type: NotificationType.FOLLOW_RECEIVED,
        recipientUserId: 'user-1',
        actorUserId: 'user-999',
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Someone started following you', // Fallback
        }),
      );
    });

    it('creates notification without actor for system notifications', async () => {
      const systemNotification = {
        ...mockNotification,
        type: NotificationType.EVENT_REMINDER_24H,
        actorUserId: undefined,
      };
      (NotificationDAO.create as jest.Mock).mockResolvedValue(systemNotification);

      await NotificationService.notify({
        type: NotificationType.EVENT_REMINDER_24H,
        recipientUserId: 'user-1',
        targetType: NotificationTargetType.Event,
        targetSlug: 'my-event-slug',
      });

      expect(UserDAO.readUserById).not.toHaveBeenCalled();
      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your event is happening tomorrow',
        }),
      );
    });

    it('uses username when given_name is not available', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue({
        userId: 'user-2',
        username: 'johndoe',
        // No given_name
      });
      (NotificationDAO.create as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationService.notify({
        type: NotificationType.FOLLOW_RECEIVED,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'johndoe started following you',
        }),
      );
    });
  });

  describe('notifyMany', () => {
    it('creates notifications for multiple recipients', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockUser);
      (NotificationDAO.createMany as jest.Mock).mockResolvedValue([
        { ...mockNotification, recipientUserId: 'user-3' },
        { ...mockNotification, recipientUserId: 'user-4' },
      ]);

      const result = await NotificationService.notifyMany(['user-3', 'user-4'], {
        type: NotificationType.EVENT_UPDATED,
        actorUserId: 'user-2',
        targetType: NotificationTargetType.Event,
        targetSlug: 'summer-festival',
      });

      expect(NotificationDAO.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ recipientUserId: 'user-3' }),
        expect.objectContaining({ recipientUserId: 'user-4' }),
      ]);
      expect(result).toHaveLength(2);
    });

    it('filters out actor from recipients', async () => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockUser);
      (NotificationDAO.createMany as jest.Mock).mockResolvedValue([{ ...mockNotification, recipientUserId: 'user-3' }]);

      await NotificationService.notifyMany(['user-2', 'user-3'], {
        type: NotificationType.EVENT_UPDATED,
        actorUserId: 'user-2', // Should be filtered out
        targetType: NotificationTargetType.Event,
        targetSlug: 'summer-festival',
      });

      expect(NotificationDAO.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ recipientUserId: 'user-3' }),
        // user-2 should not be in the array
      ]);
    });

    it('returns empty array when all recipients filtered out', async () => {
      const result = await NotificationService.notifyMany(['user-2'], {
        type: NotificationType.EVENT_UPDATED,
        actorUserId: 'user-2', // Only recipient is the actor
        targetType: NotificationTargetType.Event,
        targetSlug: 'summer-festival',
      });

      expect(NotificationDAO.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('delegates to NotificationDAO.countUnread', async () => {
      const { NotificationDAO: MockedDAO } = jest.requireMock('@/mongodb/dao');
      MockedDAO.countUnread = jest.fn().mockResolvedValue(5);

      // NotificationService.getUnreadCount is a simple delegation
      // This test verifies the service method exists and works
      const count = await NotificationService.getUnreadCount('user-1');

      expect(MockedDAO.countUnread).toHaveBeenCalledWith('user-1');
      expect(count).toBe(5);
    });
  });

  describe('notification templates', () => {
    beforeEach(() => {
      (NotificationDAO.create as jest.Mock).mockResolvedValue(mockNotification);
    });

    it.each([
      // Social notifications - use actorUsername, no targetSlug needed
      [NotificationType.FOLLOW_RECEIVED, 'New Follower', '/users/johndoe', NotificationTargetType.User, undefined],
      [NotificationType.FOLLOW_REQUEST, 'Follow Request', '/users/johndoe', NotificationTargetType.User, undefined],
      [
        NotificationType.FOLLOW_ACCEPTED,
        'Follow Request Accepted',
        '/users/johndoe',
        NotificationTargetType.User,
        undefined,
      ],
      // Event notifications - use event slug
      [
        NotificationType.EVENT_RSVP,
        'New RSVP',
        '/events/summer-festival',
        NotificationTargetType.Event,
        'summer-festival',
      ],
      [
        NotificationType.EVENT_CHECKIN,
        'Event Check-in',
        '/events/summer-festival',
        NotificationTargetType.Event,
        'summer-festival',
      ],
      // Security notifications - no targetSlug needed
      [NotificationType.PASSWORD_CHANGED, 'Password Changed', '/account', undefined, undefined],
    ])('generates correct template for %s', async (type, expectedTitle, expectedUrl, targetType, targetSlug) => {
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockUser);

      await NotificationService.notify({
        type,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        targetType,
        targetSlug,
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expectedTitle,
          actionUrl: expectedUrl,
        }),
      );
    });
  });

  describe('RSVP status-specific messages', () => {
    beforeEach(() => {
      (NotificationDAO.create as jest.Mock).mockResolvedValue(mockNotification);
      (UserDAO.readUserById as jest.Mock).mockResolvedValue(mockUser);
    });

    it('generates "is going to" message for Going status', async () => {
      await NotificationService.notify({
        type: NotificationType.EVENT_RSVP,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        targetType: NotificationTargetType.Event,
        targetSlug: 'summer-festival',
        rsvpStatus: ParticipantStatus.Going,
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'John is going to your event',
        }),
      );
    });

    it('generates "is interested in" message for Interested status', async () => {
      await NotificationService.notify({
        type: NotificationType.EVENT_RSVP,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        targetType: NotificationTargetType.Event,
        targetSlug: 'summer-festival',
        rsvpStatus: ParticipantStatus.Interested,
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'John is interested in your event',
        }),
      );
    });

    it('generates "joined the waitlist" message for Waitlisted status', async () => {
      await NotificationService.notify({
        type: NotificationType.EVENT_RSVP,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        targetType: NotificationTargetType.Event,
        targetSlug: 'summer-festival',
        rsvpStatus: ParticipantStatus.Waitlisted,
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'John joined the waitlist for your event',
        }),
      );
    });

    it('generates fallback message when no status provided', async () => {
      await NotificationService.notify({
        type: NotificationType.EVENT_RSVP,
        recipientUserId: 'user-1',
        actorUserId: 'user-2',
        targetType: NotificationTargetType.Event,
        targetSlug: 'summer-festival',
      });

      expect(NotificationDAO.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "John RSVP'd to your event",
        }),
      );
    });
  });
});
