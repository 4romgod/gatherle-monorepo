import {
  buildFilterInputs,
  buildDateFilterParams,
  buildLocationFilter,
  useFilteredEvents,
} from '@/hooks/useFilteredEvents';
import { EventFilters, LocationFilter } from '@/components/events/filters/EventFilterContext';
import { FilterOperatorInput, EventStatus } from '@/data/graphql/types/graphql';
import { DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import { renderHook } from '@testing-library/react';
import { EventPreview } from '@/data/graphql/query/Event/types';
import dayjs from 'dayjs';
import * as apolloClient from '@apollo/client';

// Factory for creating EventFilters with defaults
const createFilters = (overrides: Partial<EventFilters> = {}): EventFilters => ({
  categories: [],
  priceRange: [0, 500],
  dateRange: { start: null, end: null },
  statuses: [],
  searchQuery: '',
  location: {},
  ...overrides,
});

describe('useFilteredEvents hook', () => {
  const initialEvents: EventPreview[] = [
    {
      eventId: 'base-event',
    } as EventPreview,
  ];
  let useLazyQuerySpy: jest.SpyInstance;

  beforeEach(() => {
    useLazyQuerySpy = jest.spyOn(apolloClient, 'useLazyQuery');
  });

  afterEach(() => {
    useLazyQuerySpy.mockRestore();
  });

  it('returns initial events when no filters are applied', () => {
    useLazyQuerySpy.mockReturnValue([jest.fn(), { loading: false }]);
    const filters = createFilters();

    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    expect(result.current.events).toEqual(initialEvents);
    expect(result.current.hasFilterInputs).toBe(false);
  });

  // TODO: Fix tests (how do we import waitFor)
  // it('fetches filtered events when filters are provided', async () => {
  //   const loadEvents = jest.fn().mockResolvedValue({
  //     data: { readEvents: [{ eventId: 'filtered-event' }] },
  //   });
  //   useLazyQuerySpy.mockReturnValue([loadEvents, { loading: false }]);

  //   const filters = createFilters({
  //     categories: ['Music'],
  //   });

  //   const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

  //   await waitFor(() => expect(result.current.events).toEqual([{ eventId: 'filtered-event' }]));
  //   expect(result.current.hasFilterInputs).toBe(true);
  // });

  // it('handles loadEvents errors gracefully', async () => {
  //   const error = new Error('network');
  //   const loadEvents = jest.fn().mockRejectedValue(error);
  //   useLazyQuerySpy.mockReturnValue([loadEvents, { loading: false }]);

  //   const filters = createFilters({
  //     categories: ['Sports'],
  //   });

  //   const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

  //   await waitFor(() => expect(result.current.error).toContain('Unable to apply filters'));
  // });
});

describe('buildFilterInputs', () => {
  it('should return empty array when no filters are set', () => {
    const filters = createFilters();
    const result = buildFilterInputs(filters);
    expect(result).toEqual([]);
  });

  it('should build category filter input', () => {
    const filters = createFilters({
      categories: ['Music', 'Sports'],
    });

    const result = buildFilterInputs(filters);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: 'eventCategories.name',
      operator: FilterOperatorInput.Eq,
      value: ['Music', 'Sports'],
    });
  });

  it('should build status filter input', () => {
    const filters = createFilters({
      statuses: [EventStatus.Upcoming, EventStatus.Cancelled],
    });

    const result = buildFilterInputs(filters);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      field: 'status',
      operator: FilterOperatorInput.Eq,
      value: [EventStatus.Upcoming, EventStatus.Cancelled],
    });
  });

  it('should build both category and status filters', () => {
    const filters = createFilters({
      categories: ['Music'],
      statuses: [EventStatus.Upcoming],
    });

    const result = buildFilterInputs(filters);

    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('eventCategories.name');
    expect(result[1].field).toBe('status');
  });

  it('should not include empty category array', () => {
    const filters = createFilters({
      categories: [],
      statuses: [EventStatus.Upcoming],
    });

    const result = buildFilterInputs(filters);

    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('status');
  });
});

