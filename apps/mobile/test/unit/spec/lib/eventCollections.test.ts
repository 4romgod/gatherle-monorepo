import {
  buildHostedEventsCountQueryOptions,
  buildHostedEventsQueryOptions,
  isUpcomingEventTime,
} from '@/lib/events/eventCollections';
import { SortOrderInput } from '@data/graphql/types/graphql';

describe('mobile hosted event collection query helpers', () => {
  it('builds hosted event organizer filters with pagination by default', () => {
    expect(buildHostedEventsQueryOptions('user-1', SortOrderInput.Desc, 18, 36)).toEqual({
      filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
      pagination: { limit: 18, skip: 36 },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    });
  });

  it('adds hosted event search fields when the query is meaningful', () => {
    expect(buildHostedEventsQueryOptions('user-1', SortOrderInput.Desc, 18, 0, 'Cape')).toEqual({
      filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
      pagination: { limit: 18, skip: 0 },
      search: {
        fields: [
          'title',
          'slug',
          'summary',
          'description',
          'organization.name',
          'eventCategories.name',
          'location.address.city',
          'location.address.state',
          'location.address.country',
        ],
        value: 'Cape',
      },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    });

    expect(buildHostedEventsCountQueryOptions('user-1', 'market')).toEqual({
      filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
      search: {
        fields: [
          'title',
          'slug',
          'summary',
          'description',
          'organization.name',
          'eventCategories.name',
          'location.address.city',
          'location.address.state',
          'location.address.country',
        ],
        value: 'market',
      },
    });
  });

  it('ignores too-short hosted event searches', () => {
    expect(buildHostedEventsQueryOptions('user-1', SortOrderInput.Desc, 18, 0, 'c')).toEqual({
      filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
      pagination: { limit: 18, skip: 0 },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    });

    expect(buildHostedEventsCountQueryOptions('user-1', 'x')).toEqual({
      filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
    });
  });

  it('treats ongoing and future occurrence windows as RSVP-open, but closes past ones', () => {
    const pivot = new Date('2026-06-04T12:00:00.000Z');

    expect(isUpcomingEventTime('2026-06-04T18:00:00.000Z', '2026-06-04T20:00:00.000Z', pivot)).toBe(true);
    expect(isUpcomingEventTime('2026-06-04T10:00:00.000Z', '2026-06-04T13:00:00.000Z', pivot)).toBe(true);
    expect(isUpcomingEventTime('2026-06-04T08:00:00.000Z', '2026-06-04T09:00:00.000Z', pivot)).toBe(false);
  });
});
