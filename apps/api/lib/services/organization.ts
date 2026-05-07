import { FollowTargetType, NotificationTargetType, type Organization } from '@gatherle/commons/types';
import { ActivityDAO, FollowDAO, NotificationDAO, OrganizationDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

class OrganizationService {
  private static async cleanupDeletedOrganizationData(orgId: string, slug: string): Promise<void> {
    const cleanupSteps = [
      ['organization memberships', () => OrganizationMembershipDAO.deleteByOrgId(orgId)],
      ['organization follows', () => FollowDAO.deleteByTarget(FollowTargetType.Organization, orgId)],
      ['organization activities', () => ActivityDAO.deleteByOrganizationId(orgId)],
      [
        'organization notifications',
        () => NotificationDAO.deleteByTargetReference(NotificationTargetType.Organization, slug),
      ],
    ] as const;

    const results = await Promise.allSettled(cleanupSteps.map(([, cleanup]) => cleanup()));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error('[OrganizationService.cleanupDeletedOrganizationData] Best-effort cleanup step failed', {
          orgId,
          cleanupStep: cleanupSteps[index][0],
          error: result.reason,
        });
      }
    });
  }

  static async deleteById(orgId: string): Promise<Organization> {
    logger.debug(`[OrganizationService.deleteById] Deleting organization ${orgId}`);

    const deletedOrganization = await OrganizationDAO.deleteOrganizationById(orgId);
    await this.cleanupDeletedOrganizationData(orgId, deletedOrganization.slug);

    return deletedOrganization;
  }
}

export default OrganizationService;
