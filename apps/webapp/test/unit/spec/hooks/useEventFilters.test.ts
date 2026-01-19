import { renderHook } from '@testing-library/react';
import { useEventFilters } from '@/hooks/useEventFilters';
import React from 'react';

// Mock the event filter context module
const mockContextValue = {
  filters: {
    categories: [] as string[],
    statuses: [] as string[],
    dateRange: {
      start: null as Date | null,
      end: null as Date | null,
      filterOption: null as string | null,
    },
    location: {
      city: null as string | null,
      state: null as string | null,
      country: null as string | null,
      latitude: null as number | null,
      longitude: null as number | null,
      radiusKm: null as number | null,
    },
  },
  setCategories: jest.fn(),
  setPriceRange: jest.fn(),
  setDateRange: jest.fn(),
  setStatuses: jest.fn(),
  setSearchQuery: jest.fn(),
  setLocation: jest.fn(),
  clearLocation: jest.fn(),
  resetFilters: jest.fn(),
  removeCategory: jest.fn(),
  removeStatus: jest.fn(),
  hasActiveFilters: false,
};

let mockContext: typeof mockContextValue | undefined = mockContextValue;

jest.mock('@/components/events/filters/event-filter-context', () => ({
  EventFilterContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  // Use a getter to access the mutable mockContext
  get EventFilterContextType() {
    return mockContext;
  },
}));

// Mock useContext to return our mock value
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(() => mockContext),
}));

describe('useEventFilters Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = { ...mockContextValue };
  });

  describe('without provider', () => {
    it('should throw error when used outside EventFilterProvider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Set context to undefined to simulate missing provider
      mockContext = undefined;
      const { useContext } = require('react');
      (useContext as jest.Mock).mockReturnValue(undefined);

      expect(() => {
        renderHook(() => useEventFilters());
      }).toThrow('useEventFilters must be used within an EventFilterProvider');

      consoleError.mockRestore();
    });
  });

  describe('with provider', () => {
    beforeEach(() => {
      mockContext = { ...mockContextValue };
      const { useContext } = require('react');
      (useContext as jest.Mock).mockReturnValue(mockContext);
    });

    it('should return context value when used within provider', () => {
      const { result } = renderHook(() => useEventFilters());

      expect(result.current.filters).toBeDefined();
      expect(result.current.resetFilters).toBeDefined();
      expect(result.current.hasActiveFilters).toBeDefined();
    });

    it('should return filters object with correct shape', () => {
      const { result } = renderHook(() => useEventFilters());

      const { filters } = result.current;
      expect(filters).toHaveProperty('categories');
      expect(filters).toHaveProperty('statuses');
      expect(filters).toHaveProperty('dateRange');
      expect(filters).toHaveProperty('location');
    });

    it('should return resetFilters function', () => {
      const { result } = renderHook(() => useEventFilters());
      expect(typeof result.current.resetFilters).toBe('function');
    });

    it('should return hasActiveFilters boolean', () => {
      const { result } = renderHook(() => useEventFilters());
      expect(typeof result.current.hasActiveFilters).toBe('boolean');
    });
  });

  describe('with custom context values', () => {
    it('should return filters with categories', () => {
      const customContext = {
        ...mockContextValue,
        filters: {
          ...mockContextValue.filters,
          categories: ['Music', 'Sports'],
        },
      };
      const { useContext } = require('react');
      (useContext as jest.Mock).mockReturnValue(customContext);

      const { result } = renderHook(() => useEventFilters());

      expect(result.current.filters.categories).toEqual(['Music', 'Sports']);
    });

    it('should return filters with location', () => {
      const customContext = {
        ...mockContextValue,
        filters: {
          ...mockContextValue.filters,
          location: {
            city: 'New York',
            state: 'NY',
            country: 'USA',
            latitude: 40.7128,
            longitude: -74.006,
            radiusKm: 50,
          },
        },
      };
      const { useContext } = require('react');
      (useContext as jest.Mock).mockReturnValue(customContext);

      const { result } = renderHook(() => useEventFilters());

      expect(result.current.filters.location.city).toBe('New York');
      expect(result.current.filters.location.latitude).toBe(40.7128);
      expect(result.current.filters.location.radiusKm).toBe(50);
    });

    it('should return filters with date range', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-20');

      const customContext = {
        ...mockContextValue,
        filters: {
          ...mockContextValue.filters,
          dateRange: {
            start: startDate,
            end: endDate,
            filterOption: 'THIS_WEEK',
          },
        },
      };
      const { useContext } = require('react');
      (useContext as jest.Mock).mockReturnValue(customContext);

      const { result } = renderHook(() => useEventFilters());

      expect(result.current.filters.dateRange.start).toBe(startDate);
      expect(result.current.filters.dateRange.end).toBe(endDate);
      expect(result.current.filters.dateRange.filterOption).toBe('THIS_WEEK');
    });
  });
});
