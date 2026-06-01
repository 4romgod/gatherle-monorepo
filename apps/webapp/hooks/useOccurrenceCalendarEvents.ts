'use client';

import { useApolloClient } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import type { SortInput } from '@/data/graphql/types/graphql';
import { GetEventOccurrencesDocument } from '@/data/graphql/query';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import type { EventFilters } from '@/components/events/filters/EventFilterContext';
import { getAuthHeader } from '@/lib/utils/auth';
import { logger } from '@/lib/utils';
import type { OccurrenceCalendarRange } from '@/components/events/calendar/calendar-utils';
import { buildOccurrenceQueryOptions } from '@/hooks/useFilteredEvents';

const CALENDAR_QUERY_PAGE_SIZE = 50;
const EMPTY_CALENDAR_EVENTS: EventOccurrencePreview[] = [];

interface UseOccurrenceCalendarEventsResult {
  events: EventOccurrencePreview[];
  loading: boolean;
  error: string | null;
  totalEvents: number;
}

export function useOccurrenceCalendarEvents(
  filters: EventFilters,
  token: string | null | undefined,
  sort: SortInput[] | undefined,
  dateRange: OccurrenceCalendarRange,
  selectedEventId?: string,
  enabled: boolean = true,
): UseOccurrenceCalendarEventsResult {
  const client = useApolloClient();
  const [events, setEvents] = useState<EventOccurrencePreview[]>(EMPTY_CALENDAR_EVENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalEvents, setTotalEvents] = useState(0);

  const queryOptions = useMemo(
    () =>
      buildOccurrenceQueryOptions({
        filters,
        selectedEventId,
        sort,
        dateRangeOverride: dateRange,
        pagination: { limit: CALENDAR_QUERY_PAGE_SIZE, skip: 0 },
      }),
    [dateRange, filters, selectedEventId, sort],
  );

  useEffect(() => {
    if (!enabled) {
      setEvents((prev) => (prev.length === 0 ? prev : EMPTY_CALENDAR_EVENTS));
      setTotalEvents((prev) => (prev === 0 ? prev : 0));
      setLoading((prev) => (prev ? false : prev));
      setError((prev) => (prev === null ? prev : null));
      return;
    }

    let isCurrent = true;

    const loadCalendarOccurrences = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextEvents: EventOccurrencePreview[] = [];
        const seenOccurrenceIds = new Set<string>();
        let totalCount = 0;
        let skip = 0;

        while (true) {
          const response = await client.query({
            query: GetEventOccurrencesDocument,
            variables: {
              options: {
                ...queryOptions,
                pagination: { limit: CALENDAR_QUERY_PAGE_SIZE, skip },
              },
            },
            context: { headers: getAuthHeader(token) },
            fetchPolicy: 'network-only',
          });

          const page = (response.data?.readEventOccurrences ?? []) as EventOccurrencePreview[];
          totalCount = response.data?.readEventOccurrencesCount ?? page.length;

          for (const occurrence of page) {
            if (!seenOccurrenceIds.has(occurrence.occurrenceId)) {
              seenOccurrenceIds.add(occurrence.occurrenceId);
              nextEvents.push(occurrence);
            }
          }

          if (page.length < CALENDAR_QUERY_PAGE_SIZE || nextEvents.length >= totalCount) {
            break;
          }

          skip += CALENDAR_QUERY_PAGE_SIZE;
        }

        if (!isCurrent) {
          return;
        }

        setEvents(nextEvents);
        setTotalEvents(totalCount);
        setError(null);
      } catch (caughtError) {
        if (!isCurrent) {
          return;
        }

        logger.error('Error fetching occurrence calendar events', caughtError);
        setEvents([]);
        setTotalEvents(0);
        setError('Unable to load this calendar window right now. Please try again.');
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadCalendarOccurrences();

    return () => {
      isCurrent = false;
    };
  }, [client, enabled, queryOptions, token]);

  return { events, loading, error, totalEvents };
}
