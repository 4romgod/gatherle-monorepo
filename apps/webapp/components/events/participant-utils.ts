import { GetEventBySlugQuery, ParticipantStatus } from '@/data/graphql/types/graphql';
import { canViewUserDetails, getVisibilityLabel as getUserVisibilityLabel } from '@/components/users/visibility-utils';

export type EventSeriesParticipantRecord = NonNullable<
  NonNullable<GetEventBySlugQuery['readEventBySlug']>['participants']
>[number];
export type EventOccurrenceParticipantRecord = NonNullable<
  NonNullable<NonNullable<GetEventBySlugQuery['readEventBySlug']>['upcomingOccurrences']>[number]['participants']
>[number];
export type EventParticipantRecord = EventSeriesParticipantRecord | EventOccurrenceParticipantRecord;
export type EventParticipantSocialProof = {
  participants: EventParticipantRecord[];
  text: string;
};

type EventParticipantSocialProofOptions = {
  followingUserIds?: ReadonlySet<string>;
  counts?: {
    goingCount?: number;
    interestedCount?: number;
    totalCount?: number;
  };
};

const getParticipantQuantity = (participant: EventParticipantRecord) => participant.quantity ?? 1;

export const getParticipantDisplayName = (participant: EventParticipantRecord) => {
  const nameParts = [participant.user?.given_name, participant.user?.family_name].filter(Boolean);
  const fallbackName = participant.user?.username || `Guest • ${participant.userId?.slice(-4) ?? 'anon'}`;
  return nameParts.length ? nameParts.join(' ') : fallbackName;
};

export const getParticipantShortName = (participant: EventParticipantRecord) =>
  participant.user?.given_name?.trim() ||
  getParticipantDisplayName(participant).split(/\s+/)[0] ||
  participant.user?.username ||
  'Someone';

export const getParticipantInitial = (participant: EventParticipantRecord) =>
  participant.user?.given_name?.charAt(0) ??
  participant.user?.username?.charAt(0) ??
  participant.userId?.charAt(0) ??
  '?';

export const isActiveParticipant = (participant: EventParticipantRecord) =>
  participant.status !== ParticipantStatus.Cancelled;
export const isGoingParticipant = (participant: EventParticipantRecord) =>
  participant.status === ParticipantStatus.Going || participant.status === ParticipantStatus.CheckedIn;
export const isInterestedParticipant = (participant: EventParticipantRecord) =>
  participant.status === ParticipantStatus.Interested;

export const getActiveParticipants = (participants: EventParticipantRecord[]) =>
  participants.filter(isActiveParticipant);

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

export const getParticipantStatusCounts = (participants: EventParticipantRecord[]) =>
  getActiveParticipants(participants).reduce(
    (summary, participant) => {
      const quantity = getParticipantQuantity(participant);

      if (isGoingParticipant(participant)) {
        summary.going += quantity;
      }

      if (isInterestedParticipant(participant)) {
        summary.interested += quantity;
      }

      summary.total += quantity;
      return summary;
    },
    { going: 0, interested: 0, total: 0 },
  );

export function formatGoingCountLabel(
  count: number,
  options: {
    includePeopleWord?: boolean;
    zeroLabel?: string;
  } = {},
) {
  if (count <= 0) {
    return options.zeroLabel ?? 'No one going yet';
  }

  if (!options.includePeopleWord) {
    return `${count} going`;
  }

  return count === 1 ? '1 person going' : `${count} people going`;
}

export function formatInterestedCountLabel(
  count: number,
  options: {
    includePeopleWord?: boolean;
    zeroLabel?: string;
  } = {},
) {
  if (count <= 0) {
    return options.zeroLabel ?? 'No one interested yet';
  }

  if (!options.includePeopleWord) {
    return `${count} interested`;
  }

  return count === 1 ? '1 person interested' : `${count} people interested`;
}

export function buildAttendanceBadgeLabel(goingCount: number, interestedCount: number) {
  if (goingCount <= 0 && interestedCount <= 0) {
    return null;
  }

  const parts: string[] = [];

  if (goingCount > 0) {
    parts.push(formatGoingCountLabel(goingCount, { includePeopleWord: false, zeroLabel: '' }));
  }

  if (interestedCount > 0) {
    parts.push(formatInterestedCountLabel(interestedCount, { includePeopleWord: false, zeroLabel: '' }));
  }

  return parts.join(' · ');
}

