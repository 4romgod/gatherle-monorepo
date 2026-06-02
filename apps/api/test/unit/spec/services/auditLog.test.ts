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
}));

jest.mock('@/mongodb/dao/auditLog', () => ({
  __esModule: true,
  default: {
    write: jest.fn(),
    readPage: jest.fn(),
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

import AuditLogDAO from '@/mongodb/dao/auditLog';
import AuditLogService from '@/services/auditLog';
import { AuditAction, AuditTargetType, UserRole } from '@gatherle/commons/types';
import { logger } from '@/utils/logger';

describe('AuditLogService', () => {
  const actorId = 'actor-user-1';
  const actorRole = UserRole.Admin;

  afterEach(() => {
    jest.clearAllMocks();
  });

  const expectWrite = (expected: Partial<Parameters<typeof AuditLogDAO.write>[0]>) => {
    expect(AuditLogDAO.write).toHaveBeenCalledWith(expect.objectContaining(expected));
  };

  // ─── logUserDeleted ──────────────────────────────────────────────────────

  describe('logUserDeleted', () => {
    it('calls AuditLogDAO.write with correct params', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logUserDeleted({
        actorId,
        actorRole,
        targetUserId: 'user-2',
        userSnapshot: { userId: 'user-2', username: 'john' },
        ipAddress: '1.2.3.4',
      });

      expectWrite({
        actorId,
        actorRole,
        action: AuditAction.USER_DELETED,
        targetType: AuditTargetType.User,
        targetId: 'user-2',
        ipAddress: '1.2.3.4',
      });
    });

    it('logs error and does not throw when DAO.write rejects', async () => {
      (AuditLogDAO.write as jest.Mock).mockRejectedValue(new Error('db error'));

      expect(() =>
        AuditLogService.logUserDeleted({
          actorId,
          actorRole,
          targetUserId: 'user-2',
          userSnapshot: {},
        }),
      ).not.toThrow();

      // Allow the rejected promise to settle
      await Promise.resolve();
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── logUserRoleChanged ───────────────────────────────────────────────────

  describe('logUserRoleChanged', () => {
    it('calls AuditLogDAO.write with before/after role', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logUserRoleChanged({
        actorId,
        actorRole,
        targetUserId: 'user-2',
        previousRole: UserRole.User,
        newRole: UserRole.Host,
      });

      expectWrite({
        action: AuditAction.USER_ROLE_CHANGED,
        before: { userRole: UserRole.User },
        after: { userRole: UserRole.Host },
      });
    });
  });

  // ─── logOrgDeleted ────────────────────────────────────────────────────────

  describe('logOrgDeleted', () => {
    it('calls AuditLogDAO.write with correct target', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logOrgDeleted({
        actorId,
        actorRole,
        orgId: 'org-1',
        orgSnapshot: { orgId: 'org-1', name: 'My Org' },
      });

      expectWrite({
        action: AuditAction.ORG_DELETED,
        targetType: AuditTargetType.Organization,
        targetId: 'org-1',
      });
    });
  });

  // ─── logOrgOwnershipTransferred ───────────────────────────────────────────

  describe('logOrgOwnershipTransferred', () => {
    it('records previous and new owner', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logOrgOwnershipTransferred({
        actorId,
        actorRole,
        orgId: 'org-1',
        orgName: 'My Org',
        previousOwnerId: 'user-old',
        newOwnerId: 'user-new',
      });

      expectWrite({
        action: AuditAction.ORG_OWNERSHIP_TRANSFERRED,
        before: { ownerId: 'user-old' },
        after: { ownerId: 'user-new' },
        metadata: { orgName: 'My Org' },
      });
    });
  });

  // ─── logOrgMembershipCreated ──────────────────────────────────────────────

  describe('logOrgMembershipCreated', () => {
    it('stores membership snapshot as after', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logOrgMembershipCreated({
        actorId,
        actorRole,
        membershipSnapshot: { membershipId: 'mem-1', orgId: 'org-1', userId: 'user-2', role: 'Member' as never },
      });

      expectWrite({
        action: AuditAction.ORG_MEMBERSHIP_CREATED,
        targetType: AuditTargetType.OrganizationMembership,
        targetId: 'mem-1',
      });
    });
  });

  // ─── logOrgMembershipRoleChanged ──────────────────────────────────────────

  describe('logOrgMembershipRoleChanged', () => {
    it('records role before and after', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logOrgMembershipRoleChanged({
        actorId,
        actorRole,
        membershipId: 'mem-1',
        orgId: 'org-1',
        targetUserId: 'user-2',
        previousRole: 'Member',
        newRole: 'Admin',
      });

      expectWrite({
        action: AuditAction.ORG_MEMBERSHIP_ROLE_CHANGED,
        before: { role: 'Member' },
        after: { role: 'Admin' },
      });
    });
  });

  // ─── logOrgMembershipDeleted ──────────────────────────────────────────────

  describe('logOrgMembershipDeleted', () => {
    it('stores membership snapshot as before', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logOrgMembershipDeleted({
        actorId,
        actorRole,
        membershipSnapshot: { membershipId: 'mem-1', orgId: 'org-1', userId: 'user-2', role: 'Member' as never },
      });

      expectWrite({
        action: AuditAction.ORG_MEMBERSHIP_DELETED,
        targetType: AuditTargetType.OrganizationMembership,
        targetId: 'mem-1',
      });
    });
  });

  // ─── logEventDeleted ─────────────────────────────────────────────────────

  describe('logEventDeleted', () => {
    it('passes event metadata', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logEventDeleted({
        actorId,
        actorRole,
        eventId: 'event-1',
        eventTitle: 'Test Event',
        orgId: 'org-1',
      });

      expectWrite({
        action: AuditAction.EVENT_DELETED,
        targetType: AuditTargetType.Event,
        targetId: 'event-1',
        metadata: { title: 'Test Event', orgId: 'org-1' },
      });
    });
  });

  // ─── logVenueDeleted ─────────────────────────────────────────────────────

  describe('logVenueDeleted', () => {
    it('passes venue metadata', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logVenueDeleted({
        actorId,
        actorRole,
        venueId: 'venue-1',
        venueName: 'Grand Hall',
      });

      expectWrite({
        action: AuditAction.VENUE_DELETED,
        targetType: AuditTargetType.Venue,
        targetId: 'venue-1',
        metadata: { name: 'Grand Hall' },
      });
    });
  });

  // ─── logCategoryCreated / Deleted ─────────────────────────────────────────

  describe('logCategoryCreated', () => {
    it('stores category name as after', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logCategoryCreated({
        actorId,
        actorRole,
        categoryId: 'cat-1',
        categoryName: 'Music',
      });

      expectWrite({
        action: AuditAction.CATEGORY_CREATED,
        targetType: AuditTargetType.EventCategory,
        after: { name: 'Music' },
      });
    });
  });

  describe('logCategoryDeleted', () => {
    it('stores category name as metadata', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logCategoryDeleted({
        actorId,
        actorRole,
        categoryId: 'cat-1',
        categoryName: 'Music',
      });

      expectWrite({
        action: AuditAction.CATEGORY_DELETED,
        targetType: AuditTargetType.EventCategory,
        metadata: { name: 'Music' },
      });
    });
  });

  // ─── logCategoryGroupCreated / Deleted ────────────────────────────────────

  describe('logCategoryGroupCreated', () => {
    it('stores group name as after', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logCategoryGroupCreated({
        actorId,
        actorRole,
        categoryGroupId: 'grp-1',
        categoryGroupName: 'Arts',
      });

      expectWrite({
        action: AuditAction.CATEGORY_GROUP_CREATED,
        targetType: AuditTargetType.EventCategoryGroup,
        after: { name: 'Arts' },
      });
    });
  });

  describe('logCategoryGroupDeleted', () => {
    it('stores group name as metadata', () => {
      (AuditLogDAO.write as jest.Mock).mockResolvedValue(undefined);

      AuditLogService.logCategoryGroupDeleted({
        actorId,
        actorRole,
        categoryGroupId: 'grp-1',
        categoryGroupName: 'Arts',
      });

      expectWrite({
        action: AuditAction.CATEGORY_GROUP_DELETED,
        targetType: AuditTargetType.EventCategoryGroup,
        metadata: { name: 'Arts' },
      });
    });
  });

  // ─── readPage ────────────────────────────────────────────────────────────

  describe('readPage', () => {
    it('delegates to AuditLogDAO.readPage and returns the result', async () => {
      const mockPage = { items: [], hasMore: false, nextCursor: undefined };
      (AuditLogDAO.readPage as jest.Mock).mockResolvedValue(mockPage);

      const filters = { actorId: 'actor-1', limit: 10 };
      const result = await AuditLogService.readPage(filters);

      expect(AuditLogDAO.readPage).toHaveBeenCalledWith(filters);
      expect(result).toBe(mockPage);
    });
  });
});
