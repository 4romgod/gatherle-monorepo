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
  OrganizationMembershipDAO: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    readMembershipById: jest.fn(),
    readMembershipsByOrgId: jest.fn(),
  },
  OrganizationDAO: {
    readOrganizationById: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
}));

jest.mock('@/services/notification', () => ({
  notify: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/services/auditLog', () => ({
  __esModule: true,
  default: {
    logOrgMembershipCreated: jest.fn(),
    logOrgMembershipRoleChanged: jest.fn(),
    logOrgMembershipDeleted: jest.fn(),
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

import { OrganizationMembershipService } from '@/services';
import { OrganizationMembershipDAO, OrganizationDAO, UserDAO } from '@/mongodb/dao';
import AuditLogService from '@/services/auditLog';
import NotificationService from '@/services/notification';
import type { OrganizationMembership, Organization } from '@gatherle/commons/types';
import { OrganizationRole, NotificationType, NotificationTargetType, UserRole } from '@gatherle/commons/types';

describe('OrganizationMembershipService', () => {
  const mockMembership: OrganizationMembership = {
    membershipId: 'membership-1',
    orgId: 'org-1',
    userId: 'user-1',
    role: OrganizationRole.Member,
    joinedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockOrganization: Partial<Organization> = {
    orgId: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    ownerId: 'admin-user',
  };

  beforeEach(() => {
    // Mock OrganizationDAO for notification URL generation
    (OrganizationDAO.readOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);
    // Mock readMembershipsByOrgId to support verifyOrganizationAdminAccess
    (OrganizationMembershipDAO.readMembershipsByOrgId as jest.Mock).mockResolvedValue([
      { ...mockMembership, userId: 'admin-user', role: OrganizationRole.Admin },
      mockMembership,
    ]);
    // Default actor lookup returns a non-platform-admin user
    (UserDAO.readUserById as jest.Mock).mockResolvedValue({ userId: 'admin-user', userRole: 'User' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addMember', () => {
    it('creates membership and sends ORG_INVITE notification', async () => {
      (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);

      const result = await OrganizationMembershipService.addMember(
        { orgId: 'org-1', userId: 'user-1', role: OrganizationRole.Member },
        'admin-user',
      );

      expect(OrganizationMembershipDAO.create).toHaveBeenCalledWith({
        orgId: 'org-1',
        userId: 'user-1',
        role: OrganizationRole.Member,
      });
      expect(result).toEqual(mockMembership);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).toHaveBeenCalledWith({
        type: NotificationType.ORG_INVITE,
        recipientUserId: 'user-1',
        actorUserId: 'admin-user',
        targetType: NotificationTargetType.Organization,
        targetSlug: 'test-org',
      });
    });

    it('creates membership without actorUserId', async () => {
      (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);

      const result = await OrganizationMembershipService.addMember({
        orgId: 'org-1',
        userId: 'user-1',
        role: OrganizationRole.Member,
      });

      expect(result).toEqual(mockMembership);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: undefined,
        }),
      );
    });

    it('succeeds even if notification fails', async () => {
      (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);
      (NotificationService.notify as jest.Mock).mockRejectedValue(new Error('Notification failed'));

      const result = await OrganizationMembershipService.addMember(
        { orgId: 'org-1', userId: 'user-1', role: OrganizationRole.Member },
        'admin-user',
      );

      expect(result).toEqual(mockMembership);

      // Wait for async notification to fail gracefully
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).toHaveBeenCalled();
    });

    it('creates membership with Admin role', async () => {
      const adminMembership = { ...mockMembership, role: OrganizationRole.Admin };
      (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(adminMembership);

      const result = await OrganizationMembershipService.addMember({
        orgId: 'org-1',
        userId: 'user-1',
        role: OrganizationRole.Admin,
      });

      expect(result.role).toEqual(OrganizationRole.Admin);
    });

    it('fires audit log when actor and actorRole are provided', async () => {
      (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);

      await OrganizationMembershipService.addMember(
        { orgId: 'org-1', userId: 'user-1', role: OrganizationRole.Member },
        'admin-user',
        { actorRole: UserRole.Admin, ipAddress: '1.2.3.4' },
      );

      expect(AuditLogService.logOrgMembershipCreated).toHaveBeenCalledWith({
        actorId: 'admin-user',
        actorRole: UserRole.Admin,
        membershipSnapshot: {
          membershipId: mockMembership.membershipId,
          orgId: mockMembership.orgId,
          userId: mockMembership.userId,
          role: mockMembership.role,
        },
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actorRole is absent', async () => {
      (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);

      await OrganizationMembershipService.addMember(
        { orgId: 'org-1', userId: 'user-1', role: OrganizationRole.Member },
        'admin-user',
      );

      expect(AuditLogService.logOrgMembershipCreated).not.toHaveBeenCalled();
    });

    it('rejects assigning Owner role through member management', async () => {
      await expect(
        OrganizationMembershipService.addMember(
          {
            orgId: 'org-1',
            userId: 'user-2',
            role: OrganizationRole.Owner,
          },
          'admin-user',
        ),
      ).rejects.toThrow('Owner membership cannot be assigned from member management');

      expect(OrganizationMembershipDAO.create).not.toHaveBeenCalled();
    });

    it('allows assigning Owner role for organization bootstrap flows', async () => {
      const ownerMembership = { ...mockMembership, role: OrganizationRole.Owner, userId: 'owner-user' };
      (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(ownerMembership);

      const result = await OrganizationMembershipService.addMember(
        {
          orgId: 'org-1',
          userId: 'owner-user',
          role: OrganizationRole.Owner,
        },
        'owner-user',
        { allowOwnerAssignment: true },
      );

      expect(result).toEqual(ownerMembership);
      expect(OrganizationMembershipDAO.create).toHaveBeenCalledWith({
        orgId: 'org-1',
        userId: 'owner-user',
        role: OrganizationRole.Owner,
      });
    });
  });

  describe('updateMemberRole', () => {
    it('updates role and sends ORG_ROLE_CHANGED notification', async () => {
      const updatedMembership = { ...mockMembership, role: OrganizationRole.Admin };
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
      (OrganizationMembershipDAO.update as jest.Mock).mockResolvedValue(updatedMembership);

      const result = await OrganizationMembershipService.updateMemberRole(
        { membershipId: 'membership-1', role: OrganizationRole.Admin },
        'admin-user',
      );

      expect(OrganizationMembershipDAO.readMembershipById).toHaveBeenCalledWith('membership-1');
      expect(OrganizationMembershipDAO.update).toHaveBeenCalledWith({
        membershipId: 'membership-1',
        role: OrganizationRole.Admin,
      });
      expect(result.role).toEqual(OrganizationRole.Admin);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).toHaveBeenCalledWith({
        type: NotificationType.ORG_ROLE_CHANGED,
        recipientUserId: 'user-1',
        actorUserId: 'admin-user',
        targetType: NotificationTargetType.Organization,
        targetSlug: 'test-org',
      });
    });

    it('does NOT send notification when user updates their own role', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);

      await expect(
        OrganizationMembershipService.updateMemberRole(
          { membershipId: 'membership-1', role: OrganizationRole.Admin },
          'user-1', // Same as membership userId
        ),
      ).rejects.toThrow('Users cannot modify their own role');

      expect(NotificationService.notify).not.toHaveBeenCalled();
    });

    it('sends notification when updatedByUserId is undefined', async () => {
      const updatedMembership = { ...mockMembership, role: OrganizationRole.Admin };
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
      (OrganizationMembershipDAO.update as jest.Mock).mockResolvedValue(updatedMembership);

      await OrganizationMembershipService.updateMemberRole({
        membershipId: 'membership-1',
        role: OrganizationRole.Admin,
      });

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(NotificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: undefined,
        }),
      );
    });

    it('succeeds even if notification fails', async () => {
      const updatedMembership = { ...mockMembership, role: OrganizationRole.Admin };
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
      (OrganizationMembershipDAO.update as jest.Mock).mockResolvedValue(updatedMembership);
      (NotificationService.notify as jest.Mock).mockRejectedValue(new Error('Notification failed'));

      const result = await OrganizationMembershipService.updateMemberRole(
        { membershipId: 'membership-1', role: OrganizationRole.Admin },
        'admin-user',
      );

      expect(result.role).toEqual(OrganizationRole.Admin);

      // Wait for async notification to fail gracefully
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('throws error when user tries to modify their own role', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);

      await expect(
        OrganizationMembershipService.updateMemberRole(
          { membershipId: 'membership-1', role: OrganizationRole.Owner },
          'user-1', // Same as membership userId
        ),
      ).rejects.toThrow('Users cannot modify their own role');

      expect(OrganizationMembershipDAO.update).not.toHaveBeenCalled();
    });

    it('rejects changing an existing Owner membership', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: OrganizationRole.Owner,
      });

      await expect(
        OrganizationMembershipService.updateMemberRole(
          { membershipId: 'membership-1', role: OrganizationRole.Admin },
          'admin-user',
        ),
      ).rejects.toThrow('Owner membership cannot be modified from member management');

      expect(OrganizationMembershipDAO.update).not.toHaveBeenCalled();
    });

    it('rejects promoting a member to Owner through member management', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);

      await expect(
        OrganizationMembershipService.updateMemberRole(
          { membershipId: 'membership-1', role: OrganizationRole.Owner },
          'admin-user',
        ),
      ).rejects.toThrow('Owner membership cannot be assigned from member management');

      expect(OrganizationMembershipDAO.update).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('removes membership without sending notification', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
      (OrganizationMembershipDAO.delete as jest.Mock).mockResolvedValue(mockMembership);

      const result = await OrganizationMembershipService.removeMember('membership-1', 'admin-user');

      expect(OrganizationMembershipDAO.readMembershipById).toHaveBeenCalledWith('membership-1');
      expect(OrganizationMembershipDAO.delete).toHaveBeenCalledWith('membership-1');
      expect(result).toEqual(mockMembership);
      expect(NotificationService.notify).not.toHaveBeenCalled();
    });

    it('throws error when user tries to remove themselves', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);

      await expect(
        OrganizationMembershipService.removeMember('membership-1', 'user-1'), // Same as membership userId
      ).rejects.toThrow('Users cannot remove themselves from an organization');

      expect(OrganizationMembershipDAO.delete).not.toHaveBeenCalled();
    });

    it('rejects removing the Owner membership through member management', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue({
        ...mockMembership,
        role: OrganizationRole.Owner,
      });

      await expect(OrganizationMembershipService.removeMember('membership-1', 'admin-user')).rejects.toThrow(
        'Owner membership cannot be removed from member management',
      );

      expect(OrganizationMembershipDAO.delete).not.toHaveBeenCalled();
    });

    it('allows a platform admin to remove a member even without org-level membership', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
      (OrganizationMembershipDAO.delete as jest.Mock).mockResolvedValue(mockMembership);
      // Platform admin actor is not a member of the org
      (OrganizationMembershipDAO.readMembershipsByOrgId as jest.Mock).mockResolvedValue([mockMembership]);
      (OrganizationDAO.readOrganizationById as jest.Mock).mockResolvedValue({
        ...mockOrganization,
        ownerId: 'someone-else',
      });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue({ userId: 'platform-admin', userRole: 'Admin' });

      const result = await OrganizationMembershipService.removeMember('membership-1', 'platform-admin');

      expect(OrganizationMembershipDAO.delete).toHaveBeenCalledWith('membership-1');
      expect(result).toEqual(mockMembership);
    });

    it('fires audit log when actor and actorRole are provided', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
      (OrganizationMembershipDAO.delete as jest.Mock).mockResolvedValue(mockMembership);

      await OrganizationMembershipService.removeMember('membership-1', 'admin-user', UserRole.Admin, '1.2.3.4');

      expect(AuditLogService.logOrgMembershipDeleted).toHaveBeenCalledWith({
        actorId: 'admin-user',
        actorRole: UserRole.Admin,
        membershipSnapshot: {
          membershipId: mockMembership.membershipId,
          orgId: mockMembership.orgId,
          userId: mockMembership.userId,
          role: mockMembership.role,
        },
        ipAddress: '1.2.3.4',
      });
    });

    it('does not fire audit log when actorRole is absent', async () => {
      (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
      (OrganizationMembershipDAO.delete as jest.Mock).mockResolvedValue(mockMembership);

      await OrganizationMembershipService.removeMember('membership-1', 'admin-user');

      expect(AuditLogService.logOrgMembershipDeleted).not.toHaveBeenCalled();
    });
  });
});
