import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { MobileEventsFeedDocument, MobileHomeDiscoveryDocument } from '@data/graphql/query/Discovery/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { SortOrderInput } from '@data/graphql/types/graphql';
import {
  buildDefaultOccurrenceDateRange,
  dedupeOccurrencesBySeries,
  sortCategoriesByInterest,
  sortOrganizationsByFollowers,
} from '@/features/discovery/lib/mobileFormatters';

export function useMobileHomeDiscovery() {
  const { data, loading, error, refetch } = useQuery(MobileHomeDiscoveryDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      upcomingOptions: {
        dateRange: buildDefaultOccurrenceDateRange(),
        sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
        pagination: { limit: 10 },
      },
      trendingOptions: {
        dateRange: buildDefaultOccurrenceDateRange(),
        sort: [{ field: 'rsvpCount', order: SortOrderInput.Desc }],
        pagination: { limit: 18 },
      },
    },
  });

  const upcomingSource = data?.upcoming ?? [];
  const trendingSource = data?.trending ?? [];
  const categorySource = data?.readEventCategories ?? [];
  const organizationSource = data?.readOrganizations ?? [];

  const upcomingEvents = useMemo(() => dedupeOccurrencesBySeries(upcomingSource, 6), [upcomingSource]);
  const trendingEvents = useMemo(() => dedupeOccurrencesBySeries(trendingSource, 6), [trendingSource]);
  const categories = useMemo(() => sortCategoriesByInterest(categorySource).slice(0, 8), [categorySource]);
  const organizations = useMemo(
    () => sortOrganizationsByFollowers(organizationSource).slice(0, 5),
    [organizationSource],
  );

  return {
    categories,
    error,
    heroEvent: upcomingEvents[0] ?? trendingEvents[0] ?? null,
    loading,
    organizations,
    refetch,
    trendingEvents,
    upcomingEvents,
  };
}

export function useMobileEventsFeed() {
  const { data, loading, error, refetch } = useQuery(MobileEventsFeedDocument, {
    fetchPolicy: 'cache-and-network',
    variables: {
      options: {
        dateRange: buildDefaultOccurrenceDateRange(),
        sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
        pagination: { limit: 40 },
      },
    },
  });

  const categorySource = data?.readEventCategories ?? [];
  const eventSource = data?.readEventOccurrences ?? [];

  const categories = useMemo(() => sortCategoriesByInterest(categorySource).slice(0, 12), [categorySource]);

  const events = useMemo(() => eventSource ?? ([] as MobileEventOccurrence[]), [eventSource]);

  return {
    categories,
    error,
    events,
    loading,
    refetch,
    totalEvents: data?.readEventsCount ?? events.length,
  };
}
