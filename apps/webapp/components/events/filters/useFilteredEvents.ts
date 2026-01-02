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
import { EventFilters } from './event-filter-context';

const buildFilterInputs = (filters: EventFilters): FilterInput[] => {
  const inputs: FilterInput[] = [];

  if (filters.categories.length > 0) {
    inputs.push({
      field: 'eventCategoryList.name',
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

export const useFilteredEvents = (filters: EventFilters, initialEvents: EventPreview[]) => {
  const [events, setEvents] = useState<EventPreview[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const filterInputs = useMemo(() => buildFilterInputs(filters), [filters.categories, filters.statuses]);
  const [loadEvents, { loading }] = useLazyQuery<GetAllEventsQuery, GetAllEventsQueryVariables>(GetAllEventsDocument);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    if (filterInputs.length === 0) {
      setEvents(initialEvents);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    let isCurrent = true;

    // Clear previous error when starting new request
    setError(null);

    loadEvents({
      variables: { options: { filters: filterInputs } },
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
  }, [filterInputs, initialEvents, loadEvents]);

  return { events, loading, error, hasFilterInputs: filterInputs.length > 0 };
};
