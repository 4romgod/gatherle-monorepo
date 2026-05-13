import { useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { MobileEventsFeedDocument } from '@data/graphql/query/Discovery/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import {
  DateFilterOption,
  FilterInput,
  FilterOperatorInput,
  LocationFilterInput,
  SortOrderInput,
} from '@data/graphql/types/graphql';
import { buildDefaultOccurrenceDateRange, sortCategoriesByInterest } from '@/lib/events/formatters';
import type { EventsFilterState } from './useEventsFilters';
// Stable default date range — computed once at module load so Apollo cache keys
// don't drift on every render from micro-second differences in new Date().
// The API requires at least one of customDate, dateFilterOption, or a full dateRange,
// so this is always sent as a fallback when no other date filter is active.
const stableDefaultDateRange = buildDefaultOccurrenceDateRange();

function buildQueryOptions(filters: EventsFilterState) {
  const filterInputs: FilterInput[] = [];

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
    pagination: { limit: 40 },
  };
}

export function useDraftResultCount(draft: EventsFilterState, skip: boolean): number {
  const draftKey = JSON.stringify(draft);
  const options = useMemo(() => buildQueryOptions(draft), [draftKey]);

  const { data } = useQuery(MobileEventsFeedDocument, {
    fetchPolicy: 'cache-and-network',
    skip,
    variables: { options },
  });

  return (data?.readEventOccurrences ?? []).length;
}

export function useFilteredMobileEvents(filters: EventsFilterState) {
  // Serialize filters to a stable string key so useMemo reliably detects
  // any content change regardless of object reference identity.
  const filtersKey = JSON.stringify(filters);
  const options = useMemo(() => buildQueryOptions(filters), [filtersKey]);

  const { data, loading, error, refetch } = useQuery(MobileEventsFeedDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    variables: { options },
  });

  const categorySource = data?.readEventCategories ?? [];
  const eventSource = data?.readEventOccurrences ?? [];

  const categories = useMemo(() => sortCategoriesByInterest(categorySource), [categorySource]);
  const events = useMemo(() => eventSource as MobileEventOccurrence[], [eventSource]);

  return {
    categories,
    error,
    events,
    loading,
    refetch,
    totalEvents: events.length,
  };
}
