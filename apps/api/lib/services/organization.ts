import { FollowTargetType, NotificationTargetType, OrganizationRole, type Organization } from '@gatherle/commons/types';
import {
  ActivityDAO,
  FollowDAO,
  NotificationDAO,
  OrganizationDAO,
  OrganizationMembershipDAO,
  UserDAO,
} from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { CustomError, ErrorTypes } from '@/utils/exceptions';

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

  /**
   * Transfer organization ownership from the current owner to another user.
   *
   * - Verifies the new owner is a real user.
   * - Promotes (or creates) the new owner's membership to Owner.
   * - Demotes the previous owner's membership to Admin (if present).
   * - Updates the organization's `ownerId`.
   *
   * Caller authorization is enforced upstream: only the current owner or a
   * platform admin can invoke the corresponding mutation.
   *
   * @param orgId - Organization to transfer
   * @param newOwnerUserId - User who should become the new owner
   * @param actorUserId - User performing the transfer (for audit logging)
   */
  static async transferOwnership(orgId: string, newOwnerUserId: string, actorUserId?: string): Promise<Organization> {
    logger.debug(
      `[OrganizationService.transferOwnership] Transferring ownership of org ${orgId} to user ${newOwnerUserId} (actor: ${actorUserId ?? 'unknown'})`,
    );

    const organization = await OrganizationDAO.readOrganizationById(orgId);

    if (organization.ownerId === newOwnerUserId) {
      throw CustomError('The specified user is already the owner of this organization.', ErrorTypes.BAD_USER_INPUT);
    }

    // Verify the proposed new owner exists.
    await UserDAO.readUserById(newOwnerUserId);

    const memberships = await OrganizationMembershipDAO.readMembershipsByOrgId(orgId);
    const previousOwnerMembership = memberships.find((m) => m.userId === organization.ownerId);
    const newOwnerMembership = memberships.find((m) => m.userId === newOwnerUserId);

    // Ordering avoids a window with two `Owner` memberships on partial failure:
    // 1. Demote previous owner first. If this fails: nothing changed.
    // 2. Promote/create new owner. If this fails: rollback step 1.
    // 3. Update org.ownerId. If this fails: rollback steps 1 and 2.
    // Compensating writes are best-effort; failures are logged so an operator can reconcile.
    const previousOwnerWasOwner = !!previousOwnerMembership && previousOwnerMembership.role === OrganizationRole.Owner;

    if (previousOwnerWasOwner && previousOwnerMembership) {
      await OrganizationMembershipDAO.update({
        membershipId: previousOwnerMembership.membershipId,
        role: OrganizationRole.Admin,
      });
    }

    let createdNewOwnerMembershipId: string | null = null;
    let promotedExistingNewOwner = false;

    try {
      if (newOwnerMembership) {
        if (newOwnerMembership.role !== OrganizationRole.Owner) {
          await OrganizationMembershipDAO.update({
            membershipId: newOwnerMembership.membershipId,
            role: OrganizationRole.Owner,
          });
          promotedExistingNewOwner = true;
        }
      } else {
        const created = await OrganizationMembershipDAO.create({
          orgId,
          userId: newOwnerUserId,
          role: OrganizationRole.Owner,
        });
        createdNewOwnerMembershipId = created.membershipId;
      }
    } catch (error) {
      if (previousOwnerWasOwner && previousOwnerMembership) {
        try {
          await OrganizationMembershipDAO.update({
            membershipId: previousOwnerMembership.membershipId,
            role: OrganizationRole.Owner,
          });
        } catch (rollbackError) {
          logger.error(
            `[OrganizationService.transferOwnership] Rollback of previous owner demotion failed for org ${orgId}`,
            { error: rollbackError },
          );
        }
      }
      throw error;
    }

    try {
      return await OrganizationDAO.updateOwnerId(orgId, newOwnerUserId);
    } catch (error) {
      try {
        if (createdNewOwnerMembershipId) {
          await OrganizationMembershipDAO.delete(createdNewOwnerMembershipId);
        } else if (promotedExistingNewOwner && newOwnerMembership) {
          await OrganizationMembershipDAO.update({
            membershipId: newOwnerMembership.membershipId,
            role: newOwnerMembership.role,
          });
        }
        if (previousOwnerWasOwner && previousOwnerMembership) {
          await OrganizationMembershipDAO.update({
            membershipId: previousOwnerMembership.membershipId,
            role: OrganizationRole.Owner,
          });
        }
      } catch (rollbackError) {
        logger.error(`[OrganizationService.transferOwnership] Rollback after ownerId write failed for org ${orgId}`, {
          error: rollbackError,
        });
      }
      throw error;
    }
  }
}

export default OrganizationService;
