import { GraphQLError } from 'graphql';
import { NotificationDAO } from '@/mongodb/dao';
import { Notification as NotificationModel } from '@/mongodb/models';
import type { Notification, CreateNotificationInput } from '@gatherle/commons/types';
import { NotificationType, NotificationTargetType } from '@gatherle/commons/types';
import { MockMongoError } from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  Notification: {
    create: jest.fn(),
    insertMany: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
});

describe('NotificationDAO', () => {
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

  const mockInput: CreateNotificationInput = {
    recipientUserId: 'user-1',
    type: NotificationType.FOLLOW_RECEIVED,
    title: 'New Follower',
    message: 'John started following you',
    actorUserId: 'user-2',
    targetType: NotificationTargetType.User,
    targetId: 'user-2',
    actionUrl: '/users/user-2',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a notification and returns it', async () => {
      (NotificationModel.create as jest.Mock).mockResolvedValue({
        toObject: () => mockNotification,
      });

      const result = await NotificationDAO.create(mockInput);

      expect(NotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockInput,
          isRead: false,
          emailSent: false,
          pushSent: false,
        }),
      );
      expect(result).toEqual(mockNotification);
    });

    it('throws GraphQLError when creation fails with GraphQLError', async () => {
      const graphqlError = new GraphQLError('Validation failed');
      (NotificationModel.create as jest.Mock).mockRejectedValue(graphqlError);

      await expect(NotificationDAO.create(mockInput)).rejects.toThrow(GraphQLError);
    });

    it('wraps unknown errors with KnownCommonError', async () => {
      const mongoError = new MockMongoError(11000, 'Duplicate key');
      (NotificationModel.create as jest.Mock).mockRejectedValue(mongoError);

      await expect(NotificationDAO.create(mockInput)).rejects.toThrow(GraphQLError);
    });
  });

  describe('createMany', () => {
    it('creates multiple notifications in bulk', async () => {
      const mockNotifications = [mockNotification, { ...mockNotification, notificationId: 'notif-2' }];
      (NotificationModel.insertMany as jest.Mock).mockResolvedValue(
        mockNotifications.map((n) => ({ toObject: () => n })),
      );

      const inputs = [mockInput, { ...mockInput, recipientUserId: 'user-3' }];
      const result = await NotificationDAO.createMany(inputs);

      expect(NotificationModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ isRead: false, emailSent: false, pushSent: false })]),
      );
      expect(result).toHaveLength(2);
    });

    it('throws error when bulk create fails', async () => {
      const mongoError = new MockMongoError(11000, 'Bulk insert failed');
      (NotificationModel.insertMany as jest.Mock).mockRejectedValue(mongoError);

      await expect(NotificationDAO.createMany([mockInput])).rejects.toThrow(GraphQLError);
    });
  });

  describe('readByUserId', () => {
    it('returns paginated notifications for a user', async () => {
      const mockNotifications = [{ toObject: () => mockNotification, createdAt: new Date('2024-01-01T00:00:00Z') }];

      (NotificationModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockNotifications));
      (NotificationModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(1));

      const result = await NotificationDAO.readByUserId('user-1', { limit: 20 });

      expect(NotificationModel.find).toHaveBeenCalledWith({ recipientUserId: 'user-1' });
      expect(result.notifications).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.unreadCount).toBe(1);
    });

    it('returns hasMore=true when more results exist', async () => {
      // Return 21 items (limit + 1) to indicate hasMore
      const mockNotifications = Array.from({ length: 21 }, (_, i) => ({
        toObject: () => ({ ...mockNotification, notificationId: `notif-${i}` }),
        createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
      }));

      (NotificationModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockNotifications));
      (NotificationModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(25));

      const result = await NotificationDAO.readByUserId('user-1', { limit: 20 });

      expect(result.hasMore).toBe(true);
      expect(result.notifications).toHaveLength(20);
      expect(result.nextCursor).toBeDefined();
    });

    it('filters by cursor when provided', async () => {
      (NotificationModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));
      (NotificationModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(0));

      const cursor = '2024-01-15T00:00:00.000Z';
      await NotificationDAO.readByUserId('user-1', { cursor });

      expect(NotificationModel.find).toHaveBeenCalledWith({
        recipientUserId: 'user-1',
        createdAt: { $lt: new Date(cursor) },
      });
    });

    it('filters unread only when specified', async () => {
      (NotificationModel.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery([]));
      (NotificationModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(0));

      await NotificationDAO.readByUserId('user-1', { unreadOnly: true });

      expect(NotificationModel.find).toHaveBeenCalledWith({
        recipientUserId: 'user-1',
        isRead: false,
      });
    });
  });

  describe('countUnread', () => {
    it('returns count of unread notifications', async () => {
      (NotificationModel.countDocuments as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(5));

      const result = await NotificationDAO.countUnread('user-1');

      expect(NotificationModel.countDocuments).toHaveBeenCalledWith({
        recipientUserId: 'user-1',
        isRead: false,
      });
      expect(result).toBe(5);
    });

    it('throws error when count fails', async () => {
      (NotificationModel.countDocuments as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('DB error')),
      );

      await expect(NotificationDAO.countUnread('user-1')).rejects.toThrow(GraphQLError);
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read and returns it', async () => {
      const readNotification = { ...mockNotification, isRead: true, readAt: new Date() };
      (NotificationModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ toObject: () => readNotification }),
      );

      const result = await NotificationDAO.markAsRead('notif-1', 'user-1');

      expect(NotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { notificationId: 'notif-1', recipientUserId: 'user-1' },
        { isRead: true, readAt: expect.any(Date) },
        { new: true },
      );
      expect(result?.isRead).toBe(true);
    });

    it('returns null when notification not found', async () => {
      (NotificationModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const result = await NotificationDAO.markAsRead('notif-999', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read and returns count', async () => {
      (NotificationModel.updateMany as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({ modifiedCount: 5 }));

      const result = await NotificationDAO.markAllAsRead('user-1');

      expect(NotificationModel.updateMany).toHaveBeenCalledWith(
        { recipientUserId: 'user-1', isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
      expect(result).toBe(5);
    });
  });

  describe('delete', () => {
    it('deletes a notification and returns true', async () => {
      (NotificationModel.deleteOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({ deletedCount: 1 }));

      const result = await NotificationDAO.delete('notif-1', 'user-1');

      expect(NotificationModel.deleteOne).toHaveBeenCalledWith({
        notificationId: 'notif-1',
        recipientUserId: 'user-1',
      });
      expect(result).toBe(true);
    });

    it('returns false when notification not found', async () => {
      (NotificationModel.deleteOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({ deletedCount: 0 }));

      const result = await NotificationDAO.delete('notif-999', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('readById', () => {
    it('returns notification when found', async () => {
      (NotificationModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ toObject: () => mockNotification }),
      );

      const result = await NotificationDAO.readById('notif-1');

      expect(NotificationModel.findOne).toHaveBeenCalledWith({ notificationId: 'notif-1' });
      expect(result).toEqual(mockNotification);
    });

    it('returns null when notification not found', async () => {
      (NotificationModel.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const result = await NotificationDAO.readById('notif-999');

      expect(result).toBeNull();
    });
  });

  describe('markEmailSent', () => {
    it('updates emailSent status', async () => {
      (NotificationModel.updateOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({ modifiedCount: 1 }));

      await NotificationDAO.markEmailSent('notif-1');

      expect(NotificationModel.updateOne).toHaveBeenCalledWith({ notificationId: 'notif-1' }, { emailSent: true });
    });
  });

  describe('markPushSent', () => {
    it('updates pushSent status', async () => {
      (NotificationModel.updateOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({ modifiedCount: 1 }));

      await NotificationDAO.markPushSent('notif-1');

      expect(NotificationModel.updateOne).toHaveBeenCalledWith({ notificationId: 'notif-1' }, { pushSent: true });
    });
  });
});
