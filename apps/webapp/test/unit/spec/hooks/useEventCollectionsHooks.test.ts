import { act, renderHook, waitFor } from '@testing-library/react';
import { GetEventsCountDocument } from '@/data/graphql/query/Event/query';
import { SortOrderInput } from '@/data/graphql/types/graphql';
import { useHostedEventsByUser } from '@/hooks/useHostedEventsByUser';
import { useMyEventOccurrenceRsvps } from '@/hooks/useMyEventOccurrenceRsvps';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { useUserEventOccurrences } from '@/hooks/useUserEventOccurrences';

const useLazyQueryMock = jest.fn();
const useQueryMock = jest.fn();
const loggerErrorMock = jest.fn();
const loggerWarnMock = jest.fn();

jest.mock('@apollo/client', () => ({
  useLazyQuery: (...args: unknown[]) => useLazyQueryMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn((token?: string | null) => (token ? { Authorization: `Bearer ${token}` } : {})),
}));

jest.mock('@/lib/utils', () => ({
  logger: {
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

describe('event collection hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useHostedEventsByUser', () => {
    const mockHostedEventsQueries = (loadEvents: jest.Mock, loadEventsCount: jest.Mock) => {
      useLazyQueryMock.mockImplementation((document: unknown) =>
        document === GetEventsCountDocument ? [loadEventsCount, { loading: false }] : [loadEvents, { loading: false }],
      );
    };

    const createHostedEvent = (eventId: string) =>
      ({
        eventId,
        title: eventId,
        slug: eventId,
        primarySchedule: {
          anchorStartAt: '2026-05-25T10:00:00.000Z',
        },
      }) as any;

    it('does not request data when disabled or missing a userId', async () => {
      const loadEvents = jest.fn();
      const loadEventsCount = jest.fn();
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result, rerender } = renderHook(
        ({ userId, enabled }: { userId?: string; enabled?: boolean }) =>
          useHostedEventsByUser(userId, 'token', { enabled }),
        {
          initialProps: { userId: undefined, enabled: true },
        },
      );

      await act(async () => {});
      expect(result.current.events).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(loadEvents).not.toHaveBeenCalled();

      rerender({ userId: 'user-1', enabled: false });
      await act(async () => {});
      expect(loadEvents).not.toHaveBeenCalled();
    });

    it('does not load more when the hook has no user id', async () => {
      const loadEvents = jest.fn();
      const loadEventsCount = jest.fn();
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result } = renderHook(() => useHostedEventsByUser(undefined, 'token'));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(loadEvents).not.toHaveBeenCalled();
      expect(loadEventsCount).not.toHaveBeenCalled();
    });

    it('loads the first page and uses hosted query options', async () => {
      const loadEvents = jest.fn().mockResolvedValue({
        data: {
          readEvents: [createHostedEvent('event-1'), createHostedEvent('event-2')],
        },
      });
      const loadEventsCount = jest.fn().mockResolvedValue({
        data: {
          readEventsCount: 3,
        },
      });
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result } = renderHook(() => useHostedEventsByUser('user-1', 'token', { pageSize: 2 }));

      await waitFor(() => expect(result.current.events).toHaveLength(2));
      expect(result.current.hasMore).toBe(true);
      expect(loadEvents).toHaveBeenCalledWith({
        context: { headers: { Authorization: 'Bearer token' } },
        variables: {
          options: {
            filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
            pagination: { limit: 2, skip: 0 },
            sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
          },
        },
      });
      expect(loadEventsCount).toHaveBeenCalledWith({
        context: { headers: { Authorization: 'Bearer token' } },
        variables: {
          options: {
            filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
          },
        },
      });
    });

    it('treats hosted event count failures as best-effort and falls back to page size for hasMore', async () => {
      const loadEvents = jest.fn().mockResolvedValue({
        data: {
          readEvents: [createHostedEvent('event-1'), createHostedEvent('event-2')],
        },
      });
      const loadEventsCount = jest.fn().mockRejectedValue(new Error('count failed'));
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result } = renderHook(() => useHostedEventsByUser('user-1', 'token', { pageSize: 2 }));

      await waitFor(() => expect(result.current.events).toHaveLength(2));

      expect(result.current.error).toBeNull();
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasMore).toBe(true);
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Failed to load hosted events count for user profile',
        expect.any(Error),
      );
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });

    it('treats missing event and count payloads as empty results', async () => {
      const loadEvents = jest.fn().mockResolvedValue({});
      const loadEventsCount = jest.fn().mockResolvedValue({});
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result } = renderHook(() => useHostedEventsByUser('user-1', null, { pageSize: 2 }));

      await waitFor(() => expect(loadEvents).toHaveBeenCalledTimes(1));

      expect(result.current.events).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(loadEvents).toHaveBeenCalledWith({
        context: { headers: {} },
        variables: {
          options: {
            filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
            pagination: { limit: 2, skip: 0 },
            sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
          },
        },
      });
    });

    it('falls back to page-size-based pagination when the count payload is missing', async () => {
      const loadEvents = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readEvents: [createHostedEvent('event-1'), createHostedEvent('event-2')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            readEvents: [createHostedEvent('event-3')],
          },
        });
      const loadEventsCount = jest.fn().mockResolvedValue({});
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result } = renderHook(() => useHostedEventsByUser('user-1', 'token', { pageSize: 2 }));

      await waitFor(() => expect(result.current.hasMore).toBe(true));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.events.map((event) => event.eventId)).toEqual(['event-1', 'event-2', 'event-3']);
      expect(result.current.hasMore).toBe(false);
    });

    it('loads additional pages, dedupes event ids, and advances pagination', async () => {
      const loadEvents = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readEvents: [createHostedEvent('event-1'), createHostedEvent('event-2')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            readEvents: [createHostedEvent('event-2'), createHostedEvent('event-3')],
          },
        });
      const loadEventsCount = jest.fn().mockResolvedValue({
        data: {
          readEventsCount: 3,
        },
      });
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result } = renderHook(() => useHostedEventsByUser('user-1', 'token', { pageSize: 2 }));

      await waitFor(() => expect(result.current.hasMore).toBe(true));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.events.map((event) => event.eventId)).toEqual(['event-1', 'event-2', 'event-3']);
      expect(result.current.hasMore).toBe(false);
      expect(loadEvents).toHaveBeenLastCalledWith({
        context: { headers: { Authorization: 'Bearer token' } },
        variables: {
          options: {
            filters: [{ field: 'organizers.user.userId', value: 'user-1' }],
            pagination: { limit: 2, skip: 2 },
            sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
          },
        },
      });
    });

    it('surfaces refresh and load-more errors', async () => {
      const loadEvents = jest.fn().mockRejectedValueOnce('bad-refresh');
      const loadEventsCount = jest.fn().mockResolvedValue({
        data: {
          readEventsCount: 0,
        },
      });
      mockHostedEventsQueries(loadEvents, loadEventsCount);

      const { result } = renderHook(() => useHostedEventsByUser('user-1', 'token'));

      await waitFor(() => expect(result.current.error?.message).toBe('Unable to load hosted events right now.'));
      expect(loggerErrorMock).toHaveBeenCalled();

      const loadMoreError = new Error('load more failed');
      const loadMoreFn = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readEvents: Array.from({ length: 18 }, (_, index) => createHostedEvent(`event-${index}`)),
          },
        })
        .mockRejectedValueOnce(loadMoreError);
      const loadMoreCountFn = jest.fn().mockResolvedValue({
        data: {
          readEventsCount: 20,
        },
      });
      mockHostedEventsQueries(loadMoreFn, loadMoreCountFn);

      const secondHook = renderHook(() => useHostedEventsByUser('user-1', 'token'));
      await waitFor(() => expect(secondHook.result.current.hasMore).toBe(true));

      await act(async () => {
        await secondHook.result.current.loadMore();
      });

      expect(secondHook.result.current.error).toBe(loadMoreError);
      expect(loggerErrorMock).toHaveBeenCalled();
    });

    it('preserves refresh errors and normalizes string load-more failures', async () => {
      const refreshError = new Error('refresh exploded');
      const refreshEvents = jest.fn().mockRejectedValueOnce(refreshError);
      const refreshCount = jest.fn().mockResolvedValue({
        data: {
          readEventsCount: 0,
        },
      });
      mockHostedEventsQueries(refreshEvents, refreshCount);

      const refreshHook = renderHook(() => useHostedEventsByUser('user-1', 'token'));

      await waitFor(() => expect(refreshHook.result.current.error).toBe(refreshError));

      const loadMoreEvents = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            readEvents: Array.from({ length: 18 }, (_, index) => createHostedEvent(`event-${index}`)),
          },
        })
        .mockRejectedValueOnce('broken-load-more');
      const loadMoreCount = jest.fn().mockResolvedValue({
        data: {
          readEventsCount: 20,
        },
      });
      mockHostedEventsQueries(loadMoreEvents, loadMoreCount);

      const secondHook = renderHook(() => useHostedEventsByUser('user-1', 'token'));
      await waitFor(() => expect(secondHook.result.current.hasMore).toBe(true));

      await act(async () => {
        await secondHook.result.current.loadMore();
      });

      expect(secondHook.result.current.error?.message).toBe('Unable to load more hosted events right now.');
    });
  });

  describe('useMyEventOccurrenceRsvps', () => {
    const now = new Date();
    const futureStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();
    const pastStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const pastEnd = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

    const makeRsvp = (occurrenceId: string, startAt: string, endAt: string, includeEventSeries = true) =>
      ({
        participantId: `participant-${occurrenceId}`,
        occurrenceId,
        status: 'Going',
        quantity: 1,
        occurrence: includeEventSeries
          ? {
              occurrenceId,
              eventSeriesId: `series-${occurrenceId}`,
              startAt,
              endAt,
              participants: [],
              eventSeries: {
                eventId: `event-${occurrenceId}`,
                title: occurrenceId,
                slug: occurrenceId,
              },
            }
          : null,
      }) as any;

    it('requests paginated RSVPs, filters invalid previews, and splits upcoming/past events', () => {
      useQueryMock.mockReturnValue({
        data: {
          myEventOccurrenceRsvps: [
            makeRsvp('future', futureStart, futureEnd),
            makeRsvp('past', pastStart, pastEnd),
            makeRsvp('ignored', futureStart, futureEnd, false),
          ],
        },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useMyEventOccurrenceRsvps('token', true, { limit: 10, skip: 5 }));

      expect(useQueryMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: {
            includeCancelled: true,
            options: {
              pagination: {
                limit: 10,
                skip: 5,
              },
            },
          },
          skip: false,
        }),
      );
      expect(result.current.events).toHaveLength(2);
      expect(result.current.upcomingEvents.map((event) => event.occurrenceId)).toEqual(['future']);
      expect(result.current.pastEvents.map((event) => event.occurrenceId)).toEqual(['past']);
    });

    it('skips the query when disabled or token is missing', () => {
      useQueryMock.mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderHook(() => useMyEventOccurrenceRsvps(undefined, false));
      expect(useQueryMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ skip: true }));

      renderHook(() => useMyEventOccurrenceRsvps('token', false, { enabled: false, limit: 4 }));
      expect(useQueryMock).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          skip: true,
          variables: {
            includeCancelled: false,
            options: {
              pagination: {
                limit: 4,
                skip: 0,
              },
            },
          },
        }),
      );
    });
  });

  describe('useSavedEvents', () => {
    const makeSavedEvent = (eventId: string, anchorStartAt: string | null) =>
      ({
        eventId,
        title: eventId,
        slug: eventId,
        primarySchedule: anchorStartAt
          ? {
              anchorStartAt,
            }
          : null,
      }) as any;

    it('filters null follow targets, sorts by start time, and passes pagination options', () => {
      useQueryMock.mockReturnValue({
        data: {
          readSavedEvents: [
            { targetEvent: makeSavedEvent('later', '2026-06-02T10:00:00.000Z') },
            { targetEvent: null },
            { targetEvent: makeSavedEvent('earlier', '2026-06-01T10:00:00.000Z') },
            { targetEvent: makeSavedEvent('missing', null) },
          ],
        },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useSavedEvents('token', { limit: 3, skip: 6 }));

      expect(useQueryMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: {
            options: {
              pagination: {
                limit: 3,
                skip: 6,
              },
            },
          },
          skip: false,
        }),
      );
      expect(result.current.savedEvents.map((event) => event.eventId)).toEqual(['earlier', 'later', 'missing']);
    });

    it('skips when token is missing and returns an empty list when no data exists', () => {
      useQueryMock.mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useSavedEvents(undefined));

      expect(result.current.savedEvents).toEqual([]);
      expect(useQueryMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          skip: true,
          variables: {
            options: undefined,
          },
        }),
      );
    });
  });

  describe('useUserEventOccurrences', () => {
    it('requests paginated occurrences and partitions upcoming/past events', () => {
      const now = Date.now();
      const upcomingStart = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
      const upcomingEnd = new Date(now + (3 * 24 + 2) * 60 * 60 * 1000).toISOString();
      const pastStart = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      const pastEnd = new Date(now - (30 * 24 - 2) * 60 * 60 * 1000).toISOString();

      useQueryMock.mockReturnValue({
        data: {
          readUserEventOccurrences: [
            {
              occurrenceId: 'upcoming',
              startAt: upcomingStart,
              endAt: upcomingEnd,
            },
            {
              occurrenceId: 'past',
              startAt: pastStart,
              endAt: pastEnd,
            },
          ],
        },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useUserEventOccurrences('user-1', 'token', { limit: 8, skip: 4 }));

      expect(useQueryMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: {
            userId: 'user-1',
            options: {
              pagination: {
                limit: 8,
                skip: 4,
              },
            },
          },
          skip: false,
        }),
      );
      expect(result.current.upcomingEvents.map((occurrence) => occurrence.occurrenceId)).toEqual(['upcoming']);
      expect(result.current.pastEvents.map((occurrence) => occurrence.occurrenceId)).toEqual(['past']);
    });

    it('skips the query when disabled or the userId is missing', () => {
      useQueryMock.mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderHook(() => useUserEventOccurrences(undefined, 'token'));
      expect(useQueryMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ skip: true }));

      renderHook(() => useUserEventOccurrences('user-1', 'token', { enabled: false }));
      expect(useQueryMock).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          skip: true,
          variables: {
            userId: 'user-1',
            options: undefined,
          },
        }),
      );
    });
  });
});
