import { AnyEventPreview, getEventPreviewEventId } from '@/components/events/event-preview-utils';

export function excludeAlreadyRsvpdRecommendations(
  recommendedEvents: AnyEventPreview[],
  upcomingRsvpEvents: AnyEventPreview[],
) {
  const excludedEventIds = new Set(upcomingRsvpEvents.map((event) => getEventPreviewEventId(event)));

  return recommendedEvents.filter((event) => !excludedEventIds.has(getEventPreviewEventId(event)));
}
