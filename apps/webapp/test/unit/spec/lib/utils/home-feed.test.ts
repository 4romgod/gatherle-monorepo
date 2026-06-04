import { excludeAlreadyRsvpdRecommendations } from '@/lib/utils/home-feed';

describe('home-feed', () => {
  it('removes recommended items for event series the viewer already RSVPd to', () => {
    const recommendedEvents = [
      {
        occurrenceId: 'occ-1',
        eventSeriesId: 'event-1',
        eventSeries: { eventId: 'event-1', slug: 'event-1', title: 'Event 1' },
      },
      {
        occurrenceId: 'occ-2',
        eventSeriesId: 'event-2',
        eventSeries: { eventId: 'event-2', slug: 'event-2', title: 'Event 2' },
      },
      {
        eventId: 'event-3',
        slug: 'event-3',
        title: 'Event 3',
      },
    ] as any;

    const upcomingRsvpEvents = [
      {
        occurrenceId: 'occ-rsvp-1',
        eventSeriesId: 'event-1',
        eventSeries: { eventId: 'event-1', slug: 'event-1', title: 'Event 1' },
      },
    ] as any;

    expect(
      excludeAlreadyRsvpdRecommendations(recommendedEvents, upcomingRsvpEvents).map((event: any) =>
        'occurrenceId' in event ? event.occurrenceId : event.eventId,
      ),
    ).toEqual(['occ-2', 'event-3']);
  });
});
