import { act, renderHook, waitFor } from '@testing-library/react';
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
      context: {
        headers: expect.any(Object),
      },
    });
    expect(mockUseLazyQuery).toHaveBeenCalledWith(expect.anything(), { fetchPolicy: 'network-only' });
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

  it('indicates hasMore is true when the backend reports more matching occurrences than are loaded', async () => {
    const tenEvents = Array.from({ length: 10 }, (_, i) => makeOccurrence(`occ-${i}`)) as any[];
    const loadEvents = jest
      .fn()
      .mockResolvedValue({ data: { readEventOccurrences: tenEvents, readEventOccurrencesCount: 12 } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = { ...baseFilters, categories: ['Music'] };
    const { result } = renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.hasMore).toBe(true);
  });

  it('indicates hasMore is false when the backend count is fully loaded', async () => {
    const fewEvents = [makeOccurrence('occ-1')] as any[];
    const loadEvents = jest
      .fn()
      .mockResolvedValue({ data: { readEventOccurrences: fewEvents, readEventOccurrencesCount: 1 } });
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
      .mockResolvedValueOnce({ data: { readEventOccurrences: firstPage, readEventOccurrencesCount: 12 } })
      .mockResolvedValueOnce({ data: { readEventOccurrences: secondPage, readEventOccurrencesCount: 12 } });
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
    expect(result.current.totalEvents).toBe(12);
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

  it('supports active backend filters without category inputs', async () => {
    const loadEvents = jest.fn().mockResolvedValue({ data: { readEventOccurrences: [] } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = {
      ...baseFilters,
      location: {
        city: 'Johannesburg',
      },
    };

    renderHook(() => useFilteredEvents(filters, initialEvents));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          options: expect.objectContaining({
            filters: undefined,
            location: expect.objectContaining({
              city: 'Johannesburg',
            }),
          }),
        },
      }),
    );
  });

  it('does not reset paginated events when initial events change after pagination', async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => makeOccurrence(`occ-${i}`)) as any[];
    const secondPage = [makeOccurrence('occ-10')] as any[];
    const refreshedInitialEvents = [makeOccurrence('server-occ')] as any[];
    let resolveRefetch: ((value: { data: { readEventOccurrences: any[] } }) => void) | undefined;
    const loadEvents = jest
      .fn()
      .mockResolvedValueOnce({ data: { readEventOccurrences: firstPage, readEventOccurrencesCount: 11 } })
      .mockResolvedValueOnce({ data: { readEventOccurrences: secondPage, readEventOccurrencesCount: 11 } })
      .mockImplementationOnce(
        () =>
          new Promise<{ data: { readEventOccurrences: any[] } }>((resolve) => {
            resolveRefetch = resolve;
          }),
      );
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = { ...baseFilters, categories: ['Music'] };
    const { result, rerender } = renderHook(
      ({ currentInitialEvents }: { currentInitialEvents: any[] }) => useFilteredEvents(filters, currentInitialEvents),
      {
        initialProps: { currentInitialEvents: initialEvents },
      },
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.loadMore();
    });

    rerender({ currentInitialEvents: refreshedInitialEvents });

    expect(result.current.events).toEqual([...firstPage, ...secondPage]);

    await act(async () => {
      resolveRefetch?.({ data: { readEventOccurrences: refreshedInitialEvents } });
      await Promise.resolve();
    });
  });

  it('ignores stale filter responses after the hook unmounts', async () => {
    let resolveEvents: ((value: { data: { readEventOccurrences: any[] } }) => void) | undefined;

    const loadEvents = jest.fn(
      () =>
        new Promise<{ data: { readEventOccurrences: any[] } }>((resolve) => {
          resolveEvents = resolve;
        }),
    );
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = { ...baseFilters, categories: ['Music'] };
    const { result, unmount } = renderHook(() => useFilteredEvents(filters, initialEvents));

    unmount();

    await act(async () => {
      resolveEvents?.({ data: { readEventOccurrences: [makeOccurrence('late-occ')] } });
      await Promise.resolve();
    });

    expect(result.current.events).toEqual(initialEvents);
  });

  it('ignores stale filter errors after the hook unmounts', async () => {
    let rejectEvents: ((reason?: unknown) => void) | undefined;

    const loadEvents = jest.fn(
      () =>
        new Promise<never>((_, reject) => {
          rejectEvents = reject;
        }),
    );
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    const filters: EventFilters = { ...baseFilters, categories: ['Music'] };
    const { result, unmount } = renderHook(() => useFilteredEvents(filters, initialEvents));

    unmount();

    await act(async () => {
      rejectEvents?.(new Error('late failure'));
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
  });

  it('keeps state stable when the next page fails', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => makeOccurrence(`occ-${index}`)) as any[];
    const loadMoreError = new Error('next page failed');
    const loadMoreFailure = jest
      .fn()
      .mockResolvedValueOnce({ data: { readEventOccurrences: firstPage, readEventOccurrencesCount: 12 } })
      .mockImplementation(() => Promise.reject(loadMoreError));
    mockUseLazyQuery.mockReturnValue([loadMoreFailure, { loading: false }]);

    const retryingHook = renderHook(() => useFilteredEvents({ ...baseFilters, categories: ['Music'] }, initialEvents));

    await waitFor(() => expect(retryingHook.result.current.hasMore).toBe(true));

    await act(async () => {
      await retryingHook.result.current.loadMore();
    });

    expect(retryingHook.result.current.events).toEqual(firstPage);
    expect(retryingHook.result.current.loadingMore).toBe(false);
  });

  it('filters occurrences by selected event id when provided', async () => {
    const selectedSeriesOccurrences = [makeOccurrence('occ-2')] as any[];
    const loadEvents = jest.fn().mockResolvedValue({ data: { readEventOccurrences: selectedSeriesOccurrences } });
    mockUseLazyQuery.mockReturnValue([loadEvents, { loading: false }]);

    renderHook(() =>
      useFilteredEvents(baseFilters, initialEvents, undefined, undefined, initialEvents.length, 'series-1'),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          options: expect.objectContaining({
            filters: [{ field: 'eventId', operator: FilterOperatorInput.Eq, value: ['series-1'] }],
            dateRange: expect.objectContaining({
              startDate: expect.stringContaining('201'),
              endDate: expect.stringContaining('203'),
            }),
          }),
        },
      }),
    );
  });
});
