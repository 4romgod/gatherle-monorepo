'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  UpsertEventParticipantDocument,
  CancelEventParticipantDocument,
  GetMyRsvpStatusDocument,
  GetMyRsvpsDocument,
  GetEventParticipantsDocument,
  UpsertEventOccurrenceParticipantDocument,
  CancelEventOccurrenceParticipantDocument,
  GetMyEventOccurrenceRsvpStatusDocument,
  GetEventOccurrenceParticipantsDocument,
} from '@/data/graphql/query';
import { ParticipantStatus, ParticipantVisibility } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';

export interface RsvpOptions {
  status?: ParticipantStatus;
  quantity?: number;
  sharedVisibility?: ParticipantVisibility;
}

/**
 * Hook to manage RSVP functionality for events.
 */
export function useRsvp() {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;

  const [rsvpMutation, { loading: rsvpLoading }] = useMutation(UpsertEventParticipantDocument, {
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [cancelMutation, { loading: cancelLoading }] = useMutation(CancelEventParticipantDocument, {
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [occurrenceRsvpMutation, { loading: occurrenceRsvpLoading }] = useMutation(
    UpsertEventOccurrenceParticipantDocument,
    {
      context: {
        headers: getAuthHeader(token),
      },
    },
  );

  const [occurrenceCancelMutation, { loading: occurrenceCancelLoading }] = useMutation(
    CancelEventOccurrenceParticipantDocument,
    {
      context: {
        headers: getAuthHeader(token),
      },
    },
  );

  /**
   * RSVP to an event with the specified status.
   * Default status is "Going".
   */
  const rsvpToEvent = async (eventId: string, options: RsvpOptions = {}, occurrenceId?: string) => {
    if (!userId) {
      throw new Error('User must be logged in to RSVP');
    }

    const { status = ParticipantStatus.Going, quantity = 1, sharedVisibility } = options;

    if (occurrenceId) {
      return occurrenceRsvpMutation({
        variables: {
          input: {
            occurrenceId,
            status,
            quantity,
            sharedVisibility,
          },
        },
      });
    }

    return rsvpMutation({
      variables: {
        input: {
          eventId,
          userId,
          status,
          quantity,
          sharedVisibility,
        },
      },
    });
  };

  /**
   * Mark as "Going" to an event.
   */
  const goingToEvent = async (eventId: string, quantity = 1, occurrenceId?: string) => {
    return rsvpToEvent(eventId, { status: ParticipantStatus.Going, quantity }, occurrenceId);
  };

  /**
   * Mark as "Interested" in an event.
   */
  const interestedInEvent = async (eventId: string, occurrenceId?: string) => {
    return rsvpToEvent(eventId, { status: ParticipantStatus.Interested }, occurrenceId);
  };

  /**
   * Cancel RSVP to an event.
   */
  const cancelRsvp = async (eventId: string, occurrenceId?: string) => {
    if (!userId) {
      throw new Error('User must be logged in to cancel RSVP');
    }

    if (occurrenceId) {
      return occurrenceCancelMutation({
        variables: {
          input: {
            occurrenceId,
          },
        },
      });
    }

    return cancelMutation({
      variables: {
        input: {
          eventId,
          userId,
        },
      },
    });
  };

  return {
    rsvpToEvent,
    goingToEvent,
    interestedInEvent,
    cancelRsvp,
    rsvpLoading,
    cancelLoading,
    isLoading: rsvpLoading || cancelLoading || occurrenceRsvpLoading || occurrenceCancelLoading,
    isAuthenticated: !!userId,
  };
}

/**
 * Hook to get the current user's RSVP status for a specific event.
 */
export function useMyRsvpStatus(eventId: string, occurrenceId?: string) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const seriesQuery = useQuery(GetMyRsvpStatusDocument, {
    variables: { eventId },
    skip: !token || !eventId || !!occurrenceId,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const occurrenceQuery = useQuery(GetMyEventOccurrenceRsvpStatusDocument, {
    variables: { occurrenceId: occurrenceId ?? '' },
    skip: !token || !occurrenceId,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    rsvp: occurrenceId
      ? (occurrenceQuery.data?.myEventOccurrenceRsvpStatus ?? null)
      : (seriesQuery.data?.myRsvpStatus ?? null),
    status: occurrenceId
      ? (occurrenceQuery.data?.myEventOccurrenceRsvpStatus?.status ?? null)
      : (seriesQuery.data?.myRsvpStatus?.status ?? null),
    loading: seriesQuery.loading || occurrenceQuery.loading,
    error: occurrenceQuery.error ?? seriesQuery.error,
    refetch: occurrenceId ? occurrenceQuery.refetch : seriesQuery.refetch,
  };
}

/**
 * Hook to get all events the current user has RSVP'd to.
 */
export function useMyRsvps(includeCancelled = false) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetMyRsvpsDocument, {
    variables: { includeCancelled },
    skip: !token,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    rsvps: data?.myRsvps ?? [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to get all participants for a specific event.
 */
export function useEventParticipants(eventId: string, occurrenceId?: string) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const seriesQuery = useQuery(GetEventParticipantsDocument, {
    variables: { eventId },
    skip: !eventId || !!occurrenceId,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const occurrenceQuery = useQuery(GetEventOccurrenceParticipantsDocument, {
    variables: { occurrenceId: occurrenceId ?? '' },
    skip: !occurrenceId,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    participants: occurrenceId
      ? (occurrenceQuery.data?.readEventOccurrenceParticipants ?? [])
      : (seriesQuery.data?.readEventParticipants ?? []),
    loading: seriesQuery.loading || occurrenceQuery.loading,
    error: occurrenceQuery.error ?? seriesQuery.error,
    refetch: occurrenceId ? occurrenceQuery.refetch : seriesQuery.refetch,
  };
}
