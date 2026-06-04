import {
  EventOccurrenceStatus,
  ParticipantStatus,
  type EventOccurrence,
  type EventOccurrenceParticipant,
  type EventSeries,
  type EventSeriesParticipant,
} from '@gatherle/commons/server/types';

type CountableParticipant = Pick<EventOccurrenceParticipant | EventSeriesParticipant, 'status' | 'quantity'>;

export const ACTIVE_OCCURRENCE_RSVP_STATUSES = new Set<ParticipantStatus>([
  ParticipantStatus.Going,
  ParticipantStatus.Interested,
  ParticipantStatus.CheckedIn,
]);

export const buildMyEventOccurrenceParticipantLoadKey = (occurrenceId: string, userId: string): string =>
  JSON.stringify([occurrenceId, userId]);

export const isOccurrenceUpcoming = (
  occurrence: Pick<EventOccurrence, 'startAt' | 'endAt'>,
  fromDate: Date = new Date(),
): boolean => {
  const effectiveEndAt = occurrence.endAt ?? occurrence.startAt;
  return effectiveEndAt.getTime() >= fromDate.getTime();
};

export const pickRepresentativeOccurrence = (
  occurrences: EventOccurrence[],
  fromDate: Date = new Date(),
): EventOccurrence | null => {
  if (occurrences.length === 0) {
    return null;
  }

  const sortAscending = (left: EventOccurrence, right: EventOccurrence) =>
    left.startAt.getTime() - right.startAt.getTime() ||
    left.originalStartAt.getTime() - right.originalStartAt.getTime() ||
    left.occurrenceKey.localeCompare(right.occurrenceKey);

  const sortDescending = (left: EventOccurrence, right: EventOccurrence) =>
    right.startAt.getTime() - left.startAt.getTime() ||
    right.originalStartAt.getTime() - left.originalStartAt.getTime() ||
    right.occurrenceKey.localeCompare(left.occurrenceKey);

  const nonCancelledOccurrences = occurrences.filter(
    (occurrence) => occurrence.status !== EventOccurrenceStatus.Cancelled,
  );
  const candidateOccurrences = nonCancelledOccurrences.length > 0 ? nonCancelledOccurrences : occurrences;
  const upcomingOccurrences = candidateOccurrences.filter(
    (occurrence) => occurrence.status !== EventOccurrenceStatus.Completed && isOccurrenceUpcoming(occurrence, fromDate),
  );

  if (upcomingOccurrences.length > 0) {
    return [...upcomingOccurrences].sort(sortAscending)[0];
  }

  return [...candidateOccurrences].sort(sortDescending)[0];
};

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

export const projectOccurrenceParticipantToSeriesParticipant = (
  eventId: string,
  participant: EventOccurrenceParticipant,
  event?: EventSeries,
): EventSeriesParticipant => ({
  participantId: participant.participantId,
  eventId,
  userId: participant.userId,
  status: participant.status,
  quantity: participant.quantity,
  invitedBy: participant.invitedBy,
  sharedVisibility: participant.sharedVisibility,
  rsvpAt: participant.rsvpAt,
  cancelledAt: participant.cancelledAt,
  checkedInAt: participant.checkedInAt,
  ...(event ? { event } : {}),
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
