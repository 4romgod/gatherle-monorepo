import {
  buildCollectionPagination,
  buildHostedEventsQueryOptions,
  isUpcomingEventTime,
  sortItemsByEventTime,
  splitItemsByEventTime,
} from '@/lib/utils/eventCollections';

describe('eventCollections utils', () => {
  describe('buildCollectionPagination', () => {
    it('returns undefined when limit is missing', () => {
      expect(buildCollectionPagination()).toBeUndefined();
    });

    it('builds pagination with default skip of 0', () => {
      expect(buildCollectionPagination(10)).toEqual({
        pagination: {
          limit: 10,
          skip: 0,
        },
      });
    });

    it('builds pagination with an explicit skip', () => {
      expect(buildCollectionPagination(5, 15)).toEqual({
        pagination: {
          limit: 5,
          skip: 15,
        },
      });
    });
  });

  describe('buildHostedEventsQueryOptions', () => {
    it('builds the expected hosted events query structure', () => {
      expect(buildHostedEventsQueryOptions('user-1', 'desc', 18, 36)).toEqual({
        filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
        pagination: { limit: 18, skip: 36 },
        sort: [{ field: 'createdAt', order: 'desc' }],
      });
    });
  });

  describe('isUpcomingEventTime', () => {
    const fromDate = new Date('2026-05-25T10:00:00.000Z');

    it('treats future start times as upcoming', () => {
      expect(isUpcomingEventTime('2026-05-26T10:00:00.000Z', undefined, fromDate)).toBe(true);
    });

    it('prefers endAt when determining whether an event is still upcoming', () => {
      expect(isUpcomingEventTime('2026-05-25T08:00:00.000Z', '2026-05-25T12:00:00.000Z', fromDate)).toBe(true);
    });

    it('treats past end times as not upcoming', () => {
      expect(isUpcomingEventTime('2026-05-25T08:00:00.000Z', '2026-05-25T09:00:00.000Z', fromDate)).toBe(false);
    });

    it('treats invalid timestamps as not upcoming', () => {
      expect(isUpcomingEventTime('not-a-date', undefined, fromDate)).toBe(false);
    });
  });

  describe('sortItemsByEventTime', () => {
    const items = [
      { id: 'missing', startAt: null },
      { id: 'later', startAt: '2026-05-27T10:00:00.000Z' },
      { id: 'earlier', startAt: '2026-05-26T10:00:00.000Z' },
      { id: 'same-a', startAt: '2026-05-28T10:00:00.000Z' },
      { id: 'same-b', startAt: '2026-05-28T10:00:00.000Z' },
      { id: 'invalid', startAt: 'invalid' },
    ];

    it('sorts ascending and sends missing/invalid timestamps to the end', () => {
      expect(sortItemsByEventTime(items, (item) => item.startAt, 'asc').map((item) => item.id)).toEqual([
        'earlier',
        'later',
        'same-a',
        'same-b',
        'missing',
        'invalid',
      ]);
    });

    it('sorts descending and sends missing/invalid timestamps to the end', () => {
      expect(sortItemsByEventTime(items, (item) => item.startAt, 'desc').map((item) => item.id)).toEqual([
        'same-a',
        'same-b',
        'later',
        'earlier',
        'missing',
        'invalid',
      ]);
    });
  });

  describe('splitItemsByEventTime', () => {
    const fromDate = new Date('2026-05-25T10:00:00.000Z');
    const items = [
      {
        id: 'upcoming-later',
        startAt: '2026-05-28T10:00:00.000Z',
        endAt: '2026-05-28T12:00:00.000Z',
      },
      {
        id: 'past-latest',
        startAt: '2026-05-23T10:00:00.000Z',
        endAt: '2026-05-23T12:00:00.000Z',
      },
      {
        id: 'in-progress',
        startAt: '2026-05-25T08:00:00.000Z',
        endAt: '2026-05-25T12:00:00.000Z',
      },
      {
        id: 'upcoming-earlier',
        startAt: '2026-05-26T10:00:00.000Z',
        endAt: '2026-05-26T12:00:00.000Z',
      },
      {
        id: 'past-earlier',
        startAt: '2026-05-22T10:00:00.000Z',
        endAt: '2026-05-22T12:00:00.000Z',
      },
    ];

    it('splits items into upcoming and past buckets and sorts each bucket correctly', () => {
      const { upcoming, past } = splitItemsByEventTime(
        items,
        (item) => item.startAt,
        (item) => item.endAt,
        fromDate,
      );

      expect(upcoming.map((item) => item.id)).toEqual(['in-progress', 'upcoming-earlier', 'upcoming-later']);
      expect(past.map((item) => item.id)).toEqual(['past-latest', 'past-earlier']);
    });

    it('works when no endAt selector is provided', () => {
      const { upcoming, past } = splitItemsByEventTime(items, (item) => item.startAt, undefined, fromDate);

      expect(upcoming.map((item) => item.id)).toEqual(['upcoming-earlier', 'upcoming-later']);
      expect(past.map((item) => item.id)).toEqual(['in-progress', 'past-latest', 'past-earlier']);
    });
  });
});
