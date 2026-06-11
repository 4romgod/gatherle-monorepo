import { HttpStatusCode } from '@/constants';
import { EventSeriesDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import type { EventSeries, UserRole } from '@gatherle/commons/server/types';
import {
  canRoleManageOrganizationEvents,
  canUserManageEvent,
  getEventOrganizationId,
  type EventManagementEventLike,
} from '@gatherle/commons/server/utils';

const EVENT_MANAGEMENT_UNAUTHORIZED_MESSAGE = 'You do not have permission to manage this event series.';
const ORGANIZATION_EVENT_UNAUTHORIZED_MESSAGE =
  'You do not have permission to create or update events for that organization.';

type EventManagerIdentity = {
  userId: string;
  userRole?: UserRole | string | null;
};

type ManageableEventSeries = Pick<EventSeries, 'orgId' | 'organizers'> | EventManagementEventLike;

const buildEventManagementError = (message: string) =>
  CustomError(message, ErrorTypes.UNAUTHORIZED, {
    http: { status: HttpStatusCode.UNAUTHORIZED },
  });

const readViewerOrganizationMembership = async (orgId: string, userId: string) => {
  const membership = await OrganizationMembershipDAO.readMembershipByOrgIdAndUser(orgId, userId);
  return membership ? [membership] : [];
};

export const assertUserCanUseOrganizationForEvents = async (orgId: string, userId: string): Promise<void> => {
  const memberships = await readViewerOrganizationMembership(orgId, userId);
  if (!memberships.some((membership) => canRoleManageOrganizationEvents(membership.role))) {
    throw buildEventManagementError(ORGANIZATION_EVENT_UNAUTHORIZED_MESSAGE);
  }
};

export const canUserManageEventSeries = async (
  event: ManageableEventSeries,
  user: EventManagerIdentity,
): Promise<boolean> => {
  if (user.userRole === 'Admin') {
    return true;
  }

  const orgId = getEventOrganizationId(event);
  const organizationMemberships = orgId ? await readViewerOrganizationMembership(orgId, user.userId) : undefined;

  return canUserManageEvent({
    event,
    organizationMemberships,
    userId: user.userId,
    userRole: user.userRole,
  });
};

export const assertUserCanManageEventSeries = async (
  event: ManageableEventSeries,
  user: EventManagerIdentity,
): Promise<void> => {
  if (!(await canUserManageEventSeries(event, user))) {
    throw buildEventManagementError(EVENT_MANAGEMENT_UNAUTHORIZED_MESSAGE);
  }
};

export const canUserManageEventSeriesById = async (
  eventId: string | undefined,
  user: EventManagerIdentity,
): Promise<boolean> => {
  if (!eventId) {
    return false;
  }

  const event = await EventSeriesDAO.readEventById(eventId);
  return canUserManageEventSeries(event, user);
};

export const canUserManageEventSeriesBySlug = async (
  slug: string | undefined,
  user: EventManagerIdentity,
): Promise<boolean> => {
  if (!slug) {
    return false;
  }

  const event = await EventSeriesDAO.readEventBySlug(slug);
  return canUserManageEventSeries(event, user);
};
