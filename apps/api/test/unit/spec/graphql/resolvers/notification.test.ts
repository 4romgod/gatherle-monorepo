import 'reflect-metadata';
import { NotificationResolver } from '@/graphql/resolvers/notification';
import { NotificationDAO } from '@/mongodb/dao';
import {
  publishNotificationDeleted,
  publishNotificationsMarkedAllRead,
  publishNotificationUpdated,
} from '@/websocket/publisher';
import { getAuthenticatedUser } from '@/utils';

jest.mock('@/mongodb/dao', () => ({
  NotificationDAO: {
    countUnread: jest.fn(),
    delete: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
    markAsUnread: jest.fn(),
    readByUserId: jest.fn(),
  },
}));

jest.mock('@/websocket/publisher', () => ({
  publishNotificationDeleted: jest.fn(),
  publishNotificationsMarkedAllRead: jest.fn(),
  publishNotificationUpdated: jest.fn(),
}));

jest.mock('@/utils', () => ({
  getAuthenticatedUser: jest.fn(),
  CustomError: jest.fn((message: string) => {
    throw new Error(message);
  }),
  ErrorTypes: {
    NOT_FOUND: { errorCode: 'NOT_FOUND', errorStatus: 404 },
  },
}));

describe('NotificationResolver', () => {
  let resolver: NotificationResolver;

  beforeEach(() => {
    resolver = new NotificationResolver();
    jest.clearAllMocks();
    (getAuthenticatedUser as jest.Mock).mockReturnValue({ userId: 'user-1' });
  });

  it('publishes notification.updated after markNotificationRead succeeds', async () => {
    const updatedNotification = {
      notificationId: 'note-1',
      recipientUserId: 'user-1',
      isRead: true,
      readAt: new Date('2026-05-26T10:00:00.000Z'),
    };
    (NotificationDAO.markAsRead as jest.Mock).mockResolvedValue(updatedNotification);

    const result = await resolver.markNotificationRead('note-1', {} as any);

    expect(NotificationDAO.markAsRead).toHaveBeenCalledWith('note-1', 'user-1');
    expect(publishNotificationUpdated).toHaveBeenCalledWith(updatedNotification);
    expect(result).toBe(updatedNotification);
  });

  it('publishes notification.updated after markNotificationUnread succeeds', async () => {
    const updatedNotification = {
      notificationId: 'note-1',
      recipientUserId: 'user-1',
      isRead: false,
      readAt: undefined,
    };
    (NotificationDAO.markAsUnread as jest.Mock).mockResolvedValue(updatedNotification);

    const result = await resolver.markNotificationUnread('note-1', {} as any);

    expect(NotificationDAO.markAsUnread).toHaveBeenCalledWith('note-1', 'user-1');
    expect(publishNotificationUpdated).toHaveBeenCalledWith(updatedNotification);
    expect(result).toBe(updatedNotification);
  });

  it('publishes notification.all_read when notifications were marked read', async () => {
    (NotificationDAO.markAllAsRead as jest.Mock).mockResolvedValue(4);

    const result = await resolver.markAllNotificationsRead({} as any);

    expect(result).toBe(4);
    expect(publishNotificationsMarkedAllRead).toHaveBeenCalledWith('user-1', expect.any(String));
  });

  it('skips notification.all_read publish when nothing changed', async () => {
    (NotificationDAO.markAllAsRead as jest.Mock).mockResolvedValue(0);

    const result = await resolver.markAllNotificationsRead({} as any);

    expect(result).toBe(0);
    expect(publishNotificationsMarkedAllRead).not.toHaveBeenCalled();
  });

  it('publishes notification.deleted after deleteNotification succeeds', async () => {
    (NotificationDAO.delete as jest.Mock).mockResolvedValue(true);

    const result = await resolver.deleteNotification('note-9', {} as any);

    expect(result).toBe(true);
    expect(NotificationDAO.delete).toHaveBeenCalledWith('note-9', 'user-1');
    expect(publishNotificationDeleted).toHaveBeenCalledWith('user-1', 'note-9');
  });
});