export function buildAttendeeSummaryLabel(attendanceBadgeLabel: string | null, activeParticipantCount: number) {
  if (attendanceBadgeLabel) {
    return attendanceBadgeLabel;
  }

  if (activeParticipantCount <= 0) {
    return 'Be the first to go';
  }

  return activeParticipantCount === 1 ? '1 attendee' : `${activeParticipantCount} attendees`;
}

function buildNamedParticipationLabel(firstLabel: string, totalCount: number, action: 'going' | 'interested') {
  if (totalCount <= 1) {
    return `${firstLabel} is ${action}`;
  }

  const othersCount = totalCount - 1;
  return `${firstLabel} and ${othersCount} other${othersCount === 1 ? '' : 's'} are ${action}`;
}

export function buildParticipantSocialProof(
  participants: EventParticipantRecord[],
  options: EventParticipantSocialProofOptions = {},
): EventParticipantSocialProof {
  const activeParticipants = getActiveParticipants(participants);
  const goingParticipants = activeParticipants.filter(isGoingParticipant);
  const interestedParticipants = activeParticipants.filter(isInterestedParticipant);
  const followingUserIds = options.followingUserIds;
  const followedGoingParticipants = followingUserIds
    ? goingParticipants.filter(
        (participant) => participant.user?.userId && followingUserIds.has(participant.user.userId),
      )
    : [];
  const followedInterestedParticipants = followingUserIds
    ? interestedParticipants.filter(
        (participant) => participant.user?.userId && followingUserIds.has(participant.user.userId),
      )
    : [];
  const derivedCounts = getParticipantStatusCounts(activeParticipants);
  const goingCount = options.counts?.goingCount ?? derivedCounts.going;
  const interestedCount = options.counts?.interestedCount ?? derivedCounts.interested;
  const totalCount = options.counts?.totalCount ?? derivedCounts.total;
  const getQuantityTotal = (items: EventParticipantRecord[]) =>
    items.reduce((sum, participant) => sum + getParticipantQuantity(participant), 0);

  if (followedGoingParticipants.length > 0) {
    return {
      participants: followedGoingParticipants.slice(0, 3),
      text: buildNamedParticipationLabel(
        getParticipantShortName(followedGoingParticipants[0]),
        getQuantityTotal(followedGoingParticipants),
        'going',
      ),
    };
  }

  if (followedInterestedParticipants.length > 0) {
    const followedInterestedCount = getQuantityTotal(followedInterestedParticipants);
    return {
      participants: followedInterestedParticipants.slice(0, 3),
      text:
        followedInterestedCount === 1
          ? `${getParticipantShortName(followedInterestedParticipants[0])} is interested`
          : `${followedInterestedCount} people you follow are interested`,
    };
  }

  if (goingParticipants.length > 0) {
    return {
      participants: goingParticipants.slice(0, 3),
      text: buildNamedParticipationLabel(
        getParticipantShortName(goingParticipants[0]),
        Math.max(goingCount, 1),
        'going',
      ),
    };
  }

  if (interestedParticipants.length > 0) {
    return {
      participants: interestedParticipants.slice(0, 3),
      text: buildNamedParticipationLabel(
        getParticipantShortName(interestedParticipants[0]),
        Math.max(interestedCount, 1),
        'interested',
      ),
    };
  }

  if (goingCount > 0) {
    return {
      participants: [],
      text: formatGoingCountLabel(goingCount, { includePeopleWord: true }),
    };
  }

  if (interestedCount > 0) {
    return {
      participants: [],
      text: formatInterestedCountLabel(interestedCount, { includePeopleWord: true }),
    };
  }

  if (totalCount > 0) {
    return {
      participants: [],
      text: formatGoingCountLabel(totalCount, { includePeopleWord: true }),
    };
  }

  return {
    participants: [],
    text: 'Be the first to go',
  };
}

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
