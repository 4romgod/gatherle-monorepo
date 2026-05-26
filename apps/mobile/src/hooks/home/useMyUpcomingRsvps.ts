import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { useMyEventOccurrenceRsvps } from '@/hooks/events/useMyEventOccurrenceRsvps';

export function useMyUpcomingRsvps(authToken?: string | null) {
  const { error, loading, refetch, upcomingEvents } = useMyEventOccurrenceRsvps(authToken, false);

  const upcomingRsvps = upcomingEvents.slice(0, 3).map<MobileEventOccurrence>((occurrence) => ({
    ...occurrence,
    participants: undefined,
  }));

  return { error, loading, refetch, upcomingRsvps };
}
