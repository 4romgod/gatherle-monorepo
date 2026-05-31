import {
  EventLifecycleStatus,
  EventOccurrenceStatus,
  EventStatus,
  OrganizationRole,
  QueryOptionsInput,
  SortOrderInput,
  UserRole,
} from '@data/graphql/types/graphql';

export type AdminEventQueue = 'all' | 'drafts' | 'cancelled' | 'upcoming' | 'ongoing';
export type AdminUserQueue = 'all' | 'admins' | 'hosts' | 'unverified';

export const ADMIN_PAGE_SIZE = 12;
export const ADMIN_USER_PAGE_SIZE = 16;
export const ADMIN_OCCURRENCE_LOOKBACK_DAYS = 30;
export const ADMIN_OCCURRENCE_LOOKAHEAD_DAYS = 180;

export function parseCommaSeparated(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatOrganizationRoleLabel(role: OrganizationRole) {
  return role.replace(/[_-]+/g, ' ');
}

export function buildAdminEventQueryOptions(
  searchQuery: string,
  limit: number,
  skip = 0,
  queue: AdminEventQueue = 'all',
) {
  const trimmedQuery = searchQuery.trim();
  const filters =
    queue === 'drafts'
      ? [{ field: 'lifecycleStatus', value: EventLifecycleStatus.Draft }]
      : queue === 'cancelled'
        ? [{ field: 'status', value: EventStatus.Cancelled }]
        : queue === 'upcoming'
          ? [{ field: 'status', value: EventStatus.Upcoming }]
          : queue === 'ongoing'
            ? [{ field: 'status', value: EventStatus.Ongoing }]
            : undefined;

  return {
    pagination: { limit, skip },
    sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    ...(filters ? { filters } : {}),
    ...(trimmedQuery.length >= 2
      ? {
          search: {
            value: trimmedQuery,
            fields: [
              'title',
              'slug',
              'summary',
              'description',
              'organization.name',
              'location.address.city',
              'location.address.state',
              'location.address.country',
              'eventCategories.name',
            ],
          },
        }
      : {}),
  };
}

export function buildAdminUserQueryOptions(
  searchQuery: string,
  limit: number,
  skip = 0,
  queue: AdminUserQueue = 'all',
) {
  const trimmedQuery = searchQuery.trim();
  const filters =
    queue === 'admins'
      ? [{ field: 'userRole', value: UserRole.Admin }]
      : queue === 'hosts'
        ? [{ field: 'userRole', value: UserRole.Host }]
        : queue === 'unverified'
          ? [{ field: 'emailVerified', value: false }]
          : undefined;

  const options: QueryOptionsInput = {
    pagination: { limit, skip },
    sort: [{ field: 'username', order: SortOrderInput.Asc }],
    ...(filters ? { filters } : {}),
  };

  if (trimmedQuery.length >= 2) {
    options.search = {
      fields: ['username', 'email', 'given_name', 'family_name'],
      value: trimmedQuery,
    };
  }

  return options;
}

export function buildAdminOrganizationQueryOptions(searchQuery: string, limit: number, skip = 0) {
  const trimmedQuery = searchQuery.trim();
  const options: QueryOptionsInput = {
    pagination: { limit, skip },
    sort: [{ field: 'name', order: SortOrderInput.Asc }],
  };

  if (trimmedQuery.length >= 2) {
    options.search = {
      fields: ['name', 'slug', 'description', 'billingEmail', 'tags', 'domainsAllowed'],
      value: trimmedQuery,
    };
  }

  return options;
}

export function buildAdminVenueQueryOptions(searchQuery: string, limit: number, skip = 0) {
  const trimmedQuery = searchQuery.trim();
  const options: QueryOptionsInput = {
    pagination: { limit, skip },
    sort: [{ field: 'name', order: SortOrderInput.Asc }],
  };

  if (trimmedQuery.length >= 2) {
    options.search = {
      fields: ['name', 'slug', 'address.city', 'address.region', 'address.country', 'amenities'],
      value: trimmedQuery,
    };
  }

  return options;
}

export function getAdminOccurrenceWindow() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - ADMIN_OCCURRENCE_LOOKBACK_DAYS);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + ADMIN_OCCURRENCE_LOOKAHEAD_DAYS);
  endDate.setHours(23, 59, 59, 999);

  return { endDate, startDate };
}

export function buildAdminEventOccurrenceQueryOptions(
  eventId: string,
  dateRange: { startDate: Date; endDate: Date },
  limit: number,
  skip = 0,
) {
  return {
    dateRange,
    filters: [{ field: 'eventId', value: eventId }],
    pagination: { limit, skip },
    sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
  };
}

export function getAdminOccurrenceTone(status: EventOccurrenceStatus) {
  switch (status) {
    case EventOccurrenceStatus.Cancelled:
      return 'error';
    case EventOccurrenceStatus.Completed:
      return 'default';
    case EventOccurrenceStatus.Scheduled:
    default:
      return 'primary';
  }
}
