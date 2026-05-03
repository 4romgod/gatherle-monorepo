import { ROUTES } from '@/lib/constants';
import type { EventOccurrencePreview, EventPreview } from '@/data/graphql/query/Event/types';
import type { RecommendedFeedEventPreview, RecommendedFeedOccurrencePreview } from '@/data/graphql/query/Feed/types';
import { EventOccurrenceStatus, ParticipantStatus } from '@/data/graphql/types/graphql';
import { isEventUpcoming } from '@/lib/utils/rrule';
import { formatOccurrenceDateTime, formatRecurrenceRule } from './date-utils';
import { buildEventOccurrenceHref } from './occurrence-url';
import type { EventParticipantRecord } from './participant-utils';

type SeriesEventPreview = EventPreview | RecommendedFeedEventPreview;
type OccurrenceEventPreview = EventOccurrencePreview | RecommendedFeedOccurrencePreview;
type SeriesSnapshot =
  | NonNullable<EventOccurrencePreview['eventSeries']>
  | NonNullable<RecommendedFeedOccurrencePreview['eventSeries']>
  | SeriesEventPreview
  | null
  | undefined;

export type AnyEventPreview = SeriesEventPreview | OccurrenceEventPreview;
type OccurrencePreviewBase = Pick<
  OccurrenceEventPreview,
  | 'occurrenceId'
  | 'occurrenceKey'
  | 'eventSeriesId'
  | 'startAt'
  | 'endAt'
  | 'timezone'
  | 'originalStartAt'
  | 'status'
  | 'isException'
  | 'rsvpCount'
> & {
  participants?: EventOccurrencePreview['participants'];
  eventSeries?: NonNullable<EventOccurrencePreview['eventSeries']> | null;
};
type OccurrenceRsvpPreviewSource = {
  participantId: string;
  occurrenceId: string;
  status: ParticipantStatus;
  quantity?: number | null;
  occurrence?: OccurrencePreviewBase | null;
};

function getSeriesPreview(event: AnyEventPreview): SeriesSnapshot {
  return isOccurrencePreview(event) ? event.eventSeries : event;
}

export function isOccurrencePreview(event: AnyEventPreview): event is OccurrenceEventPreview {
  return 'occurrenceId' in (event as Partial<OccurrenceEventPreview>);
}

function getStandaloneSeriesPreview(event: AnyEventPreview): SeriesEventPreview {
  return event as SeriesEventPreview;
}

export function getEventPreviewKey(event: AnyEventPreview): string {
  return isOccurrencePreview(event) ? event.occurrenceId : getStandaloneSeriesPreview(event).eventId;
}

export function getEventPreviewEventId(event: AnyEventPreview): string {
  return isOccurrencePreview(event)
    ? (event.eventSeries?.eventId ?? event.eventSeriesId)
    : getStandaloneSeriesPreview(event).eventId;
}

export function getEventPreviewOccurrenceId(event: AnyEventPreview): string | undefined {
  return isOccurrencePreview(event) ? event.occurrenceId : undefined;
}

export function getEventPreviewSlug(event: AnyEventPreview): string {
  return isOccurrencePreview(event) ? (event.eventSeries?.slug ?? '') : getStandaloneSeriesPreview(event).slug;
}

export function getEventPreviewHref(event: AnyEventPreview): string {
  const slug = getEventPreviewSlug(event);
  const basePath = slug ? ROUTES.EVENTS.EVENT(slug) : ROUTES.EVENTS.ROOT;

  if (!isOccurrencePreview(event)) {
    return basePath;
  }

  return buildEventOccurrenceHref(basePath, event);
}

export function getEventPreviewTitle(event: AnyEventPreview): string {
  return isOccurrencePreview(event)
    ? (event.eventSeries?.title ?? 'Untitled event')
    : getStandaloneSeriesPreview(event).title;
}

export function getEventPreviewImageUrl(event: AnyEventPreview): string | null {
  return getSeriesPreview(event)?.media?.featuredImageUrl ?? null;
}

export function getEventPreviewLocationText(event: AnyEventPreview): string {
  const location = getSeriesPreview(event)?.location;
  return location?.address?.city || location?.details || 'Location TBA';
}

export function getEventPreviewCityLabel(event: AnyEventPreview): string {
  return getSeriesPreview(event)?.location?.address?.city || 'Featured';
}

export function getEventPreviewScheduleText(event: AnyEventPreview): string {
  if (isOccurrencePreview(event)) {
    return formatOccurrenceDateTime(event.startAt, event.endAt, event.timezone);
  }

  const seriesEvent = getStandaloneSeriesPreview(event);
  const recurrenceRule = seriesEvent.primarySchedule?.recurrenceRule;
  if (recurrenceRule) {
    return formatRecurrenceRule(recurrenceRule);
  }

  return formatOccurrenceDateTime(
    seriesEvent.primarySchedule?.startAt,
    seriesEvent.primarySchedule?.endAt,
    seriesEvent.primarySchedule?.timezone,
  );
}

export function getEventPreviewStatusLabel(event: AnyEventPreview): string | null {
  if (isOccurrencePreview(event) && event.status !== EventOccurrenceStatus.Scheduled) {
    return event.status;
  }

  return getSeriesPreview(event)?.status ?? null;
}

export function getEventPreviewParticipants(event: AnyEventPreview): EventParticipantRecord[] {
  if (isOccurrencePreview(event)) {
    return (event.participants ?? []) as EventParticipantRecord[];
  }

  return (getStandaloneSeriesPreview(event).participants ?? []) as EventParticipantRecord[];
}

export function getEventPreviewParticipantCount(event: AnyEventPreview): number {
  if (typeof event.rsvpCount === 'number') {
    return event.rsvpCount;
  }

  return getEventPreviewParticipants(event).reduce((count, participant) => {
    if (participant.status === ParticipantStatus.Cancelled) {
      return count;
    }

    return count + (participant.quantity ?? 1);
  }, 0);
}

export function getEventPreviewMyRsvpStatus(event: AnyEventPreview): ParticipantStatus | null {
  return event.myRsvp?.status ?? null;
}

export function getEventPreviewIsSavedByMe(event: AnyEventPreview): boolean {
  return Boolean(getSeriesPreview(event)?.isSavedByMe);
}

export function isEventPreviewUpcoming(event: AnyEventPreview, fromDate = new Date()): boolean {
  if (isOccurrencePreview(event)) {
    const comparisonValue = event.endAt ?? event.startAt;
    return new Date(comparisonValue).getTime() >= fromDate.getTime();
  }

  return isEventUpcoming(getStandaloneSeriesPreview(event).primarySchedule?.recurrenceRule);
}

export function projectOccurrenceRsvpToEventPreview(rsvp: OccurrenceRsvpPreviewSource): EventOccurrencePreview | null {
  if (!rsvp.occurrence?.eventSeries) {
    return null;
  }

  return {
    ...rsvp.occurrence,
    participants: rsvp.occurrence.participants ?? [],
    myRsvp: {
      participantId: rsvp.participantId,
      occurrenceId: rsvp.occurrenceId,
      status: rsvp.status,
      quantity: rsvp.quantity ?? null,
    },
  };
}
