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
  const filterInputs = useMemo(() => buildFilterInputs(filters), [filters.categories, filters.statuses]);
  const [loadEvents, { loading }] = useLazyQuery<GetAllEventsQuery, GetAllEventsQueryVariables>(GetAllEventsDocument);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    if (filterInputs.length === 0) {
      setEvents(initialEvents);
      return;
    }

    let isCurrent = true;

    loadEvents({
      variables: { options: { filters: filterInputs } },
      fetchPolicy: 'network-only',
    })
      .then(response => {
        if (!isCurrent) {
          return;
        }
        if (response.data?.readEvents) {
          setEvents(response.data.readEvents as EventPreview[]);
        }
      })
      .catch(error => {
        if (isCurrent) {
          console.error('Error fetching filtered events', error);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [filterInputs, initialEvents, loadEvents]);

  return { events, loading, hasFilterInputs: filterInputs.length > 0 };
};
