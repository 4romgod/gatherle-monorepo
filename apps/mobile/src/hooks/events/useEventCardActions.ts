import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  CancelEventOccurrenceParticipantDocument,
  FollowDocument,
  UnfollowDocument,
  UpsertEventOccurrenceParticipantDocument,
} from '@data/graphql/mutation';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { FollowTargetType, ParticipantStatus } from '@data/graphql/types/graphql';
import { isUpcomingEventTime } from '@/lib/events/eventCollections';
import { getOccurrenceParticipantCount, getOccurrenceParticipantStatusCounts } from '@/lib/events/formatters';
import { getApolloAuthContext } from '@/lib/auth';

export function useEventCardActions(occurrence: MobileEventOccurrence, authToken: string | null) {
  const eventId = occurrence.eventSeries?.eventId ?? occurrence.eventSeriesId;
  const occurrenceId = occurrence.occurrenceId;
  const queryOptions = getApolloAuthContext(authToken);
  const initialSaved = occurrence.eventSeries?.isSavedByMe ?? false;
  const initialRsvpStatus = occurrence.myRsvp?.status ?? null;
  const initialParticipantCount = getOccurrenceParticipantCount(occurrence) || occurrence.rsvpCount || 0;
  const initialParticipantBreakdown = getOccurrenceParticipantStatusCounts(occurrence);
  const rsvpClosed = !isUpcomingEventTime(occurrence.startAt, occurrence.endAt);

  const [isSaved, setIsSaved] = useState(initialSaved);
  const [goingCount, setGoingCount] = useState(initialParticipantBreakdown.going);
  const [interestedCount, setInterestedCount] = useState(initialParticipantBreakdown.interested);
  const [participantCount, setParticipantCount] = useState(initialParticipantCount);
  const [rsvpStatus, setRsvpStatus] = useState<ParticipantStatus | null>(initialRsvpStatus);

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    setRsvpStatus(initialRsvpStatus);
  }, [initialRsvpStatus]);

  useEffect(() => {
    setParticipantCount(initialParticipantCount);
  }, [initialParticipantCount]);

  useEffect(() => {
    setGoingCount(initialParticipantBreakdown.going);
    setInterestedCount(initialParticipantBreakdown.interested);
  }, [initialParticipantBreakdown.going, initialParticipantBreakdown.interested]);

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

  const applyParticipantCountDelta = (nextStatus: ParticipantStatus | null) => {
    setParticipantCount((currentCount) => {
      if (!rsvpStatus && nextStatus) {
        return currentCount + 1;
      }

      if (rsvpStatus && !nextStatus) {
        return Math.max(0, currentCount - 1);
      }

      return currentCount;
    });
  };

  const applyParticipantBreakdownDelta = (nextStatus: ParticipantStatus | null) => {
    const previousStatus = rsvpStatus;

    setGoingCount((currentCount) => {
      let nextCount = currentCount;

      if (previousStatus === ParticipantStatus.Going || previousStatus === ParticipantStatus.CheckedIn) {
        nextCount -= 1;
      }

      if (nextStatus === ParticipantStatus.Going || nextStatus === ParticipantStatus.CheckedIn) {
        nextCount += 1;
      }

      return Math.max(0, nextCount);
    });

    setInterestedCount((currentCount) => {
      let nextCount = currentCount;

      if (previousStatus === ParticipantStatus.Interested) {
        nextCount -= 1;
      }

      if (nextStatus === ParticipantStatus.Interested) {
        nextCount += 1;
      }

      return Math.max(0, nextCount);
    });
  };

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

    if (rsvpClosed) {
      throw new Error('This event has already ended. RSVPs are closed.');
    }

    if (status === null) {
      await cancelRsvpMutation({
        variables: {
          input: {
            occurrenceId,
          },
        },
      });
      applyParticipantCountDelta(null);
      applyParticipantBreakdownDelta(null);
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
    applyParticipantCountDelta(status);
    applyParticipantBreakdownDelta(status);
    setRsvpStatus(status);
    return status;
  };

  const saveLoading = useMemo(() => followLoading || unfollowLoading, [followLoading, unfollowLoading]);
  const rsvpLoading = useMemo(() => upsertRsvpLoading || cancelRsvpLoading, [cancelRsvpLoading, upsertRsvpLoading]);
  const loading = useMemo(() => saveLoading || rsvpLoading, [rsvpLoading, saveLoading]);

  return {
    cancelRsvp: async () => updateRsvp(null),
    goingToEvent: async () => updateRsvp(ParticipantStatus.Going),
    interestedInEvent: async () => updateRsvp(ParticipantStatus.Interested),
    isSaved,
    loading,
    goingCount,
    interestedCount,
    participantCount,
    rsvpLoading,
    rsvpStatus,
    saveLoading,
    toggleSave,
  };
}
