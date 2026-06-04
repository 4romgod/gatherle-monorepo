import AuditLogDAO from '@/mongodb/dao/auditLog';
import type {
  AuditAction,
  AuditLogPage,
  AuditTargetType,
  Organization,
  OrganizationMembership,
  ReadAuditLogsInput,
  User,
  WriteAuditLogInput,
} from '@gatherle/commons/server/types';
import type { UserRole } from '@gatherle/commons/server/types';
import { logger } from '@/utils/logger';

class AuditLogService {
  static readPage(filters: ReadAuditLogsInput): Promise<AuditLogPage> {
    return AuditLogDAO.readPage(filters);
  }

  private static log(input: WriteAuditLogInput): void {
    AuditLogDAO.write(input).catch((err) =>
      logger.error('[AuditLogService] Failed to write audit log entry', { error: err, action: input.action }),
    );
  }

  static logUserDeleted(params: {
    actorId: string;
    actorRole: UserRole;
    targetUserId: string;
    userSnapshot: Partial<User>;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'USER_DELETED' as AuditAction,
      targetType: 'User' as AuditTargetType,
      targetId: params.targetUserId,
      before: params.userSnapshot as Record<string, unknown>,
      ipAddress: params.ipAddress,
    });
  }

  static logUserRoleChanged(params: {
    actorId: string;
    actorRole: UserRole;
    targetUserId: string;
    previousRole: UserRole;
    newRole: UserRole;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'USER_ROLE_CHANGED' as AuditAction,
      targetType: 'User' as AuditTargetType,
      targetId: params.targetUserId,
      before: { userRole: params.previousRole },
      after: { userRole: params.newRole },
      ipAddress: params.ipAddress,
    });
  }

  static logOrgDeleted(params: {
    actorId: string;
    actorRole: UserRole;
    orgId: string;
    orgSnapshot: Partial<Organization>;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'ORG_DELETED' as AuditAction,
      targetType: 'Organization' as AuditTargetType,
      targetId: params.orgId,
      before: params.orgSnapshot as Record<string, unknown>,
      ipAddress: params.ipAddress,
    });
  }

  static logOrgOwnershipTransferred(params: {
    actorId: string;
    actorRole: UserRole;
    orgId: string;
    orgName: string;
    previousOwnerId: string;
    newOwnerId: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'ORG_OWNERSHIP_TRANSFERRED' as AuditAction,
      targetType: 'Organization' as AuditTargetType,
      targetId: params.orgId,
      before: { ownerId: params.previousOwnerId },
      after: { ownerId: params.newOwnerId },
      metadata: { orgName: params.orgName },
      ipAddress: params.ipAddress,
    });
  }

  static logOrgMembershipCreated(params: {
    actorId: string;
    actorRole: UserRole;
    membershipSnapshot: Partial<OrganizationMembership>;
    ipAddress?: string;
  }): void {
    const membershipId = params.membershipSnapshot.membershipId ?? params.membershipSnapshot.orgId ?? '';
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'ORG_MEMBERSHIP_CREATED' as AuditAction,
      targetType: 'OrganizationMembership' as AuditTargetType,
      targetId: membershipId,
      after: params.membershipSnapshot as Record<string, unknown>,
      ipAddress: params.ipAddress,
    });
  }

  static logOrgMembershipRoleChanged(params: {
    actorId: string;
    actorRole: UserRole;
    membershipId: string;
    orgId: string;
    targetUserId: string;
    previousRole: string;
    newRole: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'ORG_MEMBERSHIP_ROLE_CHANGED' as AuditAction,
      targetType: 'OrganizationMembership' as AuditTargetType,
      targetId: params.membershipId,
      before: { role: params.previousRole },
      after: { role: params.newRole },
      metadata: { orgId: params.orgId, userId: params.targetUserId },
      ipAddress: params.ipAddress,
    });
  }

  static logOrgMembershipDeleted(params: {
    actorId: string;
    actorRole: UserRole;
    membershipSnapshot: Partial<OrganizationMembership>;
    ipAddress?: string;
  }): void {
    const membershipId = params.membershipSnapshot.membershipId ?? '';
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'ORG_MEMBERSHIP_DELETED' as AuditAction,
      targetType: 'OrganizationMembership' as AuditTargetType,
      targetId: membershipId,
      before: params.membershipSnapshot as Record<string, unknown>,
      ipAddress: params.ipAddress,
    });
  }

  static logEventDeleted(params: {
    actorId: string;
    actorRole: UserRole;
    eventId: string;
    eventTitle: string;
    orgId?: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'EVENT_DELETED' as AuditAction,
      targetType: 'Event' as AuditTargetType,
      targetId: params.eventId,
      metadata: { title: params.eventTitle, orgId: params.orgId },
      ipAddress: params.ipAddress,
    });
  }

  static logVenueDeleted(params: {
    actorId: string;
    actorRole: UserRole;
    venueId: string;
    venueName: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'VENUE_DELETED' as AuditAction,
      targetType: 'Venue' as AuditTargetType,
      targetId: params.venueId,
      metadata: { name: params.venueName },
      ipAddress: params.ipAddress,
    });
  }

  static logCategoryCreated(params: {
    actorId: string;
    actorRole: UserRole;
    categoryId: string;
    categoryName: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CATEGORY_CREATED' as AuditAction,
      targetType: 'EventCategory' as AuditTargetType,
      targetId: params.categoryId,
      after: { name: params.categoryName },
      ipAddress: params.ipAddress,
    });
  }

  static logCategoryDeleted(params: {
    actorId: string;
    actorRole: UserRole;
    categoryId: string;
    categoryName: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CATEGORY_DELETED' as AuditAction,
      targetType: 'EventCategory' as AuditTargetType,
      targetId: params.categoryId,
      metadata: { name: params.categoryName },
      ipAddress: params.ipAddress,
    });
  }

  static logCategoryGroupCreated(params: {
    actorId: string;
    actorRole: UserRole;
    categoryGroupId: string;
    categoryGroupName: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CATEGORY_GROUP_CREATED' as AuditAction,
      targetType: 'EventCategoryGroup' as AuditTargetType,
      targetId: params.categoryGroupId,
      after: { name: params.categoryGroupName },
      ipAddress: params.ipAddress,
    });
  }

  static logCategoryGroupDeleted(params: {
    actorId: string;
    actorRole: UserRole;
    categoryGroupId: string;
    categoryGroupName: string;
    ipAddress?: string;
  }): void {
    AuditLogService.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CATEGORY_GROUP_DELETED' as AuditAction,
      targetType: 'EventCategoryGroup' as AuditTargetType,
      targetId: params.categoryGroupId,
      metadata: { name: params.categoryGroupName },
      ipAddress: params.ipAddress,
    });
  }
}

export default AuditLogService;
