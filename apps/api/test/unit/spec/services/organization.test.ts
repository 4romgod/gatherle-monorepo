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

jest.mock('@/mongodb/dao', () => ({
  OrganizationDAO: {
    deleteOrganizationById: jest.fn(),
    readOrganizationById: jest.fn(),
    updateOwnerId: jest.fn(),
  },
  OrganizationMembershipDAO: {
    deleteByOrgId: jest.fn(),
    readMembershipsByOrgId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  FollowDAO: {
    deleteByTarget: jest.fn(),
  },
  ActivityDAO: {
    deleteByOrganizationId: jest.fn(),
  },
  NotificationDAO: {
    deleteByTargetReference: jest.fn(),
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

import {
  ActivityDAO,
  FollowDAO,
  NotificationDAO,
  OrganizationDAO,
  OrganizationMembershipDAO,
  UserDAO,
} from '@/mongodb/dao';
import OrganizationService from '@/services/organization';
import { logger } from '@/utils/logger';
import type { Organization, OrganizationMembership } from '@gatherle/commons/types';
import { FollowTargetType, NotificationTargetType, OrganizationRole } from '@gatherle/commons/types';

describe('OrganizationService', () => {
  const mockOrganization: Partial<Organization> = {
    orgId: 'org-1',
    slug: 'test-org',
    name: 'Test Org',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deletes an organization and cascades related cleanup', async () => {
    (OrganizationDAO.deleteOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);
    (OrganizationMembershipDAO.deleteByOrgId as jest.Mock).mockResolvedValue(undefined);
    (FollowDAO.deleteByTarget as jest.Mock).mockResolvedValue(undefined);
    (ActivityDAO.deleteByOrganizationId as jest.Mock).mockResolvedValue(undefined);
    (NotificationDAO.deleteByTargetReference as jest.Mock).mockResolvedValue(undefined);

    const result = await OrganizationService.deleteById('org-1');

    expect(OrganizationDAO.deleteOrganizationById).toHaveBeenCalledWith('org-1');
    expect(OrganizationMembershipDAO.deleteByOrgId).toHaveBeenCalledWith('org-1');
    expect(FollowDAO.deleteByTarget).toHaveBeenCalledWith(FollowTargetType.Organization, 'org-1');
    expect(ActivityDAO.deleteByOrganizationId).toHaveBeenCalledWith('org-1');
    expect(NotificationDAO.deleteByTargetReference).toHaveBeenCalledWith(
      NotificationTargetType.Organization,
      'test-org',
    );
    expect(result).toEqual(mockOrganization);
  });

  it('returns the deleted organization even when a cleanup step fails', async () => {
    (OrganizationDAO.deleteOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);
    (OrganizationMembershipDAO.deleteByOrgId as jest.Mock).mockRejectedValue(new Error('cleanup failed'));

    const result = await OrganizationService.deleteById('org-1');

    expect(OrganizationDAO.deleteOrganizationById).toHaveBeenCalledWith('org-1');
    expect(FollowDAO.deleteByTarget).toHaveBeenCalledWith(FollowTargetType.Organization, 'org-1');
    expect(logger.error).toHaveBeenCalledWith(
      '[OrganizationService.cleanupDeletedOrganizationData] Best-effort cleanup step failed',
      expect.objectContaining({
        orgId: 'org-1',
        cleanupStep: 'organization memberships',
        error: expect.any(Error),
      }),
    );
    expect(result).toEqual(mockOrganization);
  });

  describe('transferOwnership', () => {
    const orgWithOwner: Partial<Organization> = {
      orgId: 'org-1',
      slug: 'test-org',
      name: 'Test Org',
      ownerId: 'old-owner',
    };

    const ownerMembership: OrganizationMembership = {
      membershipId: 'mem-old',
      orgId: 'org-1',
      userId: 'old-owner',
      role: OrganizationRole.Owner,
      joinedAt: new Date('2024-01-01T00:00:00Z'),
    };

    const adminMembership: OrganizationMembership = {
      membershipId: 'mem-new',
      orgId: 'org-1',
      userId: 'new-owner',
      role: OrganizationRole.Admin,
      joinedAt: new Date('2024-02-01T00:00:00Z'),
    };

    beforeEach(() => {
      (OrganizationDAO.readOrganizationById as jest.Mock).mockResolvedValue(orgWithOwner);
      (OrganizationDAO.updateOwnerId as jest.Mock).mockResolvedValue({ ...orgWithOwner, ownerId: 'new-owner' });
      (UserDAO.readUserById as jest.Mock).mockResolvedValue({ userId: 'new-owner' });
      (OrganizationMembershipDAO.readMembershipsByOrgId as jest.Mock).mockResolvedValue([
        ownerMembership,
        adminMembership,
      ]);
      (OrganizationMembershipDAO.update as jest.Mock).mockImplementation(async (input) => ({
        ...adminMembership,
        ...input,
      }));
      (OrganizationMembershipDAO.create as jest.Mock).mockImplementation(async (input) => ({
        membershipId: 'mem-created',
        joinedAt: new Date(),
        ...input,
      }));
    });

    it('promotes an existing member to Owner and demotes the previous owner to Admin', async () => {
      const result = await OrganizationService.transferOwnership('org-1', 'new-owner', 'old-owner');

      expect(UserDAO.readUserById).toHaveBeenCalledWith('new-owner');
      expect(OrganizationMembershipDAO.update).toHaveBeenCalledWith({
        membershipId: 'mem-new',
        role: OrganizationRole.Owner,
      });
      expect(OrganizationMembershipDAO.update).toHaveBeenCalledWith({
        membershipId: 'mem-old',
        role: OrganizationRole.Admin,
      });
      expect(OrganizationMembershipDAO.create).not.toHaveBeenCalled();
      expect(OrganizationDAO.updateOwnerId).toHaveBeenCalledWith('org-1', 'new-owner');
      expect(result.ownerId).toBe('new-owner');
    });

    it('creates an Owner membership when the new owner is not yet a member', async () => {
      (OrganizationMembershipDAO.readMembershipsByOrgId as jest.Mock).mockResolvedValue([ownerMembership]);

      await OrganizationService.transferOwnership('org-1', 'new-owner', 'old-owner');

      expect(OrganizationMembershipDAO.create).toHaveBeenCalledWith({
        orgId: 'org-1',
        userId: 'new-owner',
        role: OrganizationRole.Owner,
      });
      expect(OrganizationMembershipDAO.update).toHaveBeenCalledWith({
        membershipId: 'mem-old',
        role: OrganizationRole.Admin,
      });
    });

    it('rejects transferring to the existing owner', async () => {
      await expect(OrganizationService.transferOwnership('org-1', 'old-owner', 'old-owner')).rejects.toThrow(
        'already the owner',
      );

      expect(OrganizationMembershipDAO.update).not.toHaveBeenCalled();
      expect(OrganizationDAO.updateOwnerId).not.toHaveBeenCalled();
    });

    it('rejects when the proposed new owner does not exist', async () => {
      (UserDAO.readUserById as jest.Mock).mockRejectedValue(new Error('User with id new-owner not found'));

      await expect(OrganizationService.transferOwnership('org-1', 'new-owner', 'old-owner')).rejects.toThrow(
        'not found',
      );

      expect(OrganizationDAO.updateOwnerId).not.toHaveBeenCalled();
    });

    it('still updates the org owner when the previous owner has no membership record', async () => {
      (OrganizationMembershipDAO.readMembershipsByOrgId as jest.Mock).mockResolvedValue([adminMembership]);

      await OrganizationService.transferOwnership('org-1', 'new-owner', 'platform-admin');

      expect(OrganizationMembershipDAO.update).toHaveBeenCalledWith({
        membershipId: 'mem-new',
        role: OrganizationRole.Owner,
      });
      expect(OrganizationMembershipDAO.update).toHaveBeenCalledTimes(1);
      expect(OrganizationDAO.updateOwnerId).toHaveBeenCalledWith('org-1', 'new-owner');
    });
  });
});
