import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MobileEventSeriesListItem } from '@data/graphql/query/Event/types';
import type { GetEventBySlugForNavigationQuery } from '@data/graphql/types/graphql';
import { EventOccurrenceStatus } from '@data/graphql/types/graphql';
import { getOccurrencePublicAnchor } from '@/lib/events/occurrenceUrl';

export function mapEventSeriesToOccurrence(event: MobileEventSeriesListItem): MobileEventOccurrence | null {
  const occurrence = event.representativeOccurrence;
  const fallbackStartAt = event.primarySchedule?.anchorStartAt ?? null;
  const fallbackDurationMinutes = event.primarySchedule?.occurrenceDurationMinutes ?? 0;
  const fallbackEndAt =
    fallbackStartAt && fallbackDurationMinutes > 0
      ? new Date(new Date(fallbackStartAt).getTime() + fallbackDurationMinutes * 60 * 1000).toISOString()
      : null;
  const resolvedStartAt = occurrence?.startAt ?? fallbackStartAt;

  if (!resolvedStartAt) {
    return null;
  }

  return {
    __typename: 'EventOccurrence',
    endAt: occurrence?.endAt ?? fallbackEndAt,
    eventSeries: {
      __typename: 'EventSeries',
      description: event.description,
      eventCategories: event.eventCategories,
      eventId: event.eventId,
      eventLink: event.eventLink ?? null,
      isSavedByMe: event.isSavedByMe,
      location: event.location,
      media: event.media ?? null,
      myRsvp: event.myRsvp ?? null,
      organization: event.organization ?? null,
      orgId: event.orgId ?? null,
      organizers: event.organizers,
      savedByCount: event.savedByCount ?? null,
      slug: event.slug,
      status: event.status,
      summary: event.summary ?? null,
      title: event.title,
      venueId: event.venueId ?? null,
      visibility: event.visibility ?? null,
    },
    eventSeriesId: occurrence?.eventSeriesId ?? event.eventId,
    isException: occurrence?.isException ?? false,
    myRsvp: occurrence?.myRsvp ?? event.myRsvp ?? null,
    occurrenceId: occurrence?.occurrenceId ?? `synthetic:${event.eventId}`,
    occurrenceKey: occurrence?.occurrenceKey ?? `synthetic:${event.eventId}`,
    originalStartAt: occurrence?.originalStartAt ?? resolvedStartAt,
    participants: occurrence?.participants ?? null,
    rsvpCount: occurrence?.rsvpCount ?? event.rsvpCount ?? null,
    startAt: resolvedStartAt,
    status: occurrence?.status ?? EventOccurrenceStatus.Scheduled,
    timezone: occurrence?.timezone ?? event.primarySchedule?.timezone ?? 'UTC',
  } as MobileEventOccurrence;
}

export function mapNavigableEventToOccurrence(
  event: NonNullable<GetEventBySlugForNavigationQuery['readEventBySlug']>,
  occurrenceAnchor?: string | null,
): MobileEventOccurrence | null {
  const candidates = mapNavigableEventOccurrences(event);

  if (candidates.length === 0) {
    return null;
  }

  const selectedOccurrence =
    (occurrenceAnchor
      ? candidates.find((occurrence) => getOccurrencePublicAnchor(occurrence.originalStartAt) === occurrenceAnchor)
      : null) ?? candidates[0];

  return selectedOccurrence;
}

export function mapNavigableEventOccurrences(
  event: NonNullable<GetEventBySlugForNavigationQuery['readEventBySlug']>,
): MobileEventOccurrence[] {
  const seenOccurrenceIds = new Set<string>();
  const candidates = [
    ...(event.upcomingOccurrences ?? []),
    ...(event.representativeOccurrence ? [event.representativeOccurrence] : []),
  ];

  return candidates
    .filter((occurrence) => {
      if (seenOccurrenceIds.has(occurrence.occurrenceId)) {
        return false;
      }

      seenOccurrenceIds.add(occurrence.occurrenceId);
      return true;
    })
    .map(
      (occurrence) =>
        ({
          ...occurrence,
          eventSeries: {
            ...event,
          },
        }) as MobileEventOccurrence,
    );
}
