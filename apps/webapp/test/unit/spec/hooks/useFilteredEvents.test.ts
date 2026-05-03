import { act, renderHook } from '@testing-library/react';
import dayjs from 'dayjs';
import { useFilteredEvents } from '@/hooks/useFilteredEvents';
import { DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import type { EventFilters } from '@/components/events/filters/EventFilterContext';
import { FilterOperatorInput } from '@/data/graphql/types/graphql';

const mockUseLazyQuery = jest.fn();

jest.mock('@apollo/client', () => ({
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
}));

describe('useFilteredEvents', () => {
  const makeOccurrence = (id: string) =>
    ({
      occurrenceId: id,
      eventSeriesId: `series-${id}`,
    }) as any;

  const baseFilters: EventFilters = {
    categories: [],
    dateRange: { start: null, end: null },
    statuses: [],
    searchQuery: '',
    location: {},
  };

  const initialEvents = [makeOccurrence('occ-1')] as any[];

  beforeEach(() => {
    mockUseLazyQuery.mockReset();
  });

  it('returns initial events when no filters are active', async () => {
    const loadEvents = jest.fn().mockResolvedValue({ data: { readEventOccurrences: [] } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const { result } = renderHook(() => useFilteredEvents(baseFilters, initialEvents));

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadEvents).not.toHaveBeenCalled();
    expect(result.current.events).toEqual(initialEvents);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });

  it('loads events when filters are applied and stores results', async () => {
    const nextEvents = [makeOccurrence('occ-2')] as any[];
    const loadEvents = jest.fn().mockResolvedValue({ data: { readEventOccurrences: nextEvents } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = {
      ...baseFilters,
      categories: ['Music'],
      statuses: ['Active'] as any,
      dateRange: {
        start: dayjs('2025-01-01'),
        end: dayjs('2025-01-02'),
        filterOption: DATE_FILTER_OPTIONS.TODAY,
      },
      location: {
        city: 'Nairobi',
        latitude: 1,
        longitude: 2,
        radiusKm: 25,
      },
    };

    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadEvents).toHaveBeenCalledWith({
      variables: {
        options: {
          filters: [
            { field: 'eventCategories.name', operator: FilterOperatorInput.Eq, value: ['Music'] },
            { field: 'status', operator: FilterOperatorInput.Eq, value: ['Active'] },
          ],
          dateFilterOption: DATE_FILTER_OPTIONS.TODAY,
          customDate: undefined,
          location: {
            city: 'Nairobi',
            state: undefined,
            country: undefined,
            latitude: 1,
            longitude: 2,
            radiusKm: 25,
          },
          pagination: { limit: 10, skip: 0 },
        },
      },
      fetchPolicy: 'network-only',
      context: {
        headers: expect.any(Object),
      },
    });
    expect(result.current.events).toEqual(nextEvents);
    expect(result.current.error).toBeNull();
  });

  it('uses custom date when filter option is custom', async () => {
    const loadEvents = jest.fn().mockResolvedValue({ data: { readEventOccurrences: initialEvents } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = {
      ...baseFilters,
      dateRange: {
        start: dayjs('2025-02-01'),
        end: dayjs('2025-02-02'),
        filterOption: DATE_FILTER_OPTIONS.CUSTOM,
      },
      categories: ['Sports'],
    };

    renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          options: expect.objectContaining({
            customDate: filters.dateRange.start?.toISOString(),
          }),
        }),
      }),
    );
  });

  it('sets a user-facing error when the query returns errors', async () => {
    const loadEvents = jest.fn().mockResolvedValue({ error: new Error('Bad request') });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = {
      ...baseFilters,
      categories: ['Arts'],
    };

    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Failed to load filtered events. Please try again.');
  });

  it('sets a user-facing error when the query throws', async () => {
    const loadEvents = jest.fn().mockRejectedValue(Object.assign(new Error('Network error'), { name: 'NetworkError' }));
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = {
      ...baseFilters,
      categories: ['Food'],
    };

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Unable to apply filters. Please check your connection and try again.');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('indicates hasMore is true when page returns >= 10 events', async () => {
    const tenEvents = Array.from({ length: 10 }, (_, i) => makeOccurrence(`occ-${i}`)) as any[];
    const loadEvents = jest.fn().mockResolvedValue({ data: { readEventOccurrences: tenEvents } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = { ...baseFilters, categories: ['Music'] };
    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.hasMore).toBe(true);
  });

  it('indicates hasMore is false when page returns < 10 events', async () => {
    const fewEvents = [makeOccurrence('occ-1')] as any[];
    const loadEvents = jest.fn().mockResolvedValue({ data: { readEventOccurrences: fewEvents } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = { ...baseFilters, categories: ['Music'] };
    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore appends the next page of events', async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => makeOccurrence(`occ-${i}`)) as any[];
    const secondPage = [makeOccurrence('occ-10'), makeOccurrence('occ-11')] as any[];
    const loadEvents = jest
      .fn()
      .mockResolvedValueOnce({ data: { readEventOccurrences: firstPage } })
      .mockResolvedValueOnce({ data: { readEventOccurrences: secondPage } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = { ...baseFilters, categories: ['Music'] };
    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.events).toEqual(firstPage);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.events).toEqual([...firstPage, ...secondPage]);
    expect(result.current.hasMore).toBe(false);
    expect(loadEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          options: expect.objectContaining({
            pagination: { limit: 10, skip: 10 },
          }),
        }),
      }),
    );
  });
});
