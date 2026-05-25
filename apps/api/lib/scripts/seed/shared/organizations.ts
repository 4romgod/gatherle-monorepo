import { OrganizationMembershipDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { OrganizationRole } from '@gatherle/commons/types';
import type { Organization } from '@gatherle/commons/types';

export async function ensureOwnerMembershipForOrganization(organization: Organization) {
  try {
    const membershipExists = await OrganizationMembershipDAO.readMembershipByOrgIdAndUser(
      organization.orgId,
      organization.ownerId,
    );
    if (membershipExists) {
      return;
    }
  } catch {
    // fall through and create membership below
  }

  try {
    await OrganizationMembershipDAO.create({
      orgId: organization.orgId,
      userId: organization.ownerId,
      role: OrganizationRole.Owner,
    });
    logger.info(`   Ensured owner membership for organization "${organization.name}" (${organization.orgId})`);
  } catch (error) {
    logger.warn(
      `   Failed to ensure owner membership for organization "${organization.name}" (${organization.orgId})`,
      { error },
    );
  }
}
