import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  FilterInput,
  FilterOperatorInput,
  GetAllEventsDocument,
  GetAllEventsQuery,
  GetAllEventsQueryVariables,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { EventFilters } from '@/components/events/filters/event-filter-context';
import { DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';

const buildFilterInputs = (filters: EventFilters): FilterInput[] => {
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

const buildDateFilterParams = (filters: EventFilters): { dateFilterOption?: string; customDate?: string } => {
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

export const useFilteredEvents = (filters: EventFilters, initialEvents: EventPreview[]) => {
  const [events, setEvents] = useState<EventPreview[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const filterInputs = useMemo(() => buildFilterInputs(filters), [filters.categories, filters.statuses]);
  const dateFilterParams = useMemo(() => buildDateFilterParams(filters), [filters.dateRange]);
  const [loadEvents, { loading }] = useLazyQuery<GetAllEventsQuery, GetAllEventsQueryVariables>(GetAllEventsDocument);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const hasDateFilter = !!dateFilterParams.dateFilterOption || !!dateFilterParams.customDate;
    if (filterInputs.length === 0 && !hasDateFilter) {
      setEvents(initialEvents);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    let isCurrent = true;

    // Clear previous error when starting new request
    setError(null);

    loadEvents({
      variables: {
        options: {
          filters: filterInputs.length > 0 ? filterInputs : undefined,
          dateFilterOption: dateFilterParams.dateFilterOption as any,
          customDate: dateFilterParams.customDate, // GraphQL DateTimeISO scalar accepts ISO 8601 string
        },
      },
      fetchPolicy: 'network-only',
      context: {
        fetchOptions: {
          signal: abortController.signal,
        },
      },
    })
      .then(response => {
        if (!isCurrent) {
          return;
        }
        if (response.data?.readEvents) {
          setEvents(response.data.readEvents as EventPreview[]);
          setError(null);
        } else if (response.error) {
          setError('Failed to load filtered events. Please try again.');
        }
      })
      .catch(error => {
        if (isCurrent && error.name !== 'AbortError') {
          console.error('Error fetching filtered events', error);
          setError('Unable to apply filters. Please check your connection and try again.');
        }
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [filterInputs, dateFilterParams, initialEvents, loadEvents]);

  return {
    events,
    loading,
    error,
    hasFilterInputs: filterInputs.length > 0 || !!dateFilterParams.dateFilterOption || !!dateFilterParams.customDate,
  };
};
