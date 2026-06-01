import { renderHook, waitFor } from '@testing-library/react';
import type { EventFilters } from '@/components/events/filters/EventFilterContext';
import { useOccurrenceCalendarEvents } from '@/hooks/useOccurrenceCalendarEvents';

const mockQuery = jest.fn();
const mockUseApolloClient = jest.fn();
const mockGetAuthHeader = jest.fn(() => ({ Authorization: 'Bearer token' }));
const mockLoggerError = jest.fn();

jest.mock('@apollo/client', () => ({
  useApolloClient: () => mockUseApolloClient(),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: (...args: unknown[]) => mockGetAuthHeader(...args),
}));

jest.mock('@/lib/utils', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

describe('useOccurrenceCalendarEvents', () => {
  const baseFilters: EventFilters = {
    categories: [],
    dateRange: { start: null, end: null },
    statuses: [],
    searchQuery: '',
    location: {},
  };
  const defaultSort = [{ field: 'startAt', order: 'Asc' as any }];
  const defaultDateRange = {
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-30T23:59:59.999Z',
  };

  beforeEach(() => {
    mockQuery.mockReset();
    mockUseApolloClient.mockReset();
    mockGetAuthHeader.mockClear();
    mockLoggerError.mockClear();
    mockUseApolloClient.mockReturnValue({ query: mockQuery });
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() =>
      useOccurrenceCalendarEvents(baseFilters, 'token', defaultSort, defaultDateRange, undefined, false),
    );

    expect(mockQuery).not.toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
    expect(result.current.totalEvents).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('pages through occurrence results until the full window is loaded', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      occurrenceId: `occ-${index}`,
      startAt: '2026-06-01T08:00:00.000Z',
      timezone: 'UTC',
      eventSeries: { title: `Event ${index}` },
    }));
    const secondPage = Array.from({ length: 5 }, (_, index) => ({
      occurrenceId: `occ-${50 + index}`,
      startAt: '2026-06-02T08:00:00.000Z',
      timezone: 'UTC',
      eventSeries: { title: `Event ${50 + index}` },
    }));

    mockQuery
      .mockResolvedValueOnce({
        data: { readEventOccurrences: firstPage, readEventOccurrencesCount: 55 },
      })
      .mockResolvedValueOnce({
        data: { readEventOccurrences: secondPage, readEventOccurrencesCount: 55 },
      });

    const { result } = renderHook(() =>
      useOccurrenceCalendarEvents(baseFilters, 'token', defaultSort, defaultDateRange),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        variables: {
          options: expect.objectContaining({
            pagination: { limit: 50, skip: 0 },
          }),
        },
      }),
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        variables: {
          options: expect.objectContaining({
            pagination: { limit: 50, skip: 50 },
          }),
        },
      }),
    );
    expect(result.current.events).toHaveLength(55);
    expect(result.current.totalEvents).toBe(55);
    expect(result.current.error).toBeNull();
  });

  it('dedupes duplicate occurrence ids across fetched pages', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      occurrenceId: `occ-${index + 1}`,
      startAt: '2026-06-01T08:00:00.000Z',
      timezone: 'UTC',
      eventSeries: {},
    }));

    mockQuery
      .mockResolvedValueOnce({
        data: {
          readEventOccurrences: firstPage,
          readEventOccurrencesCount: 51,
        },
      })
      .mockResolvedValueOnce({
        data: {
          readEventOccurrences: [
            { occurrenceId: 'occ-50', startAt: '2026-06-01T09:00:00.000Z', timezone: 'UTC', eventSeries: {} },
            { occurrenceId: 'occ-51', startAt: '2026-06-01T10:00:00.000Z', timezone: 'UTC', eventSeries: {} },
          ],
          readEventOccurrencesCount: 51,
        },
      });

    const { result } = renderHook(() =>
      useOccurrenceCalendarEvents(baseFilters, 'token', defaultSort, defaultDateRange),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events).toHaveLength(51);
    expect(result.current.events.at(-1)?.occurrenceId).toBe('occ-51');
  });

  it('surfaces a friendly error when calendar fetching fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() =>
      useOccurrenceCalendarEvents(baseFilters, 'token', defaultSort, defaultDateRange),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events).toEqual([]);
    expect(result.current.totalEvents).toBe(0);
    expect(result.current.error).toBe('Unable to load this calendar window right now. Please try again.');
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
