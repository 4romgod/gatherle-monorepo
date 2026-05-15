import { useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { EventMomentState } from '@data/graphql/types/graphql';
import { GetEventMomentsDocument } from '@data/graphql/query/EventMoment/query';
import type { MobileEventMoment } from '@data/graphql/query/EventMoment/types';
import { getApolloAuthContext } from '@/lib/auth';
import { EVENT_MOMENT_POLLING_INTERVAL_MS } from '@/lib/moments/constants';

const PENDING_STATES = new Set<EventMomentState>([EventMomentState.UploadPending, EventMomentState.Transcoding]);

export function useEventMoments(eventId: string | undefined, authToken: string | null) {
  const { data, error, loading, refetch, startPolling, stopPolling } = useQuery(GetEventMomentsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !eventId,
    variables: {
      eventId: eventId ?? '',
      limit: 50,
    },
    ...getApolloAuthContext(authToken),
  });

  const moments = useMemo<MobileEventMoment[]>(() => data?.readEventMoments.items ?? [], [data]);
  const hasPendingMoments = useMemo(() => moments.some((moment) => PENDING_STATES.has(moment.state)), [moments]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    if (hasPendingMoments) {
      startPolling(EVENT_MOMENT_POLLING_INTERVAL_MS);
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [eventId, hasPendingMoments, startPolling, stopPolling]);

  return {
    error,
    loading,
    moments,
    refetch,
  };
}
