import type {
  OrganizationMembership,
  CreateOrganizationMembershipInput,
  UpdateOrganizationMembershipInput,
} from '@ntlango/commons/types';
import { NotificationType, NotificationTargetType } from '@ntlango/commons/types';
import { OrganizationMembershipDAO, OrganizationDAO } from '@/mongodb/dao';
import NotificationService from './notification';
import { logger } from '@/utils/logger';

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
  ): Promise<OrganizationMembership> {
    logger.debug(`[OrganizationMembershipService.addMember] Adding user ${input.userId} to org ${input.orgId}`);

    // Create the membership
    const membership = await OrganizationMembershipDAO.create(input);

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
        logger.error(`[OrganizationMembershipService.addMember] Failed to send notification:`, error);
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
  ): Promise<OrganizationMembership> {
    logger.debug(`[OrganizationMembershipService.updateMemberRole] Updating membership ${input.membershipId}`);

    // Get the existing membership to find the userId and orgId
    const existingMembership = await OrganizationMembershipDAO.readMembershipById(input.membershipId);

    // Update the membership
    const updatedMembership = await OrganizationMembershipDAO.update(input);

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
          logger.error(`[OrganizationMembershipService.updateMemberRole] Failed to send notification:`, error);
        }
      };

      sendNotification();
    }

    return updatedMembership;
  }

  /**
   * Remove a member from an organization
   * - Deletes the membership record
   * - Does not send notification (removal is final)
   */
  static async removeMember(membershipId: string): Promise<OrganizationMembership> {
    logger.debug(`[OrganizationMembershipService.removeMember] Removing membership ${membershipId}`);
    return OrganizationMembershipDAO.delete(membershipId);
  }
}

export default OrganizationMembershipService;
