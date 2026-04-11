import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { EventFilterProvider } from '@/components/events/filters/EventFilterContext';
import { useEventFilters } from '@/hooks/useEventFilters';
import { EventStatus } from '@/data/graphql/types/graphql';
import { STORAGE_KEYS, STORAGE_NAMESPACES } from '@/hooks/usePersistentState/constants';
import dayjs from 'dayjs';

// Aliases — the GraphQL schema uses Upcoming/Cancelled (not Published)
const Published = EventStatus.Upcoming;
const Cancelled = EventStatus.Cancelled;

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
  isAuthenticated: jest.fn(async () => false),
}));

const mockMutate = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(() => ({ data: null, loading: false, error: null })),
  useMutation: jest.fn(() => [mockMutate, { loading: false, error: null }]),
  gql: jest.fn((strings: TemplateStringsArray) => strings[0]),
}));

const FILTER_STORAGE_KEY = `${STORAGE_NAMESPACES.FILTERS}:${STORAGE_KEYS.EVENTS_FILTER_STATE}`;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(EventFilterProvider, null, children);

describe('EventFilterProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMutate.mockClear();
  });

  describe('initial state', () => {
    it('starts with empty filters', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      expect(result.current.filters.categories).toEqual([]);
      expect(result.current.filters.statuses).toEqual([]);
      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.filters.dateRange.start).toBeNull();
      expect(result.current.filters.dateRange.end).toBeNull();
      expect(result.current.filters.location).toEqual({});
    });

    it('reports no active filters initially', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('hydrates filters from localStorage', () => {
      window.localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          value: {
            categories: ['Music'],
            statuses: [],
            dateRange: { start: null, end: null },
            searchQuery: '',
            location: {},
          },
        }),
      );

      const { result } = renderHook(() => useEventFilters(), { wrapper });
      expect(result.current.filters.categories).toEqual(['Music']);
    });
  });

  describe('setCategories', () => {
    it('sets categories', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => {
        result.current.setCategories(['Music', 'Sports']);
      });

      expect(result.current.filters.categories).toEqual(['Music', 'Sports']);
    });

    it('replaces existing categories', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setCategories(['Music']));
      act(() => result.current.setCategories(['Sports', 'Tech']));

      expect(result.current.filters.categories).toEqual(['Sports', 'Tech']);
    });

    it('marks hasActiveFilters true when categories are set', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setCategories(['Music']));

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('removeCategory', () => {
    it('removes a single category', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setCategories(['Music', 'Sports', 'Tech']));
      act(() => result.current.removeCategory('Sports'));

      expect(result.current.filters.categories).toEqual(['Music', 'Tech']);
    });

    it('is a no-op for a category that does not exist', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setCategories(['Music']));
      act(() => result.current.removeCategory('Tech'));

      expect(result.current.filters.categories).toEqual(['Music']);
    });
  });

  describe('setDateRange', () => {
    it('sets start and end dates', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });
      const start = dayjs('2026-03-01');
      const end = dayjs('2026-03-31');

      act(() => result.current.setDateRange(start, end));

      expect(result.current.filters.dateRange.start?.isSame(start)).toBe(true);
      expect(result.current.filters.dateRange.end?.isSame(end)).toBe(true);
    });

    it('stores the filterOption when provided', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setDateRange(null, null, 'THIS_WEEK'));

      expect(result.current.filters.dateRange.filterOption).toBe('THIS_WEEK');
    });

    it('marks hasActiveFilters true when start date is set', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setDateRange(dayjs(), null));

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('setStatuses', () => {
    it('sets statuses', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setStatuses([Published]));

      expect(result.current.filters.statuses).toEqual([Published]);
    });
  });

  describe('removeStatus', () => {
    it('removes a single status', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setStatuses([Published, Cancelled]));
      act(() => result.current.removeStatus(Cancelled));

      expect(result.current.filters.statuses).toEqual([Published]);
    });
  });

  describe('setSearchQuery', () => {
    it('sets the search query', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setSearchQuery('festival'));

      expect(result.current.filters.searchQuery).toBe('festival');
    });

    it('marks hasActiveFilters true when query is set', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setSearchQuery('festival'));

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('setLocation / clearLocation', () => {
    it('sets the location', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });
      const location = { city: 'London', country: 'UK', latitude: 51.5, longitude: -0.12, radiusKm: 10 };

      act(() => result.current.setLocation(location));

      expect(result.current.filters.location).toEqual(location);
    });

    it('marks hasActiveFilters true when city is set', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setLocation({ city: 'London' }));

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('clears the location', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setLocation({ city: 'London', country: 'UK' }));
      act(() => result.current.clearLocation());

      expect(result.current.filters.location).toEqual({});
    });

    it('reports no active filters after clearing location (other filters empty)', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setLocation({ city: 'London' }));
      act(() => result.current.clearLocation());

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('resetFilters', () => {
    it('resets all filters to initial state', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => {
        result.current.setCategories(['Music']);
        result.current.setSearchQuery('festival');
        result.current.setStatuses([Published]);
      });

      act(() => result.current.resetFilters());

      expect(result.current.filters.categories).toEqual([]);
      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.filters.statuses).toEqual([]);
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('clears persisted filters from localStorage', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setCategories(['Music']));
      act(() => result.current.resetFilters());

      const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
      expect(stored).toBeNull();
    });
  });

  describe('persistence', () => {
    it('persists filter changes to localStorage', () => {
      const { result } = renderHook(() => useEventFilters(), { wrapper });

      act(() => result.current.setCategories(['Music']));

      const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored as string);
      expect(parsed.value.categories).toEqual(['Music']);
    });
  });
});
