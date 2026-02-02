// Must mock before any imports that use these modules
jest.mock('@/constants', () => ({
  AWS_REGION: 'eu-west-1',
  STAGE: 'Dev',
  MONGO_DB_URL: 'mock-url',
  JWT_SECRET: 'test-secret',
  NTLANGO_SECRET_ARN: undefined,
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

jest.mock('@/utils');

jest.mock('@/mongodb/dao', () => ({
  FollowDAO: {
    upsert: jest.fn(),
    remove: jest.fn(),
    updateApprovalStatus: jest.fn(),
    removeFollower: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
  OrganizationDAO: {
    readOrganizationById: jest.fn(),
  },
  EventDAO: {
    readEventById: jest.fn(),
  },
}));

jest.mock('@/services/notification', () => ({
  notify: jest.fn().mockResolvedValue({}),
  markFollowRequestNotificationsAsRead: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { FollowService } from '@/services';
import { FollowDAO, UserDAO, OrganizationDAO, EventDAO } from '@/mongodb/dao';
import NotificationService from '@/services/notification';
import { CustomError, ErrorTypes } from '@/utils';
import type { Follow, User, Organization, Event } from '@ntlango/commons/types';
import { FollowTargetType, FollowApprovalStatus, FollowPolicy, NotificationType } from '@ntlango/commons/types';
import { GraphQLError } from 'graphql';

// Set up mock implementations after imports so we can use GraphQLError
const mockCustomError = CustomError as jest.MockedFunction<typeof CustomError>;
mockCustomError.mockImplementation((message: string, errorType: { errorCode?: string; errorStatus?: number }) => {
  return new GraphQLError(message, {
    extensions: { code: errorType?.errorCode, http: { status: errorType?.errorStatus } },
  });
});

const mockErrorTypes = ErrorTypes as jest.Mocked<typeof ErrorTypes>;
Object.assign(mockErrorTypes, {
  BAD_USER_INPUT: { errorCode: 'BAD_USER_INPUT', errorStatus: 400 },
  BAD_REQUEST: { errorCode: 'BAD_REQUEST', errorStatus: 400 },
  CONFLICT: { errorCode: 'CONFLICT', errorStatus: 409 },
  NOT_FOUND: { errorCode: 'NOT_FOUND', errorStatus: 404 },
  UNAUTHENTICATED: { errorCode: 'UNAUTHENTICATED', errorStatus: 401 },
  UNAUTHORIZED: { errorCode: 'UNAUTHORIZED', errorStatus: 403 },
});

describe('FollowService', () => {
  const mockFollow: Follow = {
    followId: 'follow-1',
    followerUserId: 'user-1',
    targetType: FollowTargetType.User,
    targetId: 'user-2',
    approvalStatus: FollowApprovalStatus.Accepted,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUser: Partial<User> = {
    userId: 'user-2',
    username: 'johndoe',
    followPolicy: FollowPolicy.Public,
    blockedUserIds: [],
  };

  const mockFollowerUser: Partial<User> = {
    userId: 'user-1',
    username: 'janedoe',
    blockedUserIds: [],
  };

  const mockOrganization: Partial<Organization> = {
    orgId: 'org-1',
    name: 'Test Org',
    followPolicy: FollowPolicy.Public,
  };

  const mockEvent: Partial<Event> = {
    eventId: 'event-1',
    title: 'Test Event',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('follow', () => {
    describe('following a user', () => {
      it('creates follow with Accepted status for public profile', async () => {
        (UserDAO.readUserById as jest.Mock)
          .mockResolvedValueOnce(mockUser) // target user
          .mockResolvedValueOnce(mockFollowerUser); // follower user
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(mockFollow);

        const result = await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.User,
          targetId: 'user-2',
        });

        expect(FollowDAO.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            followerUserId: 'user-1',
            targetType: FollowTargetType.User,
            targetId: 'user-2',
            approvalStatus: FollowApprovalStatus.Accepted,
          }),
        );
        expect(result).toEqual(mockFollow);
      });

      it('creates follow with Pending status for profile requiring approval', async () => {
        const privateUser = { ...mockUser, followPolicy: FollowPolicy.RequireApproval };
        const pendingFollow = { ...mockFollow, approvalStatus: FollowApprovalStatus.Pending };

        (UserDAO.readUserById as jest.Mock).mockResolvedValueOnce(privateUser).mockResolvedValueOnce(mockFollowerUser);
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(pendingFollow);

        await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.User,
          targetId: 'user-2',
        });

        expect(FollowDAO.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            approvalStatus: FollowApprovalStatus.Pending,
          }),
        );
      });

      it('sends FOLLOW_RECEIVED notification for public profile', async () => {
        (UserDAO.readUserById as jest.Mock).mockResolvedValueOnce(mockUser).mockResolvedValueOnce(mockFollowerUser);
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(mockFollow);

        await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.User,
          targetId: 'user-2',
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notify).toHaveBeenCalledWith(
          expect.objectContaining({
            type: NotificationType.FOLLOW_RECEIVED,
            recipientUserId: 'user-2',
            actorUserId: 'user-1',
          }),
        );
      });

      it('sends FOLLOW_REQUEST notification for profile requiring approval', async () => {
        const privateUser = { ...mockUser, followPolicy: FollowPolicy.RequireApproval };
        const pendingFollow = { ...mockFollow, approvalStatus: FollowApprovalStatus.Pending };

        (UserDAO.readUserById as jest.Mock).mockResolvedValueOnce(privateUser).mockResolvedValueOnce(mockFollowerUser);
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(pendingFollow);

        await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.User,
          targetId: 'user-2',
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notify).toHaveBeenCalledWith(
          expect.objectContaining({
            type: NotificationType.FOLLOW_REQUEST,
            recipientUserId: 'user-2',
            actorUserId: 'user-1',
          }),
        );
      });

      it('throws error when target user has blocked follower', async () => {
        const blockingUser = { ...mockUser, blockedUserIds: ['user-1'] };

        (UserDAO.readUserById as jest.Mock).mockResolvedValueOnce(blockingUser);

        await expect(
          FollowService.follow({
            followerUserId: 'user-1',
            targetType: FollowTargetType.User,
            targetId: 'user-2',
          }),
        ).rejects.toThrow(GraphQLError);

        expect(FollowDAO.upsert).not.toHaveBeenCalled();
      });

      it('throws error when follower has blocked target user', async () => {
        const blockerUser = { ...mockFollowerUser, blockedUserIds: ['user-2'] };

        (UserDAO.readUserById as jest.Mock).mockResolvedValueOnce(mockUser).mockResolvedValueOnce(blockerUser);

        await expect(
          FollowService.follow({
            followerUserId: 'user-1',
            targetType: FollowTargetType.User,
            targetId: 'user-2',
          }),
        ).rejects.toThrow(GraphQLError);

        expect(FollowDAO.upsert).not.toHaveBeenCalled();
      });
    });

    describe('following an organization', () => {
      it('creates follow with Accepted status for public org', async () => {
        const orgFollow = { ...mockFollow, targetType: FollowTargetType.Organization, targetId: 'org-1' };

        (OrganizationDAO.readOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(orgFollow);

        await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.Organization,
          targetId: 'org-1',
        });

        expect(FollowDAO.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            approvalStatus: FollowApprovalStatus.Accepted,
          }),
        );
      });

      it('does not send notification for org follows', async () => {
        const orgFollow = { ...mockFollow, targetType: FollowTargetType.Organization, targetId: 'org-1' };

        (OrganizationDAO.readOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(orgFollow);

        await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.Organization,
          targetId: 'org-1',
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notify).not.toHaveBeenCalled();
      });
    });

    describe('saving an event', () => {
      it('creates follow with Accepted status (events are always public)', async () => {
        const eventFollow = { ...mockFollow, targetType: FollowTargetType.Event, targetId: 'event-1' };

        (EventDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(eventFollow);

        await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.Event,
          targetId: 'event-1',
        });

        expect(FollowDAO.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            approvalStatus: FollowApprovalStatus.Accepted,
          }),
        );
      });

      it('does not send notification for event saves', async () => {
        const eventFollow = { ...mockFollow, targetType: FollowTargetType.Event, targetId: 'event-1' };

        (EventDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
        (FollowDAO.upsert as jest.Mock).mockResolvedValue(eventFollow);

        await FollowService.follow({
          followerUserId: 'user-1',
          targetType: FollowTargetType.Event,
          targetId: 'event-1',
        });

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(NotificationService.notify).not.toHaveBeenCalled();
      });
    });
  });

  describe('unfollow', () => {
    it('removes the follow relationship', async () => {
      (FollowDAO.remove as jest.Mock).mockResolvedValue(true);

      const result = await FollowService.unfollow({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
      });

      expect(FollowDAO.remove).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
      });
      expect(result).toBe(true);
    });
  });

  describe('acceptFollowRequest', () => {
    it('updates approval status and sends notification', async () => {
      const acceptedFollow = { ...mockFollow, approvalStatus: FollowApprovalStatus.Accepted };
      (FollowDAO.updateApprovalStatus as jest.Mock).mockResolvedValue(acceptedFollow);

      const result = await FollowService.acceptFollowRequest('follow-1', 'user-2');

      expect(FollowDAO.updateApprovalStatus).toHaveBeenCalledWith('follow-1', 'user-2', FollowApprovalStatus.Accepted);
      expect(result).toEqual(acceptedFollow);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.FOLLOW_ACCEPTED,
          recipientUserId: 'user-1', // The follower
          actorUserId: 'user-2', // The target who accepted
        }),
      );
    });
  });

  describe('rejectFollowRequest', () => {
    it('updates approval status and does NOT send notification', async () => {
      const rejectedFollow = { ...mockFollow, approvalStatus: FollowApprovalStatus.Rejected };
      (FollowDAO.updateApprovalStatus as jest.Mock).mockResolvedValue(rejectedFollow);

      const result = await FollowService.rejectFollowRequest('follow-1', 'user-2');

      expect(FollowDAO.updateApprovalStatus).toHaveBeenCalledWith('follow-1', 'user-2', FollowApprovalStatus.Rejected);
      expect(result).toBe(true);

      // Wait to ensure no notification is sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).not.toHaveBeenCalled();
    });
  });

  describe('removeFollower', () => {
    it('delegates to FollowDAO.removeFollower', async () => {
      (FollowDAO.removeFollower as jest.Mock).mockResolvedValue(true);

      const result = await FollowService.removeFollower('user-2', 'user-1', FollowTargetType.User);

      expect(FollowDAO.removeFollower).toHaveBeenCalledWith('user-2', 'user-1', FollowTargetType.User);
      expect(result).toBe(true);
    });
  });
});
