import { useMemo } from 'react';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { useMyEventOccurrenceRsvps } from '@/hooks/events/useMyEventOccurrenceRsvps';

export function useMyUpcomingRsvps(authToken?: string | null) {
  const { error, loading, refetch, upcomingEvents } = useMyEventOccurrenceRsvps(authToken, false);

  const upcomingRsvps = useMemo(() => upcomingEvents.slice(0, 3) as MobileEventOccurrence[], [upcomingEvents]);

  return { error, loading, refetch, upcomingRsvps };
}
