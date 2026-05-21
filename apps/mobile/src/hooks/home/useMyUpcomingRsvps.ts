import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetMyEventOccurrenceRsvpsDocument } from '@data/graphql/query/EventOccurrenceParticipant/query';
import type { MobileRsvpOccurrence } from '@data/graphql/query/EventOccurrenceParticipant/types';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { getApolloAuthContext } from '@/lib/auth';

export function useMyUpcomingRsvps(authToken?: string | null) {
  const { data, loading, error, refetch } = useQuery(GetMyEventOccurrenceRsvpsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { includeCancelled: false },
    skip: !authToken,
    ...getApolloAuthContext(authToken),
  });

  const upcomingRsvps = useMemo(() => {
    const now = new Date();
    return (data?.myEventOccurrenceRsvps ?? [])
      .map((rsvp) => rsvp.occurrence)
      .filter((occ): occ is MobileRsvpOccurrence => {
        if (!occ) return false;
        const comparisonDate = occ.endAt ?? occ.startAt;
        return new Date(comparisonDate).getTime() >= now.getTime();
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3) as unknown as MobileEventOccurrence[];
  }, [data]);

  return { error, loading, refetch, upcomingRsvps };
}
