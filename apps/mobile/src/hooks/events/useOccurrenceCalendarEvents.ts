import { useApolloClient } from '@apollo/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetEventsFeedDocument } from '@data/graphql/query/Discovery/query';
import type { MobileEventCategory, MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { getApolloAuthContext } from '@/lib/auth';
import { sortCategoriesByInterest } from '@/lib/events/formatters';
import type { EventsFilterState } from './useEventsFilters';
import { buildMobileEventsQueryOptions, type MobileOccurrenceDateRange } from './useFilteredMobileEvents';

const CALENDAR_QUERY_PAGE_SIZE = 50;

type UseOccurrenceCalendarEventsResult = {
  categories: MobileEventCategory[];
  events: MobileEventOccurrence[];
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
  totalEvents: number;
};

export function useOccurrenceCalendarEvents(
  filters: EventsFilterState,
  authToken: string | null | undefined,
  dateRange: MobileOccurrenceDateRange,
  selectedEventId?: string,
  enabled: boolean = true,
): UseOccurrenceCalendarEventsResult {
  const client = useApolloClient();
  const [events, setEvents] = useState<MobileEventOccurrence[]>([]);
  const [categories, setCategories] = useState<MobileEventCategory[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  const activeRequestIdRef = useRef(0);
  const lastAutoRequestKeyRef = useRef<string | null>(null);

  const filtersKey = JSON.stringify(filters);
  const queryOptions = useMemo(
    () =>
      buildMobileEventsQueryOptions({
        filters,
        selectedEventId,
        dateRangeOverride: dateRange,
        pagination: { limit: CALENDAR_QUERY_PAGE_SIZE, skip: 0 },
        ignoreStoredDateOption: true,
      }),
    [dateRange.endDate, dateRange.startDate, filtersKey, selectedEventId],
  );
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        authToken: authToken ?? null,
        enabled,
        endDate: dateRange.endDate,
        filtersKey,
        selectedEventId: selectedEventId ?? null,
        startDate: dateRange.startDate,
      }),
    [authToken, dateRange.endDate, dateRange.startDate, enabled, filtersKey, selectedEventId],
  );

  const loadCalendarOccurrences = useCallback(
    async (mode: 'auto' | 'manual' = 'manual') => {
      if (mode === 'auto' && lastAutoRequestKeyRef.current === requestKey) {
        return;
      }

      if (mode === 'auto') {
        lastAutoRequestKeyRef.current = requestKey;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      if (!enabled) {
        if (activeRequestIdRef.current === requestId) {
          setEvents([]);
          setCategories([]);
          setError(null);
          setLoading(false);
          setTotalEvents(0);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let nextCategories: MobileEventCategory[] = [];
        const nextEvents: MobileEventOccurrence[] = [];
        const seenOccurrenceIds = new Set<string>();
        let nextTotalCount = 0;
        let skip = 0;

        while (true) {
          const response = await client.query({
            query: GetEventsFeedDocument,
            variables: {
              options: {
                ...queryOptions,
                pagination: { limit: CALENDAR_QUERY_PAGE_SIZE, skip },
              },
            },
            fetchPolicy: 'network-only',
            ...getApolloAuthContext(authToken),
          });

          const page = (response.data?.readEventOccurrences ?? []) as MobileEventOccurrence[];
          const pageCategories = sortCategoriesByInterest(
            (response.data?.readEventCategories ?? []) as MobileEventCategory[],
          );
          nextTotalCount = response.data?.readEventOccurrencesCount ?? page.length;

          if (skip === 0) {
            nextCategories = pageCategories;
          }

          for (const occurrence of page) {
            if (!seenOccurrenceIds.has(occurrence.occurrenceId)) {
              seenOccurrenceIds.add(occurrence.occurrenceId);
              nextEvents.push(occurrence);
            }
          }

          if (page.length < CALENDAR_QUERY_PAGE_SIZE || nextEvents.length >= nextTotalCount) {
            break;
          }

          skip += CALENDAR_QUERY_PAGE_SIZE;
        }

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        setCategories(nextCategories);
        setEvents(nextEvents);
        setTotalEvents(nextTotalCount);
        setError(null);
      } catch (caughtError) {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        const resolvedError =
          caughtError instanceof Error ? caughtError : new Error('Unable to load the calendar right now.');
        console.error('Failed to load occurrence calendar events', resolvedError);
        setCategories([]);
        setEvents([]);
        setTotalEvents(0);
        setError(resolvedError);
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [authToken, client, enabled, queryOptions, requestKey],
  );

  useEffect(() => {
    void loadCalendarOccurrences('auto');
  }, [loadCalendarOccurrences, requestKey]);

  return { categories, events, error, loading, refetch: loadCalendarOccurrences, totalEvents };
}
