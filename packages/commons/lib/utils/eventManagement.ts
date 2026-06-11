const EVENT_MANAGEMENT_ADMIN_ROLE = 'Admin';
export const EVENT_MANAGEMENT_ORG_ROLES = ['Owner', 'Admin', 'Host'] as const;

const EVENT_MANAGEMENT_ORG_ROLE_SET = new Set<string>(EVENT_MANAGEMENT_ORG_ROLES);

type EventManagementUserRef =
  | string
  | {
      _id?: { toString(): string } | null;
      userId?: string | null;
    }
  | {
      toString(): string;
    }
  | null
  | undefined;

type EventManagementOrganizerLike =
  | {
      user?: EventManagementUserRef;
    }
  | EventManagementUserRef;

export type EventManagementEventLike = {
  orgId?: string | null;
  organization?: {
    orgId?: string | null;
  } | null;
  organizers?: readonly EventManagementOrganizerLike[] | null;
};

export type EventManagementMembershipLike = {
  orgId?: string | null;
  organization?: {
    orgId?: string | null;
  } | null;
  role?: string | null;
};

type CanUserManageEventArgs = {
  event?: EventManagementEventLike | null;
  organizationMemberships?: readonly EventManagementMembershipLike[] | null;
  userId?: string | null;
  userRole?: string | null;
};

const hasCustomToString = (value: unknown): value is { toString(): string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { toString?: unknown }).toString === 'function' &&
  (value as { toString: () => string }).toString !== Object.prototype.toString;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toUserId = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  if (normalized) {
    return normalized;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const recordUserId = normalizeString(value.userId);
  if (recordUserId) {
    return recordUserId;
  }

  if (value._id && hasCustomToString(value._id)) {
    return value._id.toString();
  }

  if (hasCustomToString(value)) {
    return value.toString();
  }

  return undefined;
};

const getMembershipOrgId = (membership: EventManagementMembershipLike): string | undefined =>
  normalizeString(membership.orgId) ?? normalizeString(membership.organization?.orgId);

export const getEventOrganizationId = (event?: EventManagementEventLike | null): string | undefined =>
  normalizeString(event?.orgId) ?? normalizeString(event?.organization?.orgId);

export const canRoleManageOrganizationEvents = (role?: string | null): boolean =>
  typeof role === 'string' && EVENT_MANAGEMENT_ORG_ROLE_SET.has(role);

export const filterOrganizationMembershipsThatCanManageEvents = <T extends EventManagementMembershipLike>(
  memberships: readonly T[] | null | undefined,
): T[] => (memberships ?? []).filter((membership): membership is T => canRoleManageOrganizationEvents(membership.role));

export const getEventOrganizerUserIds = (event?: EventManagementEventLike | null): string[] =>
  (event?.organizers ?? [])
    .map((organizer) => {
      if (isRecord(organizer) && 'user' in organizer) {
        return toUserId(organizer.user);
      }

      return toUserId(organizer);
    })
    .filter((userId): userId is string => Boolean(userId));

export const isUserEventOrganizer = (event?: EventManagementEventLike | null, userId?: string | null): boolean => {
  const resolvedUserId = normalizeString(userId);
  if (!resolvedUserId) {
    return false;
  }

  return getEventOrganizerUserIds(event).includes(resolvedUserId);
};

export const canUserManageOrganizationEvents = (
  orgId: string | null | undefined,
  memberships: readonly EventManagementMembershipLike[] | null | undefined,
): boolean => {
  const resolvedOrgId = normalizeString(orgId);
  if (!resolvedOrgId) {
    return false;
  }

  return (memberships ?? []).some(
    (membership) =>
      canRoleManageOrganizationEvents(membership.role) && getMembershipOrgId(membership) === resolvedOrgId,
  );
};

export const canUserManageEvent = ({
  event,
  organizationMemberships,
  userId,
  userRole,
}: CanUserManageEventArgs): boolean => {
  if (!event || !userId) {
    return false;
  }

  if (userRole === EVENT_MANAGEMENT_ADMIN_ROLE) {
    return true;
  }

  const orgId = getEventOrganizationId(event);
  if (orgId) {
    return canUserManageOrganizationEvents(orgId, organizationMemberships);
  }

  return isUserEventOrganizer(event, userId);
};
