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
  },
  OrganizationMembershipDAO: {
    deleteByOrgId: jest.fn(),
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
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ActivityDAO, FollowDAO, NotificationDAO, OrganizationDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import OrganizationService from '@/services/organization';
import { logger } from '@/utils/logger';
import type { Organization } from '@gatherle/commons/types';
import { FollowTargetType, NotificationTargetType } from '@gatherle/commons/types';

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
});
