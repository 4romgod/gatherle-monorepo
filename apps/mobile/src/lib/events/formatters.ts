import {
  MobileEventCategory,
  MobileEventOccurrence,
  MobileOrganization,
  MobileParticipant,
} from '@data/graphql/query/Discovery/types';

const DEFAULT_DISCOVERY_OCCURRENCE_WINDOW_MONTHS = 6;
// Exact event selection should be able to reveal a series across its realistic
// history and future, instead of disappearing outside the discovery feed window.
const SELECTED_EVENT_OCCURRENCE_LOOKBACK_YEARS = 10;
const SELECTED_EVENT_OCCURRENCE_LOOKAHEAD_YEARS = 10;

export function buildDefaultOccurrenceDateRange(fromDate: Date = new Date()) {
  const startDate = new Date(fromDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + DEFAULT_DISCOVERY_OCCURRENCE_WINDOW_MONTHS);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export function buildSelectedEventOccurrenceDateRange(fromDate: Date = new Date()) {
  const startDate = new Date(fromDate);
  startDate.setFullYear(startDate.getFullYear() - SELECTED_EVENT_OCCURRENCE_LOOKBACK_YEARS);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(fromDate);
  endDate.setFullYear(endDate.getFullYear() + SELECTED_EVENT_OCCURRENCE_LOOKAHEAD_YEARS);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export function dedupeOccurrencesBySeries<T extends { eventSeriesId: string }>(occurrences: T[], limit?: number): T[] {
  const results: T[] = [];
  const seenSeriesIds = new Set<string>();

  for (const occurrence of occurrences) {
    if (seenSeriesIds.has(occurrence.eventSeriesId)) {
      continue;
    }

    seenSeriesIds.add(occurrence.eventSeriesId);
    results.push(occurrence);

    if (limit !== undefined && results.length >= limit) {
      break;
    }
  }

  return results;
}

export function sortCategoriesByInterest(categories: MobileEventCategory[]) {
  return [...categories].sort((left, right) => (right.interestedUsersCount ?? 0) - (left.interestedUsersCount ?? 0));
}

export function sortOrganizationsByFollowers(organizations: MobileOrganization[]) {
  return [...organizations].sort((left, right) => (right.followersCount ?? 0) - (left.followersCount ?? 0));
}

type UserNameLike = {
  family_name?: string | null;
  given_name?: string | null;
  username?: string | null;
};

export function getDisplayName(user?: UserNameLike | null) {
  const fullName = [user?.given_name, user?.family_name].filter(Boolean).join(' ').trim();
  return fullName || user?.username || '';
}

export function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatLocationLabel(occurrence?: MobileEventOccurrence | null) {
  const address = occurrence?.eventSeries?.location?.address;
  const parts = [address?.city, address?.state, address?.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Location to be announced';
}

export function formatShortDateTime(isoDate?: string | null) {
  if (!isoDate) {
    return 'Date to be announced';
  }

  const date = new Date(isoDate);

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    weekday: 'short',
  }).format(date);
}

export function formatEventScheduleRange(occurrence?: MobileEventOccurrence | null) {
  if (!occurrence?.startAt) {
    return 'Date to be announced';
  }

  const start = new Date(occurrence.startAt);
  const end = occurrence.endAt ? new Date(occurrence.endAt) : null;

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(start);

  const startTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);

  const endTime = end
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(end)
    : null;

  return `${dateLabel} · ${startTime}${endTime ? ` - ${endTime}` : ''}`;
}

export function formatEventScheduleTwoLine(occurrence?: MobileEventOccurrence | null) {
  if (!occurrence?.startAt) {
    return 'Date to be announced';
  }

  const start = new Date(occurrence.startAt);
  const end = occurrence.endAt ? new Date(occurrence.endAt) : null;

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
  }).format(start);

  const startTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);

  const endTime = end
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(end)
    : null;

  return `${dateLabel}\n${startTime}${endTime ? ` - ${endTime}` : ''}`;
}

export function formatShortDate(isoDate?: string | null) {
  if (!isoDate) {
    return 'Date to be announced';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(new Date(isoDate));
}

export function formatOccurrenceSessionDate(isoDate?: string | null, timeZone?: string | null) {
  if (!isoDate) {
    return 'Date TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: timeZone ?? undefined,
    weekday: 'short',
  }).format(new Date(isoDate));
}

