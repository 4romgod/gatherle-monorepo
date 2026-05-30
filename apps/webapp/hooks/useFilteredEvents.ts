import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  FilterInput,
  FilterOperatorInput,
  GetEventOccurrencesQuery,
  GetEventOccurrencesQueryVariables,
  LocationFilterInput,
  SortInput,
  EventsQueryOptionsInput,
} from '@/data/graphql/types/graphql';
import { GetEventOccurrencesDocument } from '@/data/graphql/query';
import { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import { EventFilters, LocationFilter } from '@/components/events/filters/EventFilterContext';
import { DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import { getAuthHeader } from '@/lib/utils/auth';
import { logger } from '@/lib/utils';
import { buildDefaultOccurrenceDateRange } from '@/lib/utils/occurrence-query';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Builds GraphQL filter inputs from event filters.
 * Exported for testing.
 */
export const buildFilterInputs = (filters: EventFilters): FilterInput[] => {
  const inputs: FilterInput[] = [];

  if (filters.categories.length > 0) {
    inputs.push({
      field: 'eventCategories.name',
      operator: FilterOperatorInput.Eq,
      value: filters.categories,
    });
  }

  if (filters.statuses.length > 0) {
    inputs.push({
      field: 'status',
      operator: FilterOperatorInput.Eq,
      value: filters.statuses,
    });
  }

  return inputs;
};

const buildSelectedEventFilter = (selectedEventId?: string): FilterInput[] => {
  if (!selectedEventId) {
    return [];
  }

  return [
    {
      field: 'eventId',
      operator: FilterOperatorInput.Eq,
      value: [selectedEventId],
    },
  ];
};

/**
 * Builds date filter parameters from event filters.
 * Exported for testing.
 */
export const buildDateFilterParams = (filters: EventFilters): { dateFilterOption?: string; customDate?: string } => {
  if (!filters.dateRange.start || !filters.dateRange.end) {
    return {};
  }

  // If we have a stored filter option that's not CUSTOM, use it
  if (filters.dateRange.filterOption && filters.dateRange.filterOption !== DATE_FILTER_OPTIONS.CUSTOM) {
    return {
      dateFilterOption: filters.dateRange.filterOption,
    };
  }

  // Otherwise, treat it as a custom date
  return {
    customDate: filters.dateRange.start.toISOString(),
  };
};

/**
 * Builds location filter input from location filter state.
 * Exported for testing.
 */
export const buildLocationFilter = (location: LocationFilter): LocationFilterInput | undefined => {
  const hasLocation = !!(location.city || location.state || location.country || location.latitude);
  if (!hasLocation) {
    return undefined;
  }

  return {
    city: location.city,
    state: location.state,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    radiusKm: location.radiusKm,
  };
};

export const buildOccurrenceDateInput = (
  filters: EventFilters,
): Pick<EventsQueryOptionsInput, 'dateFilterOption' | 'customDate' | 'dateRange'> => {
  const input: Pick<EventsQueryOptionsInput, 'dateFilterOption' | 'customDate' | 'dateRange'> = {};
  const dateFilterParams = buildDateFilterParams(filters);

  if (dateFilterParams.dateFilterOption || dateFilterParams.customDate) {
    input.dateFilterOption = dateFilterParams.dateFilterOption as EventsQueryOptionsInput['dateFilterOption'];
    input.customDate = dateFilterParams.customDate;
    return input;
  }

  input.dateRange = buildDefaultOccurrenceDateRange();
  return input;
};

export const useFilteredEvents = (
  filters: EventFilters,
  initialEvents: EventOccurrencePreview[],
  token?: string | null,
  sort?: SortInput[],
  initialTotalEvents: number = initialEvents.length,
  selectedEventId?: string,
) => {
  const [events, setEvents] = useState<EventOccurrencePreview[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const [totalEvents, setTotalEvents] = useState(initialTotalEvents);
  const [hasMore, setHasMore] = useState(initialEvents.length < initialTotalEvents);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(0);

  const filterInputs = useMemo(() => buildFilterInputs(filters), [filters.categories, filters.statuses]);
  const selectedEventFilter = useMemo(() => buildSelectedEventFilter(selectedEventId), [selectedEventId]);
  const queryFilters = useMemo(() => [...filterInputs, ...selectedEventFilter], [filterInputs, selectedEventFilter]);
  const occurrenceDateInput = useMemo(() => buildOccurrenceDateInput(filters), [filters]);
  const locationFilter = useMemo(() => buildLocationFilter(filters.location), [filters.location]);
  const [loadEvents, { loading }] = useLazyQuery<GetEventOccurrencesQuery, GetEventOccurrencesQueryVariables>(
    GetEventOccurrencesDocument,
    {
      fetchPolicy: 'network-only',
    },
  );

  const hasActiveBackendFilters =
    queryFilters.length > 0 || !!filters.dateRange.start || !!filters.dateRange.end || !!locationFilter;

  const buildQueryOptions = useCallback(
    (skip: number) => ({
      filters: queryFilters.length > 0 ? queryFilters : undefined,
      dateFilterOption: occurrenceDateInput.dateFilterOption,
      customDate: occurrenceDateInput.customDate,
      dateRange: occurrenceDateInput.dateRange,
      location: locationFilter,
      sort,
      pagination: { limit: DEFAULT_PAGE_SIZE, skip },
    }),
    [locationFilter, occurrenceDateInput, queryFilters, sort],
  );

  // When initialEvents change (fresh SSR/cache data), reset only if user hasn't paginated
  useEffect(() => {
    if (pageRef.current > 0) return;
    setEvents(initialEvents);
    setTotalEvents(initialTotalEvents);
    setHasMore(initialEvents.length < initialTotalEvents);
  }, [initialEvents, initialTotalEvents]);

  // When filters change, fetch page 0
  useEffect(() => {
    if (!hasActiveBackendFilters) {
      setEvents(initialEvents);
      setTotalEvents(initialTotalEvents);
      setHasMore(initialEvents.length < initialTotalEvents);
      setError(null);
      pageRef.current = 0;
      return;
    }

    let isCurrent = true;
    setError(null);
    pageRef.current = 0;

    loadEvents({
      variables: { options: buildQueryOptions(0) },
      context: { headers: getAuthHeader(token) },
    })
      .then((response) => {
        if (!isCurrent) return;
        if (response.data?.readEventOccurrences) {
          const fetched = response.data.readEventOccurrences as EventOccurrencePreview[];
          const nextTotalEvents = response.data.readEventOccurrencesCount ?? fetched.length;
          setEvents(fetched);
          setTotalEvents(nextTotalEvents);
          setHasMore(fetched.length < nextTotalEvents);
          setError(null);
        } else if (response.error) {
          logger.error('GraphQL error fetching filtered events', response.error);
          setError('Failed to load filtered events. Please try again.');
        }
      })
      .catch((caughtError) => {
        if (!isCurrent) return;
        logger.error('Error fetching filtered events', caughtError);
        setError('Unable to apply filters. Please check your connection and try again.');
      });

    return () => {
      isCurrent = false;
    };
  }, [
    queryFilters,
    occurrenceDateInput,
    locationFilter,
    loadEvents,
    buildQueryOptions,
    token,
    hasActiveBackendFilters,
  ]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) {
      return;
    }

    const nextPage = pageRef.current + 1;
    const skip = nextPage * DEFAULT_PAGE_SIZE;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const response = await loadEvents({
        variables: { options: buildQueryOptions(skip) },
        context: { headers: getAuthHeader(token) },
      });

      if (response.data?.readEventOccurrences) {
        const fetched = response.data.readEventOccurrences as EventOccurrencePreview[];
        const nextTotalEvents = response.data.readEventOccurrencesCount ?? totalEvents;
        const existingIds = new Set(events.map((event) => event.occurrenceId));
        const unique = fetched.filter((event) => !existingIds.has(event.occurrenceId));
        const nextEvents = [...events, ...unique];
        setEvents(nextEvents);
        setTotalEvents(nextTotalEvents);
        setHasMore(nextEvents.length < nextTotalEvents);
        pageRef.current = nextPage;
      }
    } catch (err) {
      logger.error('Error loading more events', err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [buildQueryOptions, events, hasMore, loadEvents, token, totalEvents]);

  return {
    events,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    totalEvents,
    hasFilterInputs: hasActiveBackendFilters,
  };
};
