import {
  ADMIN_OCCURRENCE_LOOKAHEAD_DAYS,
  ADMIN_OCCURRENCE_LOOKBACK_DAYS,
  ADMIN_PAGE_SIZE,
  ADMIN_USER_PAGE_SIZE,
  buildAdminEventOccurrenceQueryOptions,
  buildAdminEventQueryOptions,
  buildAdminOrganizationQueryOptions,
  buildAdminUserQueryOptions,
  buildAdminVenueQueryOptions,
  formatOrganizationRoleLabel,
  getAdminOccurrenceTone,
  getAdminOccurrenceWindow,
  parseCommaSeparated,
} from '@/lib/admin/queryOptions';
import {
  EventLifecycleStatus,
  EventOccurrenceStatus,
  EventStatus,
  OrganizationRole,
  SortOrderInput,
  UserRole,
} from '@data/graphql/types/graphql';

describe('mobile admin query options', () => {
  it('parses comma-separated values without empty entries', () => {
    expect(parseCommaSeparated(' music,  tech ,, nightlife  ')).toEqual(['music', 'tech', 'nightlife']);
  });

  it('formats organization role labels by replacing separators', () => {
    expect(formatOrganizationRoleLabel(OrganizationRole.Owner)).toBe('Owner');
    expect(formatOrganizationRoleLabel('Admin' as OrganizationRole)).toBe('Admin');
  });

  it('builds event query options with queue filters and expanded search fields', () => {
    expect(buildAdminEventQueryOptions('  ', ADMIN_PAGE_SIZE, 2, 'all')).toEqual({
      pagination: { limit: ADMIN_PAGE_SIZE, skip: 2 },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    });

    expect(buildAdminEventQueryOptions('c', ADMIN_PAGE_SIZE, 0, 'drafts')).toEqual({
      filters: [{ field: 'lifecycleStatus', value: EventLifecycleStatus.Draft }],
      pagination: { limit: ADMIN_PAGE_SIZE, skip: 0 },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    });

    expect(buildAdminEventQueryOptions('Cape', 20, 12, 'upcoming')).toEqual({
      filters: [{ field: 'status', value: EventStatus.Upcoming }],
      pagination: { limit: 20, skip: 12 },
      search: {
        value: 'Cape',
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
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    });

    expect(buildAdminEventQueryOptions('live', 10, 4, 'ongoing').filters).toEqual([
      { field: 'status', value: EventStatus.Ongoing },
    ]);
    expect(buildAdminEventQueryOptions('bye', 10, 4, 'cancelled').filters).toEqual([
      { field: 'status', value: EventStatus.Cancelled },
    ]);
  });

  it('builds user query options with queue filters and search fields', () => {
    expect(buildAdminUserQueryOptions('  ', ADMIN_USER_PAGE_SIZE, 4, 'all')).toEqual({
      pagination: { limit: ADMIN_USER_PAGE_SIZE, skip: 4 },
      sort: [{ field: 'username', order: SortOrderInput.Asc }],
    });

    expect(buildAdminUserQueryOptions('a', ADMIN_USER_PAGE_SIZE, 0, 'admins')).toEqual({
      filters: [{ field: 'userRole', value: UserRole.Admin }],
      pagination: { limit: ADMIN_USER_PAGE_SIZE, skip: 0 },
      sort: [{ field: 'username', order: SortOrderInput.Asc }],
    });

    expect(buildAdminUserQueryOptions('alice', 8, 16, 'unverified')).toEqual({
      filters: [{ field: 'emailVerified', value: false }],
      pagination: { limit: 8, skip: 16 },
      search: {
        fields: ['username', 'email', 'given_name', 'family_name'],
        value: 'alice',
      },
      sort: [{ field: 'username', order: SortOrderInput.Asc }],
    });

    expect(buildAdminUserQueryOptions('host', 8, 0, 'hosts').filters).toEqual([
      { field: 'userRole', value: UserRole.Host },
    ]);
  });

  it('builds organization and venue query options only when the search is meaningful', () => {
    expect(buildAdminOrganizationQueryOptions('o', 12, 0)).toEqual({
      pagination: { limit: 12, skip: 0 },
      sort: [{ field: 'name', order: SortOrderInput.Asc }],
    });

    expect(buildAdminOrganizationQueryOptions('market', 12, 12)).toEqual({
      pagination: { limit: 12, skip: 12 },
      search: {
        fields: ['name', 'slug', 'description', 'billingEmail', 'tags', 'domainsAllowed'],
        value: 'market',
      },
      sort: [{ field: 'name', order: SortOrderInput.Asc }],
    });

    expect(buildAdminVenueQueryOptions('cape', 10, 6)).toEqual({
      pagination: { limit: 10, skip: 6 },
      search: {
        fields: ['name', 'slug', 'address.city', 'address.region', 'address.country', 'amenities'],
        value: 'cape',
      },
      sort: [{ field: 'name', order: SortOrderInput.Asc }],
    });

    expect(buildAdminVenueQueryOptions('x', 10, 0)).toEqual({
      pagination: { limit: 10, skip: 0 },
      sort: [{ field: 'name', order: SortOrderInput.Asc }],
    });
  });

  it('builds an occurrence window centered around the configured lookback and lookahead', () => {
    const before = new Date();
    const { startDate, endDate } = getAdminOccurrenceWindow();
    const after = new Date();

    const minExpectedStart = new Date(before);
    minExpectedStart.setDate(minExpectedStart.getDate() - ADMIN_OCCURRENCE_LOOKBACK_DAYS);
    minExpectedStart.setHours(0, 0, 0, 0);

    const maxExpectedStart = new Date(after);
    maxExpectedStart.setDate(maxExpectedStart.getDate() - ADMIN_OCCURRENCE_LOOKBACK_DAYS);
    maxExpectedStart.setHours(0, 0, 0, 0);

    const minExpectedEnd = new Date(before);
    minExpectedEnd.setDate(minExpectedEnd.getDate() + ADMIN_OCCURRENCE_LOOKAHEAD_DAYS);
    minExpectedEnd.setHours(23, 59, 59, 999);

    const maxExpectedEnd = new Date(after);
    maxExpectedEnd.setDate(maxExpectedEnd.getDate() + ADMIN_OCCURRENCE_LOOKAHEAD_DAYS);
    maxExpectedEnd.setHours(23, 59, 59, 999);

    expect(startDate.getTime()).toBeGreaterThanOrEqual(minExpectedStart.getTime());
    expect(startDate.getTime()).toBeLessThanOrEqual(maxExpectedStart.getTime());
    expect(endDate.getTime()).toBeGreaterThanOrEqual(minExpectedEnd.getTime());
    expect(endDate.getTime()).toBeLessThanOrEqual(maxExpectedEnd.getTime());
  });

  it('builds occurrence query options and status tones for admin sessions', () => {
    const dateRange = {
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-11-01T23:59:59.999Z'),
    };

    expect(buildAdminEventOccurrenceQueryOptions('event-1', dateRange, 30, 12)).toEqual({
      dateRange,
      filters: [{ field: 'eventId', value: 'event-1' }],
      pagination: { limit: 30, skip: 12 },
      sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
    });

    expect(getAdminOccurrenceTone(EventOccurrenceStatus.Scheduled)).toBe('primary');
    expect(getAdminOccurrenceTone(EventOccurrenceStatus.Completed)).toBe('default');
    expect(getAdminOccurrenceTone(EventOccurrenceStatus.Cancelled)).toBe('error');
  });
});
