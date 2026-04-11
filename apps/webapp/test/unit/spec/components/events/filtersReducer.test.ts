import dayjs from 'dayjs';
import { EventStatus } from '@/data/graphql/types/graphql';
import { filtersReducer } from '@/components/events/filters/filtersReducer';
import type { FilterAction } from '@/components/events/filters/filtersReducer';
import { initialFilters } from '@/components/events/filters/EventFilterContext';
import type { EventFilters } from '@/components/events/filters/EventFilterContext';

// Aliases for readability — the GraphQL schema uses Upcoming/Completed
const Published = EventStatus.Upcoming;
const Cancelled = EventStatus.Cancelled;

describe('filtersReducer', () => {
  const state: EventFilters = { ...initialFilters };

  describe('SET_CATEGORIES', () => {
    it('replaces all categories', () => {
      const result = filtersReducer(state, { type: 'SET_CATEGORIES', payload: ['Music', 'Sports'] });
      expect(result.categories).toEqual(['Music', 'Sports']);
    });

    it('clears categories when given an empty array', () => {
      const withCategories: EventFilters = { ...state, categories: ['Music'] };
      const result = filtersReducer(withCategories, { type: 'SET_CATEGORIES', payload: [] });
      expect(result.categories).toEqual([]);
    });

    it('does not mutate other fields', () => {
      const withSearch: EventFilters = { ...state, searchQuery: 'jazz' };
      const result = filtersReducer(withSearch, { type: 'SET_CATEGORIES', payload: ['Music'] });
      expect(result.searchQuery).toBe('jazz');
    });
  });

  describe('REMOVE_CATEGORY', () => {
    it('removes the specified category', () => {
      const withCategories: EventFilters = { ...state, categories: ['Music', 'Sports', 'Tech'] };
      const result = filtersReducer(withCategories, { type: 'REMOVE_CATEGORY', payload: 'Sports' });
      expect(result.categories).toEqual(['Music', 'Tech']);
    });

    it('is a no-op when the category is not present', () => {
      const withCategories: EventFilters = { ...state, categories: ['Music'] };
      const result = filtersReducer(withCategories, { type: 'REMOVE_CATEGORY', payload: 'Tech' });
      expect(result.categories).toEqual(['Music']);
    });

    it('handles removing from an empty list', () => {
      const result = filtersReducer(state, { type: 'REMOVE_CATEGORY', payload: 'Music' });
      expect(result.categories).toEqual([]);
    });
  });

  describe('SET_DATE_RANGE', () => {
    it('sets start and end dates', () => {
      const start = dayjs('2026-03-01');
      const end = dayjs('2026-03-31');
      const result = filtersReducer(state, { type: 'SET_DATE_RANGE', payload: { start, end } });
      expect(result.dateRange.start).toBe(start);
      expect(result.dateRange.end).toBe(end);
      expect(result.dateRange.filterOption).toBeUndefined();
    });

    it('sets a filterOption when provided', () => {
      const result = filtersReducer(state, {
        type: 'SET_DATE_RANGE',
        payload: { start: null, end: null, filterOption: 'THIS_WEEK' },
      });
      expect(result.dateRange.filterOption).toBe('THIS_WEEK');
    });

    it('allows clearing dates with nulls', () => {
      const withDates: EventFilters = {
        ...state,
        dateRange: { start: dayjs(), end: dayjs(), filterOption: 'TODAY' },
      };
      const result = filtersReducer(withDates, {
        type: 'SET_DATE_RANGE',
        payload: { start: null, end: null },
      });
      expect(result.dateRange.start).toBeNull();
      expect(result.dateRange.end).toBeNull();
    });
  });

  describe('SET_STATUSES', () => {
    it('replaces all statuses', () => {
      const result = filtersReducer(state, {
        type: 'SET_STATUSES',
        payload: [Published, Cancelled],
      });
      expect(result.statuses).toEqual([Published, Cancelled]);
    });

    it('clears statuses when given an empty array', () => {
      const withStatuses: EventFilters = { ...state, statuses: [Published] };
      const result = filtersReducer(withStatuses, { type: 'SET_STATUSES', payload: [] });
      expect(result.statuses).toEqual([]);
    });
  });

  describe('REMOVE_STATUS', () => {
    it('removes the specified status', () => {
      const withStatuses: EventFilters = {
        ...state,
        statuses: [Published, Cancelled],
      };
      const result = filtersReducer(withStatuses, {
        type: 'REMOVE_STATUS',
        payload: Cancelled,
      });
      expect(result.statuses).toEqual([Published]);
    });

    it('is a no-op when the status is not present', () => {
      const withStatuses: EventFilters = { ...state, statuses: [Published] };
      const result = filtersReducer(withStatuses, {
        type: 'REMOVE_STATUS',
        payload: Cancelled,
      });
      expect(result.statuses).toEqual([Published]);
    });
  });

  describe('SET_SEARCH_QUERY', () => {
    it('sets the search query', () => {
      const result = filtersReducer(state, { type: 'SET_SEARCH_QUERY', payload: 'festival' });
      expect(result.searchQuery).toBe('festival');
    });

    it('clears the search query when given empty string', () => {
      const withQuery: EventFilters = { ...state, searchQuery: 'festival' };
      const result = filtersReducer(withQuery, { type: 'SET_SEARCH_QUERY', payload: '' });
      expect(result.searchQuery).toBe('');
    });
  });

  describe('SET_LOCATION', () => {
    it('sets the full location object', () => {
      const location = { city: 'London', country: 'UK', latitude: 51.5, longitude: -0.12, radiusKm: 10 };
      const result = filtersReducer(state, { type: 'SET_LOCATION', payload: location });
      expect(result.location).toEqual(location);
    });

    it('replaces a previous location entirely', () => {
      const withLocation: EventFilters = {
        ...state,
        location: { city: 'Paris', country: 'FR' },
      };
      const newLocation = { city: 'Berlin', country: 'DE' };
      const result = filtersReducer(withLocation, { type: 'SET_LOCATION', payload: newLocation });
      expect(result.location).toEqual(newLocation);
    });
  });

  describe('CLEAR_LOCATION', () => {
    it('resets location to an empty object', () => {
      const withLocation: EventFilters = {
        ...state,
        location: { city: 'London', country: 'UK' },
      };
      const result = filtersReducer(withLocation, { type: 'CLEAR_LOCATION' });
      expect(result.location).toEqual({});
    });

    it('does not affect other filter fields', () => {
      const withBoth: EventFilters = {
        ...state,
        categories: ['Music'],
        location: { city: 'London' },
      };
      const result = filtersReducer(withBoth, { type: 'CLEAR_LOCATION' });
      expect(result.categories).toEqual(['Music']);
    });
  });

  describe('immutability', () => {
    it('returns a new object reference on every action', () => {
      const result = filtersReducer(state, { type: 'SET_CATEGORIES', payload: [] });
      expect(result).not.toBe(state);
    });

    it('does not mutate the input state', () => {
      const frozen = Object.freeze({ ...state, categories: ['Music'] }) as EventFilters;
      expect(() => filtersReducer(frozen, { type: 'SET_CATEGORIES', payload: ['Sports'] })).not.toThrow();
    });
  });
});
