import type {
  OrganizationMembership,
  CreateOrganizationMembershipInput,
  UpdateOrganizationMembershipInput,
} from '@gatherle/commons/server/types';
import { NotificationType, NotificationTargetType, OrganizationRole, UserRole } from '@gatherle/commons/server/types';
import { OrganizationMembershipDAO, OrganizationDAO, UserDAO } from '@/mongodb/dao';
import AuditLogService from './auditLog';
import NotificationService from './notification';
import { logger } from '@/utils/logger';
import { CustomError, ErrorTypes } from '@/utils/exceptions';

/**
 * Organization membership service for operations with side effects
 *
 * Use this service when:
 * - Adding members (sends ORG_INVITE notification)
 * - Updating roles (sends ORG_ROLE_CHANGED notification)
 * - Removing members (potential notification)
 *
 * Use OrganizationMembershipDAO directly for:
 * - Read operations (readMembershipById, readMembershipsByOrgId)
 */
class OrganizationMembershipService {
  /**
   * Add a member to an organization
   * - Creates the membership record
   * - Sends ORG_INVITE notification to the new member
   *
   * @param input - CreateOrganizationMembershipInput (orgId, userId, role)
   * @param addedByUserId - Optional user ID of who added this member (for notification actor)
   */
  static async addMember(
    input: CreateOrganizationMembershipInput,
    addedByUserId?: string,
    options?: { allowOwnerAssignment?: boolean; actorRole?: UserRole; ipAddress?: string },
  ): Promise<OrganizationMembership> {
    logger.debug(`[OrganizationMembershipService.addMember] Adding user ${input.userId} to org ${input.orgId}`);

    if (input.role === OrganizationRole.Owner && !options?.allowOwnerAssignment) {
      throw CustomError(
        'Owner membership cannot be assigned from member management. Use the organization ownership flow instead.',
        ErrorTypes.UNAUTHORIZED,
      );
    }

    // Create the membership
    const membership = await OrganizationMembershipDAO.create(input);

    if (addedByUserId && options?.actorRole) {
      AuditLogService.logOrgMembershipCreated({
        actorId: addedByUserId,
        actorRole: options.actorRole,
        membershipSnapshot: {
          membershipId: membership.membershipId,
          orgId: membership.orgId,
          userId: membership.userId,
          role: membership.role,
        },
        ipAddress: options.ipAddress,
      });
    }

    // Send notification to the new member (async, don't block)
    const sendNotification = async () => {
      try {
        // Fetch org to get slug for notification URL
        const org = await OrganizationDAO.readOrganizationById(input.orgId);
        await NotificationService.notify({
          type: NotificationType.ORG_INVITE,
          recipientUserId: input.userId,
          actorUserId: addedByUserId,
          targetType: NotificationTargetType.Organization,
          targetSlug: org.slug, // Use org slug for URL generation
        });
        logger.debug(`[OrganizationMembershipService.addMember] Sent ORG_INVITE notification to ${input.userId}`);
      } catch (error) {
        logger.error(`[OrganizationMembershipService.addMember] Failed to send notification:`, { error });
      }
    };

    sendNotification();

    return membership;
  }