describe('buildDateFilterParams', () => {
  it('should return empty object when no date range is set', () => {
    const filters = createFilters();
    const result = buildDateFilterParams(filters);
    expect(result).toEqual({});
  });

  it('should return empty object when only start date is set', () => {
    const filters = createFilters({
      dateRange: { start: dayjs('2026-01-20'), end: null },
    });

    const result = buildDateFilterParams(filters);
    expect(result).toEqual({});
  });

  it('should return dateFilterOption when preset filter is selected', () => {
    const filters = createFilters({
      dateRange: {
        start: dayjs('2026-01-20'),
        end: dayjs('2026-01-21'),
        filterOption: DATE_FILTER_OPTIONS.TODAY,
      },
    });

    const result = buildDateFilterParams(filters);

    expect(result).toEqual({
      dateFilterOption: DATE_FILTER_OPTIONS.TODAY,
    });
  });

  it('should return customDate when CUSTOM filter is selected', () => {
    const startDate = dayjs('2026-03-15T10:00:00Z');
    const filters = createFilters({
      dateRange: {
        start: startDate,
        end: dayjs('2026-03-16'),
        filterOption: DATE_FILTER_OPTIONS.CUSTOM,
      },
    });

    const result = buildDateFilterParams(filters);

    expect(result).toEqual({
      customDate: startDate.toISOString(),
    });
  });

  it('should return customDate when dates set without filterOption', () => {
    const startDate = dayjs('2026-02-10T14:30:00Z');
    const filters = createFilters({
      dateRange: {
        start: startDate,
        end: dayjs('2026-02-11'),
        filterOption: undefined,
      },
    });

    const result = buildDateFilterParams(filters);

    expect(result).toEqual({
      customDate: startDate.toISOString(),
    });
  });

  it('should handle THIS_WEEK filter option', () => {
    const filters = createFilters({
      dateRange: {
        start: dayjs('2026-01-18'),
        end: dayjs('2026-01-24'),
        filterOption: DATE_FILTER_OPTIONS.THIS_WEEK,
      },
    });

    const result = buildDateFilterParams(filters);

    expect(result).toEqual({
      dateFilterOption: DATE_FILTER_OPTIONS.THIS_WEEK,
    });
  });
});

describe('buildLocationFilter', () => {
  it('should return undefined when location is empty', () => {
    const location: LocationFilter = {};
    const result = buildLocationFilter(location);
    expect(result).toBeUndefined();
  });

  it('should return undefined when all location fields are undefined', () => {
    const location: LocationFilter = {
      city: undefined,
      state: undefined,
      country: undefined,
      latitude: undefined,
    };

    const result = buildLocationFilter(location);
    expect(result).toBeUndefined();
  });

  it('should build filter with city only', () => {
    const location: LocationFilter = {
      city: 'London',
    };

    const result = buildLocationFilter(location);

    expect(result).toEqual({
      city: 'London',
      state: undefined,
      country: undefined,
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
    });
  });

  it('should build filter with full text location', () => {
    const location: LocationFilter = {
      city: 'London',
      state: 'England',
      country: 'UK',
    };

    const result = buildLocationFilter(location);

    expect(result).toEqual({
      city: 'London',
      state: 'England',
      country: 'UK',
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
    });
  });

  it('should build filter with geospatial coordinates', () => {
    const location: LocationFilter = {
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 25,
    };

    const result = buildLocationFilter(location);

    expect(result).toEqual({
      city: undefined,
      state: undefined,
      country: undefined,
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 25,
    });
  });

  it('should build filter with combined text and geospatial', () => {
    const location: LocationFilter = {
      city: 'London',
      country: 'UK',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 50,
    };

    const result = buildLocationFilter(location);

    expect(result).toEqual({
      city: 'London',
      state: undefined,
      country: 'UK',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 50,
    });
  });

  it('should detect location presence with state only', () => {
    const location: LocationFilter = {
      state: 'California',
    };

    const result = buildLocationFilter(location);
    expect(result).toBeDefined();
    expect(result?.state).toBe('California');
  });

  it('should detect location presence with country only', () => {
    const location: LocationFilter = {
      country: 'United States',
    };

    const result = buildLocationFilter(location);
    expect(result).toBeDefined();
    expect(result?.country).toBe('United States');
  });
});
