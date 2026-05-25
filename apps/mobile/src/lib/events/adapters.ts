import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MobileEventSeriesListItem } from '@data/graphql/query/Event/types';

export function mapEventSeriesToOccurrence(event: MobileEventSeriesListItem): MobileEventOccurrence | null {
  const occurrence = event.representativeOccurrence;

  if (!occurrence) {
    return null;
  }

  return {
    __typename: 'EventOccurrence',
    endAt: occurrence.endAt,
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
    eventSeriesId: occurrence.eventSeriesId,
    isException: occurrence.isException,
    myRsvp: occurrence.myRsvp ?? null,
    occurrenceId: occurrence.occurrenceId,
    occurrenceKey: occurrence.occurrenceKey,
    originalStartAt: occurrence.originalStartAt,
    participants: occurrence.participants ?? null,
    rsvpCount: occurrence.rsvpCount ?? null,
    startAt: occurrence.startAt,
    status: occurrence.status,
    timezone: occurrence.timezone,
  } as MobileEventOccurrence;
}
