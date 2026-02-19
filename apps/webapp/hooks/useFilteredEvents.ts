import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  FilterInput,
  FilterOperatorInput,
  GetAllEventsDocument,
  GetAllEventsQuery,
  GetAllEventsQueryVariables,
  LocationFilterInput,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { EventFilters, LocationFilter } from '@/components/events/filters/EventFilterContext';
import { DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import { getAuthHeader } from '@/lib/utils/auth';

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

export const useFilteredEvents = (filters: EventFilters, initialEvents: EventPreview[], token?: string | null) => {
  const [events, setEvents] = useState<EventPreview[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const filterInputs = useMemo(() => buildFilterInputs(filters), [filters.categories, filters.statuses]);
  const dateFilterParams = useMemo(() => buildDateFilterParams(filters), [filters.dateRange]);
  const locationFilter = useMemo(() => buildLocationFilter(filters.location), [filters.location]);
  const [loadEvents, { loading }] = useLazyQuery<GetAllEventsQuery, GetAllEventsQueryVariables>(GetAllEventsDocument);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const hasDateFilter = !!dateFilterParams.dateFilterOption || !!dateFilterParams.customDate;
    const hasLocationFilter = !!locationFilter;
    if (filterInputs.length === 0 && !hasDateFilter && !hasLocationFilter) {
      setEvents(initialEvents);
      setError(null);
      return;
    }

    let isCurrent = true;

    // Clear previous error when starting new request
    setError(null);

    loadEvents({
      variables: {
        options: {
          filters: filterInputs.length > 0 ? filterInputs : undefined,
          dateFilterOption: dateFilterParams.dateFilterOption as any,
          customDate: dateFilterParams.customDate, // GraphQL DateTimeISO scalar accepts ISO 8601 string
          location: locationFilter,
        },
      },
      fetchPolicy: 'network-only',
      context: {
        headers: getAuthHeader(token),
      },
    })
      .then((response) => {
        if (!isCurrent) {
          return;
        }
        if (response.data?.readEvents) {
          setEvents(response.data.readEvents as EventPreview[]);
          setError(null);
        } else if (response.error) {
          console.error('GraphQL error fetching filtered events', response.error);
          setError('Failed to load filtered events. Please try again.');
        }
      })
      .catch((caughtError) => {
        if (!isCurrent) {
          return;
        }
        console.error('Error fetching filtered events', caughtError);
        setError('Unable to apply filters. Please check your connection and try again.');
      });

    return () => {
      isCurrent = false;
    };
  }, [filterInputs, dateFilterParams, locationFilter, initialEvents, loadEvents]);

  return {
    events,
    loading,
    error,
    hasFilterInputs:
      filterInputs.length > 0 ||
      !!dateFilterParams.dateFilterOption ||
      !!dateFilterParams.customDate ||
      !!locationFilter,
  };
};