  /**
   * Update a member's role in an organization
   * - Updates the membership record
   * - Sends ORG_ROLE_CHANGED notification to the member
   *
   * @param input - UpdateOrganizationMembershipInput (membershipId, role)
   * @param updatedByUserId - Optional user ID of who updated the role
   */
  static async updateMemberRole(
    input: UpdateOrganizationMembershipInput,
    updatedByUserId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<OrganizationMembership> {
    logger.debug(`[OrganizationMembershipService.updateMemberRole] Updating membership ${input.membershipId}`);

    // Get the existing membership to find the userId and orgId
    const existingMembership = await OrganizationMembershipDAO.readMembershipById(input.membershipId);

    // Security: Prevent users from modifying their own role
    if (existingMembership.userId === updatedByUserId) {
      throw CustomError(
        'Users cannot modify their own role. Another organization admin must change your role.',
        ErrorTypes.UNAUTHORIZED,
      );
    }

    if (existingMembership.role === OrganizationRole.Owner) {
      throw CustomError(
        'Owner membership cannot be modified from member management. Use the organization ownership flow instead.',
        ErrorTypes.UNAUTHORIZED,
      );
    }

    if (input.role === OrganizationRole.Owner) {
      throw CustomError(
        'Owner membership cannot be assigned from member management. Use the organization ownership flow instead.',
        ErrorTypes.UNAUTHORIZED,
      );
    }

    // Security: Re-verify authorization to prevent race conditions (TOCTOU)
    // Between authChecker and this point, the user's role could have changed
    if (updatedByUserId) {
      const isStillAuthorized = await this.verifyOrganizationAdminAccess(existingMembership.orgId, updatedByUserId);
      if (!isStillAuthorized) {
        throw CustomError(
          'You no longer have permission to manage this organization. Your role may have changed.',
          ErrorTypes.UNAUTHORIZED,
        );
      }
    }

    // Update the membership
    const updatedMembership = await OrganizationMembershipDAO.update(input);

    // Audit log (fire-and-forget, uses already-fetched existingMembership to avoid a second DB lookup)
    if (updatedByUserId && actorRole) {
      AuditLogService.logOrgMembershipRoleChanged({
        actorId: updatedByUserId,
        actorRole,
        membershipId: updatedMembership.membershipId,
        orgId: updatedMembership.orgId,
        targetUserId: updatedMembership.userId,
        previousRole: existingMembership.role,
        newRole: updatedMembership.role,
        ipAddress,
      });
    }

    // Send notification to the member (async, don't block)
    // Don't notify if the member is updating their own role
    if (existingMembership.userId !== updatedByUserId) {
      const sendNotification = async () => {
        try {
          // Fetch org to get slug for notification URL
          const org = await OrganizationDAO.readOrganizationById(existingMembership.orgId);
          await NotificationService.notify({
            type: NotificationType.ORG_ROLE_CHANGED,
            recipientUserId: existingMembership.userId,
            actorUserId: updatedByUserId,
            targetType: NotificationTargetType.Organization,
            targetSlug: org.slug, // Use org slug for URL generation
          });
          logger.debug(
            `[OrganizationMembershipService.updateMemberRole] Sent ORG_ROLE_CHANGED notification to ${existingMembership.userId}`,
          );
        } catch (error) {
          logger.error(`[OrganizationMembershipService.updateMemberRole] Failed to send notification:`, { error });
        }
      };

      sendNotification();
    }

    return updatedMembership;
  }

  /**
   * Remove a member from an organization, or allow a member to leave it.
   * - Deletes the membership record
   * - Does not send notification (removal is final)
   *
   * @param membershipId - ID of the membership to remove
   * @param removedByUserId - Optional user ID of who is removing the member
   */
  static async removeMember(
    membershipId: string,
    removedByUserId?: string,
    actorRole?: UserRole,
    ipAddress?: string,
  ): Promise<OrganizationMembership> {
    logger.debug(`[OrganizationMembershipService.removeMember] Removing membership ${membershipId}`);

    // Get the existing membership to find the userId
    const existingMembership = await OrganizationMembershipDAO.readMembershipById(membershipId);
    const isSelfRemoval = existingMembership.userId === removedByUserId;

    if (existingMembership.role === OrganizationRole.Owner) {
      throw CustomError(
        'Owner membership cannot be removed from member management. Use the organization ownership flow instead.',
        ErrorTypes.UNAUTHORIZED,
      );
    }

    // Security: Re-verify authorization to prevent race conditions (TOCTOU)
    // Between authChecker and this point, the user's role could have changed
    if (removedByUserId && !isSelfRemoval) {
      const isStillAuthorized = await this.verifyOrganizationAdminAccess(existingMembership.orgId, removedByUserId);
      if (!isStillAuthorized) {
        throw CustomError(
          'You no longer have permission to manage this organization. Your role may have changed.',
          ErrorTypes.UNAUTHORIZED,
        );
      }
    }

    const deleted = await OrganizationMembershipDAO.delete(membershipId);
    if (removedByUserId && actorRole) {
      AuditLogService.logOrgMembershipDeleted({
        actorId: removedByUserId,
        actorRole,
        membershipSnapshot: {
          membershipId: deleted.membershipId,
          orgId: deleted.orgId,
          userId: deleted.userId,
          role: deleted.role,
        },
        ipAddress,
      });
    }
    return deleted;
  }

  /**
   * Verify that a user still has admin access to an organization.
   * This is used to prevent TOCTOU race conditions where authorization is checked
   * in authChecker but the user's role changes before the service method executes.
   *
   * @param orgId - Organization ID to check
   * @param userId - User ID to verify
   * @returns true if user is a platform admin, organization owner, or has Owner/Admin membership, false otherwise
   */
  private static async verifyOrganizationAdminAccess(orgId: string, userId: string): Promise<boolean> {
    try {
      // Platform admins can always manage org memberships
      const actor = await UserDAO.readUserById(userId).catch(() => null);
      if (actor?.userRole === UserRole.Admin) {
        return true;
      }

      // Check if user is the organization owner
      const organization = await OrganizationDAO.readOrganizationById(orgId);
      if (organization.ownerId === userId) {
        return true;
      }

      // Check if user has Owner or Admin role in the organization
      const memberships = await OrganizationMembershipDAO.readMembershipsByOrgId(orgId);
      const userMembership = memberships.find((m) => m.userId === userId);

      return userMembership?.role === OrganizationRole.Owner || userMembership?.role === OrganizationRole.Admin;
    } catch (error) {
      // Fail closed: If we can't verify authorization, deny access
      logger.error(
        `[OrganizationMembershipService.verifyOrganizationAdminAccess] Error verifying admin access for user ${userId} on org ${orgId}`,
        { error },
      );
      return false;
    }
  }
}

export default OrganizationMembershipService;
