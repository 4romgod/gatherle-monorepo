import {
  ParticipantStatus,
  type EventOccurrence,
  type EventOccurrenceParticipant,
  type EventSeriesParticipant,
} from '@gatherle/commons/types';

type CountableParticipant = Pick<EventOccurrenceParticipant | EventSeriesParticipant, 'status' | 'quantity'>;

export const ACTIVE_OCCURRENCE_RSVP_STATUSES = new Set<ParticipantStatus>([
  ParticipantStatus.Going,
  ParticipantStatus.Interested,
  ParticipantStatus.CheckedIn,
]);

export const buildMyEventOccurrenceParticipantLoadKey = (occurrenceId: string, userId: string): string =>
  JSON.stringify([occurrenceId, userId]);

export const parseOccurrenceId = (occurrenceId: string): { eventSeriesId: string; originalStartAt: Date } | null => {
  const separatorIndex = occurrenceId.indexOf('#');
  if (separatorIndex <= 0) {
    return null;
  }

  const eventSeriesId = occurrenceId.slice(0, separatorIndex);
  const originalStartAt = new Date(occurrenceId.slice(separatorIndex + 1));
  if (!eventSeriesId || Number.isNaN(originalStartAt.getTime())) {
    return null;
  }

  return { eventSeriesId, originalStartAt };
};

export const projectSeriesParticipantToOccurrenceParticipant = (
  occurrenceId: string,
  participant: EventSeriesParticipant,
  occurrence?: EventOccurrence,
): EventOccurrenceParticipant => ({
  participantId: participant.participantId,
  occurrenceId,
  userId: participant.userId,
  status: participant.status,
  quantity: participant.quantity,
  invitedBy: participant.invitedBy,
  sharedVisibility: participant.sharedVisibility,
  rsvpAt: participant.rsvpAt,
  cancelledAt: participant.cancelledAt,
  checkedInAt: participant.checkedInAt,
  ...(occurrence ? { occurrence } : {}),
  user: participant.user,
});

export const getActiveOccurrenceRsvpCountContribution = (participant?: CountableParticipant | null): number => {
  if (!participant || !ACTIVE_OCCURRENCE_RSVP_STATUSES.has(participant.status)) {
    return 0;
  }

  return Math.max(1, participant.quantity ?? 1);
};

export const sumActiveOccurrenceRsvpCount = (participants: CountableParticipant[]): number =>
  participants.reduce((total, participant) => total + getActiveOccurrenceRsvpCountContribution(participant), 0);
