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
  OPERATIONS: {
    USER: {
      UPDATE_USER: 'updateUser',
      DELETE_USER_BY_ID: 'deleteUserById',
      DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
      DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
    },
    EVENT: {
      UPDATE_EVENT: 'updateEvent',
      DELETE_EVENT: 'deleteEventById',
      DELETE_EVENT_BY_SLUG: 'deleteEventBySlug',
      CREATE_EVENT: 'createEvent',
    },
    EVENT_PARTICIPANT: {
      UPSERT_EVENT_PARTICIPANT: 'upsertEventParticipant',
      CANCEL_EVENT_PARTICIPANT: 'cancelEventParticipant',
      READ_EVENT_PARTICIPANTS: 'readEventParticipants',
    },
    ORGANIZATION: {
      CREATE_ORGANIZATION: 'createOrganization',
      UPDATE_ORGANIZATION: 'updateOrganization',
      DELETE_ORGANIZATION: 'deleteOrganizationById',
    },
    ORGANIZATION_MEMBERSHIP: {
      CREATE_ORGANIZATION_MEMBERSHIP: 'createOrganizationMembership',
      UPDATE_ORGANIZATION_MEMBERSHIP: 'updateOrganizationMembership',
      DELETE_ORGANIZATION_MEMBERSHIP: 'deleteOrganizationMembership',
    },
    VENUE: {
      CREATE_VENUE: 'createVenue',
      UPDATE_VENUE: 'updateVenue',
      DELETE_VENUE: 'deleteVenueById',
    },
  },
  OPERATION_NAMES: {
    UPDATE_USER: 'updateUser',
    DELETE_USER_BY_ID: 'deleteUserById',
    DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
    DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
    UPDATE_EVENT: 'updateEvent',
    DELETE_EVENT: 'deleteEventById',
  },
}));

jest.mock('@/mongodb/dao', () => ({
  UserDAO: {
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    muteUser: jest.fn(),
    unmuteUser: jest.fn(),
    muteOrganization: jest.fn(),
    unmuteOrganization: jest.fn(),
  },
  FollowDAO: {
    remove: jest.fn(),
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

import { UserService } from '@/services';
import { UserDAO, FollowDAO } from '@/mongodb/dao';
import type { User } from '@ntlango/commons/types';
import { FollowTargetType } from '@ntlango/commons/types';

describe('UserService', () => {
  const mockUser: Partial<User> = {
    userId: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    blockedUserIds: ['blocked-1'],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('blockUser', () => {
    it('removes follow relationships and blocks user', async () => {
      (UserDAO.blockUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        blockedUserIds: ['blocked-1', 'user-2'],
      });
      (FollowDAO.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await UserService.blockUser('user-1', 'user-2');

      expect(UserDAO.blockUser).toHaveBeenCalledWith('user-1', 'user-2');
      expect(result.blockedUserIds).toContain('user-2');

      // Wait for async follow cleanup
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Both directions should be attempted
      expect(FollowDAO.remove).toHaveBeenCalledWith({
        followerUserId: 'user-1',
        targetType: FollowTargetType.User,
        targetId: 'user-2',
      });
      expect(FollowDAO.remove).toHaveBeenCalledWith({
        followerUserId: 'user-2',
        targetType: FollowTargetType.User,
        targetId: 'user-1',
      });
    });

    it('succeeds even when follow removal fails', async () => {
      (UserDAO.blockUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        blockedUserIds: ['blocked-1', 'user-2'],
      });
      (FollowDAO.remove as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await UserService.blockUser('user-1', 'user-2');

      expect(result.blockedUserIds).toContain('user-2');
      expect(UserDAO.blockUser).toHaveBeenCalledWith('user-1', 'user-2');

      // Wait for async follow cleanup
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should still attempt removal even if it fails
      expect(FollowDAO.remove).toHaveBeenCalled();
    });

    it('handles users with no existing follow relationship', async () => {
      (UserDAO.blockUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        blockedUserIds: ['blocked-1', 'stranger'],
      });
      (FollowDAO.remove as jest.Mock).mockRejectedValue(new Error('Follow edge not found'));

      const result = await UserService.blockUser('user-1', 'stranger');

      expect(result.blockedUserIds).toContain('stranger');

      // Wait for async follow cleanup
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(FollowDAO.remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('unblockUser', () => {
    it('unblocks user without restoring follows', async () => {
      (UserDAO.unblockUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        blockedUserIds: [],
      });

      const result = await UserService.unblockUser('user-1', 'blocked-1');

      expect(UserDAO.unblockUser).toHaveBeenCalledWith('user-1', 'blocked-1');
      expect(result.blockedUserIds).not.toContain('blocked-1');
      // Should NOT attempt to restore follows
      expect(FollowDAO.remove).not.toHaveBeenCalled();
    });
  });

  describe('muteUser', () => {
    it('mutes a user', async () => {
      (UserDAO.muteUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        mutedUserIds: ['muted-1'],
      });

      const result = await UserService.muteUser('user-1', 'muted-1');

      expect(UserDAO.muteUser).toHaveBeenCalledWith('user-1', 'muted-1');
      expect(result.mutedUserIds).toContain('muted-1');
    });
  });

  describe('unmuteUser', () => {
    it('unmutes a user', async () => {
      (UserDAO.unmuteUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        mutedUserIds: [],
      });

      const result = await UserService.unmuteUser('user-1', 'muted-1');

      expect(UserDAO.unmuteUser).toHaveBeenCalledWith('user-1', 'muted-1');
      expect(result.mutedUserIds).not.toContain('muted-1');
    });
  });

  describe('muteOrganization', () => {
    it('mutes an organization', async () => {
      (UserDAO.muteOrganization as jest.Mock).mockResolvedValue({
        ...mockUser,
        mutedOrgIds: ['org-1'],
      });

      const result = await UserService.muteOrganization('user-1', 'org-1');

      expect(UserDAO.muteOrganization).toHaveBeenCalledWith('user-1', 'org-1');
      expect(result.mutedOrgIds).toContain('org-1');
    });
  });

  describe('unmuteOrganization', () => {
    it('unmutes an organization', async () => {
      (UserDAO.unmuteOrganization as jest.Mock).mockResolvedValue({
        ...mockUser,
        mutedOrgIds: [],
      });

      const result = await UserService.unmuteOrganization('user-1', 'org-1');

      expect(UserDAO.unmuteOrganization).toHaveBeenCalledWith('user-1', 'org-1');
      expect(result.mutedOrgIds).not.toContain('org-1');
    });
  });
});