export function formatOccurrenceSessionTime(isoDate?: string | null, timeZone?: string | null) {
  if (!isoDate) {
    return 'Time TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone ?? undefined,
  }).format(new Date(isoDate));
}

export function formatRelativeTime(isoDate?: string | null) {
  if (!isoDate) {
    return '';
  }

  const now = Date.now();
  const target = new Date(isoDate).getTime();
  const diffMs = target - now;
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMinutes) < 60) {
    if (diffMinutes >= 0) {
      return diffMinutes <= 1 ? 'in 1 min' : `in ${diffMinutes} min`;
    }

    const minutesAgo = Math.abs(diffMinutes);
    return minutesAgo <= 1 ? '1 min ago' : `${minutesAgo} min ago`;
  }

  if (Math.abs(diffHours) < 24) {
    if (diffHours >= 0) {
      return diffHours === 1 ? 'in 1 hr' : `in ${diffHours} hr`;
    }

    const hoursAgo = Math.abs(diffHours);
    return hoursAgo === 1 ? '1 hr ago' : `${hoursAgo} hr ago`;
  }

  if (Math.abs(diffDays) < 7) {
    if (diffDays >= 0) {
      return diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`;
    }

    const daysAgo = Math.abs(diffDays);
    return daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
  }

  return formatShortDate(isoDate);
}

export function formatDateGroupLabel(isoDate?: string | null) {
  if (!isoDate) {
    return 'Earlier';
  }

  const target = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const dayDiff = Math.round((startOfTarget - startOfToday) / 86400000);

  if (dayDiff === 0) {
    return 'Today';
  }

  if (dayDiff === -1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(target);
}

export function formatCountLabel(count: number | null | undefined, singular: string, plural?: string) {
  const safeCount = count ?? 0;
  const pluralLabel = plural ?? `${singular}s`;
  return `${safeCount} ${safeCount === 1 ? singular : pluralLabel}`;
}

export function getOccurrenceParticipantPreview(occurrence?: MobileEventOccurrence | null, limit = 3) {
  return (occurrence?.participants ?? []).filter((participant) => participant.status !== 'Cancelled').slice(0, limit);
}

export function getOccurrenceParticipantCount(occurrence?: MobileEventOccurrence | null) {
  return (occurrence?.participants ?? []).filter((participant) => participant.status !== 'Cancelled').length;
}

export function getEventCategoryLabel(occurrence?: MobileEventOccurrence | null) {
  return occurrence?.eventSeries?.eventCategories?.[0]?.name ?? 'Event';
}

export function getEventCityLabel(occurrence?: MobileEventOccurrence | null) {
  return (
    occurrence?.eventSeries?.location?.address?.city ??
    occurrence?.eventSeries?.location?.address?.state ??
    occurrence?.eventSeries?.location?.address?.country ??
    'Featured'
  );
}

export function getEventStatusLabel(occurrence?: MobileEventOccurrence | null) {
  if (!occurrence?.startAt) {
    return 'Upcoming';
  }

  const startAt = new Date(occurrence.startAt).getTime();
  const endAt = occurrence.endAt ? new Date(occurrence.endAt).getTime() : startAt;
  const now = Date.now();

  if (endAt < now) {
    return 'Past';
  }

  if (startAt <= now) {
    return 'Ongoing';
  }

  if (startAt - now <= 24 * 60 * 60 * 1000) {
    return 'Today';
  }

  return 'Upcoming';
}

export function getEventImageUrl(occurrence?: MobileEventOccurrence | null) {
  return occurrence?.eventSeries?.media?.featuredImageUrl ?? null;
}

export function getEventTitle(occurrence?: MobileEventOccurrence | null) {
  return occurrence?.eventSeries?.title ?? 'Untitled Event';
}

export function getEventSummary(occurrence?: MobileEventOccurrence | null) {
  return occurrence?.eventSeries?.summary ?? occurrence?.eventSeries?.description ?? 'Details coming soon.';
}

export function getOrganizerLabel(occurrence?: MobileEventOccurrence | null) {
  const organizationName = occurrence?.eventSeries?.organization?.name;
  if (organizationName) {
    return organizationName;
  }

  const firstOrganizer = occurrence?.eventSeries?.organizers?.[0]?.user;
  return getDisplayName(firstOrganizer);
}

export function getParticipantKey(participant: MobileParticipant) {
  return participant.participantId || participant.userId || 'guest';
}
