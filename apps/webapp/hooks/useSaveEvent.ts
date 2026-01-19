'use client';

import { useMutation, useQuery } from '@apollo/client';
import { FollowDocument, UnfollowDocument, GetSavedEventsDocument, IsEventSavedDocument } from '@/data/graphql/query';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';

/**
 * Hook to save/unsave events (bookmark functionality).
 * Uses the Follow system with targetType = Event.
 */
export function useSaveEvent() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [saveMutation, { loading: saveLoading }] = useMutation(FollowDocument, {
    context: {
      headers: getAuthHeader(token),
    },
  });

  const [unsaveMutation, { loading: unsaveLoading }] = useMutation(UnfollowDocument, {
    context: {
      headers: getAuthHeader(token),
    },
  });

  /**
   * Save an event (bookmark it for later).
   */
  const saveEvent = async (eventId: string) => {
    return saveMutation({
      variables: {
        input: {
          targetType: FollowTargetType.Event,
          targetId: eventId,
        },
      },
    });
  };

  /**
   * Unsave an event (remove bookmark).
   */
  const unsaveEvent = async (eventId: string) => {
    return unsaveMutation({
      variables: {
        targetType: FollowTargetType.Event,
        targetId: eventId,
      },
    });
  };

  /**
   * Toggle save state for an event.
   */
  const toggleSave = async (eventId: string, isSaved: boolean) => {
    if (isSaved) {
      return unsaveEvent(eventId);
    }
    return saveEvent(eventId);
  };

  return {
    saveEvent,
    unsaveEvent,
    toggleSave,
    saveLoading,
    unsaveLoading,
    isLoading: saveLoading || unsaveLoading,
  };
}

/**
 * Hook to get all saved events for the current user.
 */
export function useSavedEvents() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetSavedEventsDocument, {
    skip: !token,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    savedEvents: data?.readSavedEvents ?? [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to check if a specific event is saved by the current user.
 */
export function useIsEventSaved(eventId: string) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(IsEventSavedDocument, {
    variables: { eventId },
    skip: !token || !eventId,
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  return {
    isSaved: data?.isEventSaved ?? false,
    loading,
    error,
    refetch,
  };
}
