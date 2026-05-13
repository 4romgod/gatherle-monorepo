import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CancelEventOccurrenceParticipantDocument,
  FollowDocument,
  UnfollowDocument,
  UpsertEventOccurrenceParticipantDocument,
} from '@data/graphql/mutation';
import { GetMyEventOccurrenceRsvpStatusDocument, IsEventSavedDocument } from '@data/graphql/query';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { FollowTargetType, ParticipantStatus } from '@data/graphql/types/graphql';
import { getApolloAuthContext } from '@/lib/auth';

export function useEventDetailActions(occurrence: MobileEventOccurrence, authToken: string | null) {
  const eventId = occurrence.eventSeries?.eventId ?? occurrence.eventSeriesId;
  const occurrenceId = occurrence.occurrenceId;
  const initialSaved = occurrence.eventSeries?.isSavedByMe ?? false;
  const initialRsvpStatus = occurrence.myRsvp?.status ?? null;
  const queryOptions = getApolloAuthContext(authToken);

  const {
    data: savedData,
    loading: savedLoading,
    refetch: refetchSaved,
  } = useQuery(IsEventSavedDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !authToken || !eventId,
    variables: {
      eventId,
    },
    ...queryOptions,
  });

  const {
    data: rsvpData,
    loading: rsvpQueryLoading,
    refetch: refetchRsvp,
  } = useQuery(GetMyEventOccurrenceRsvpStatusDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !authToken || !occurrenceId,
    variables: {
      occurrenceId,
    },
    ...queryOptions,
  });

  const [isSaved, setIsSaved] = useState(initialSaved);
  const [rsvpStatus, setRsvpStatus] = useState<ParticipantStatus | null>(initialRsvpStatus);

  useEffect(() => {
    setIsSaved(savedData?.isEventSaved ?? initialSaved);
  }, [initialSaved, savedData?.isEventSaved]);

  useEffect(() => {
    setRsvpStatus(rsvpData?.myEventOccurrenceRsvpStatus?.status ?? initialRsvpStatus);
  }, [initialRsvpStatus, rsvpData?.myEventOccurrenceRsvpStatus?.status]);

  const [followMutation, { loading: followLoading }] = useMutation(FollowDocument, queryOptions);
  const [unfollowMutation, { loading: unfollowLoading }] = useMutation(UnfollowDocument, queryOptions);
  const [upsertRsvpMutation, { loading: upsertRsvpLoading }] = useMutation(
    UpsertEventOccurrenceParticipantDocument,
    queryOptions,
  );
  const [cancelRsvpMutation, { loading: cancelRsvpLoading }] = useMutation(
    CancelEventOccurrenceParticipantDocument,
    queryOptions,
  );

  const toggleSave = async () => {
    if (!authToken || !eventId) {
      throw new Error('Authentication is required to save this event.');
    }

    if (isSaved) {
      await unfollowMutation({
        variables: {
          targetId: eventId,
          targetType: FollowTargetType.EventSeries,
        },
      });
      setIsSaved(false);
      return false;
    }

    await followMutation({
      variables: {
        input: {
          targetId: eventId,
          targetType: FollowTargetType.EventSeries,
        },
      },
    });
    setIsSaved(true);
    return true;
  };

  const updateRsvp = async (status: ParticipantStatus | null) => {
    if (!authToken || !occurrenceId) {
      throw new Error('Authentication is required to RSVP to this event.');
    }

    if (status === null) {
      await cancelRsvpMutation({
        variables: {
          input: {
            occurrenceId,
          },
        },
      });
      setRsvpStatus(null);
      return null;
    }

    await upsertRsvpMutation({
      variables: {
        input: {
          occurrenceId,
          quantity: 1,
          status,
        },
      },
    });
    setRsvpStatus(status);
    return status;
  };

  const goingToEvent = async () => updateRsvp(ParticipantStatus.Going);
  const interestedInEvent = async () => updateRsvp(ParticipantStatus.Interested);
  const cancelRsvp = async () => updateRsvp(null);

  const refreshEngagement = async () => {
    await Promise.all([refetchSaved(), refetchRsvp()]);
  };

  const loading = useMemo(
    () =>
      savedLoading || rsvpQueryLoading || followLoading || unfollowLoading || upsertRsvpLoading || cancelRsvpLoading,
    [cancelRsvpLoading, followLoading, rsvpQueryLoading, savedLoading, unfollowLoading, upsertRsvpLoading],
  );

  return {
    eventId,
    cancelRsvp,
    goingToEvent,
    isSaved,
    isGoing: rsvpStatus === ParticipantStatus.Going,
    isInterested: rsvpStatus === ParticipantStatus.Interested,
    loading,
    refreshEngagement,
    rsvpStatus,
    interestedInEvent,
    toggleSave,
    updateRsvp,
  };
}
