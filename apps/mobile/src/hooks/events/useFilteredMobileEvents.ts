import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GetEventsFeedDocument } from '@data/graphql/query/Discovery/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import {
  DateFilterOption,
  FilterInput,
  FilterOperatorInput,
  LocationFilterInput,
  SortOrderInput,
} from '@data/graphql/types/graphql';
import { getApolloAuthContext } from '@/lib/auth';
import { buildDefaultOccurrenceDateRange, sortCategoriesByInterest } from '@/lib/events/formatters';
import type { EventsFilterState } from './useEventsFilters';

const EVENTS_PAGE_SIZE = 20;
// Stable default date range — computed once at module load so Apollo cache keys
// don't drift on every render from micro-second differences in new Date().
// The API requires at least one of customDate, dateFilterOption, or a full dateRange,
// so this is always sent as a fallback when no other date filter is active.
const stableDefaultDateRange = buildDefaultOccurrenceDateRange();

function buildQueryOptions(filters: EventsFilterState, selectedEventId?: string) {
  const filterInputs: FilterInput[] = [];

  if (selectedEventId) {
    filterInputs.push({
      field: 'eventId',
      operator: FilterOperatorInput.Eq,
      value: [selectedEventId],
    });
  }

  if (filters.categories.length > 0) {
    filterInputs.push({
      field: 'eventCategories.name',
      operator: FilterOperatorInput.Eq,
      value: filters.categories,
    });
  }

  if (filters.statuses.length > 0) {
    filterInputs.push({
      field: 'status',
      operator: FilterOperatorInput.Eq,
      value: filters.statuses,
    });
  }

  const hasLocation = !!(filters.location.city || filters.location.state || filters.location.country);
  const locationFilter: LocationFilterInput | undefined = hasLocation
    ? {
        city: filters.location.city || undefined,
        state: filters.location.state || undefined,
        country: filters.location.country || undefined,
      }
    : undefined;

  return {
    ...(filters.dateOption
      ? { dateFilterOption: filters.dateOption as DateFilterOption }
      : { dateRange: stableDefaultDateRange }),
    ...(filterInputs.length > 0 ? { filters: filterInputs } : {}),
    ...(locationFilter ? { location: locationFilter } : {}),
    sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
    pagination: { limit: EVENTS_PAGE_SIZE, skip: 0 },
  };
}

export function useDraftResultCount(
  draft: EventsFilterState,
  skip: boolean,
  authToken?: string | null,
  selectedEventId?: string,
): number {
  const draftKey = JSON.stringify(draft);
  const options = useMemo(() => buildQueryOptions(draft, selectedEventId), [draftKey, selectedEventId]);

  const { data } = useQuery(GetEventsFeedDocument, {
    fetchPolicy: 'cache-and-network',
    skip,
    variables: { options },
    ...getApolloAuthContext(authToken),
  });

  return data?.readEventOccurrencesCount ?? (data?.readEventOccurrences ?? []).length;
}

export function useFilteredMobileEvents(
  filters: EventsFilterState,
  authToken?: string | null,
  selectedEventId?: string,
) {
  // Serialize filters to a stable string key so useMemo reliably detects
  // any content change regardless of object reference identity.
  const filtersKey = JSON.stringify(filters);
  const options = useMemo(() => buildQueryOptions(filters, selectedEventId), [filtersKey, selectedEventId]);

  const [isFetchingMore, setFetchingMore] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const { data, loading, error, refetch, fetchMore } = useQuery(GetEventsFeedDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    variables: { options },
    ...getApolloAuthContext(authToken),
  });

  const categorySource = data?.readEventCategories ?? [];
  const eventSource = data?.readEventOccurrences ?? [];

  const categories = useMemo(() => sortCategoriesByInterest(categorySource), [categorySource]);
  const events = useMemo(() => eventSource as MobileEventOccurrence[], [eventSource]);
  const totalEvents = data?.readEventOccurrencesCount ?? events.length;
  const hasMore = events.length < totalEvents;

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMoreRef.current) {
      return;
    }

    isFetchingMoreRef.current = true;
    setFetchingMore(true);

    try {
      await fetchMore({
        variables: {
          options: {
            ...options,
            pagination: {
              limit: EVENTS_PAGE_SIZE,
              skip: events.length,
            },
          },
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return previousResult;
          }

          const seenOccurrenceIds = new Set(
            previousResult.readEventOccurrences.map((occurrence: MobileEventOccurrence) => occurrence.occurrenceId),
          );
          const mergedOccurrences = [
            ...previousResult.readEventOccurrences,
            ...fetchMoreResult.readEventOccurrences.filter(
              (occurrence: MobileEventOccurrence) => !seenOccurrenceIds.has(occurrence.occurrenceId),
            ),
          ];

          return {
            ...fetchMoreResult,
            readEventOccurrences: mergedOccurrences,
          };
        },
      });
    } finally {
      isFetchingMoreRef.current = false;
      setFetchingMore(false);
    }
  }, [events.length, fetchMore, hasMore, options]);

  return {
    categories,
    error,
    events,
    hasMore,
    isFetchingMore,
    loadMore,
    loading,
    refetch,
    totalEvents,
  };
}
