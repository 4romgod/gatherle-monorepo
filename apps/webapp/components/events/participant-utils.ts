import { GetEventBySlugQuery, ParticipantStatus } from '@/data/graphql/types/graphql';
import { canViewUserDetails, getVisibilityLabel as getUserVisibilityLabel } from '@/components/users/visibility-utils';

export type EventSeriesParticipantRecord = NonNullable<
  NonNullable<GetEventBySlugQuery['readEventBySlug']>['participants']
>[number];
export type EventOccurrenceParticipantRecord = NonNullable<
  NonNullable<NonNullable<GetEventBySlugQuery['readEventBySlug']>['upcomingOccurrences']>[number]['participants']
>[number];
export type EventParticipantRecord = EventSeriesParticipantRecord | EventOccurrenceParticipantRecord;

export const getParticipantDisplayName = (participant: EventParticipantRecord) => {
  const nameParts = [participant.user?.given_name, participant.user?.family_name].filter(Boolean);
  const fallbackName = participant.user?.username || `Guest • ${participant.userId?.slice(-4) ?? 'anon'}`;
  return nameParts.length ? nameParts.join(' ') : fallbackName;
};

export const getParticipantInitial = (participant: EventParticipantRecord) =>
  participant.user?.given_name?.charAt(0) ??
  participant.user?.username?.charAt(0) ??
  participant.userId?.charAt(0) ??
  '?';

export const getParticipantStatusLabel = (participant: EventParticipantRecord) =>
  participant.status ?? ParticipantStatus.Going;

export const getParticipantChipColor = (status?: ParticipantStatus | null) => {
  switch (status) {
    case ParticipantStatus.Waitlisted:
      return 'warning';
    case ParticipantStatus.Interested:
      return 'info';
    case ParticipantStatus.CheckedIn:
      return 'success';
    default:
      return 'primary';
  }
};

export const canViewerSeeParticipant = (
  user: EventParticipantRecord['user'] | undefined,
  viewerId?: string,
  followingIds?: Set<string>,
): boolean =>
  canViewUserDetails({
    viewerId,
    userId: user?.userId,
    defaultVisibility: user?.defaultVisibility,
    followingIds,
  });

export const getVisibilityLabel = getUserVisibilityLabel;
