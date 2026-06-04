import {
  buildDefaultOccurrenceDateRange,
  buildRecommendedOccurrences,
  buildSelectedEventOccurrenceDateRange,
  dedupeOccurrencesBySeries,
  formatCountLabel,
  formatDateGroupLabel,
  formatEventScheduleRange,
  formatEventScheduleTwoLine,
  formatLocationLabel,
  formatRelativeTime,
  formatShortDate,
  formatShortDateTime,
  getDisplayName,
  getEventCategoryLabel,
  getEventCityLabel,
  getEventImageUrl,
  getEventStatusLabel,
  getEventSummary,
  getEventTitle,
  getInitials,
  getOrganizerLabel,
  getOccurrenceParticipantCount,
  getOccurrenceParticipantPreview,
  getParticipantKey,
  sortCategoriesByInterest,
  sortOrganizationsByFollowers,
} from '@/lib/events/formatters';
import {
  mapEventSeriesToOccurrence,
  mergeNavigableOccurrences,
  mapNavigableEventOccurrences,
  mapNavigableEventToOccurrence,
} from '@/lib/events/adapters';
import { getOccurrencePublicAnchor } from '@/lib/events/occurrenceUrl';

const baseOccurrence = {
  endAt: '2026-05-23T12:30:00.000Z',
  eventSeries: {
    eventCategories: [{ name: 'Concerts' }],
    location: { address: { city: 'Johannesburg', country: 'South Africa', state: 'Gauteng' } },
  },
  eventSeriesId: 'series-1',
  participants: [
    { participantId: 'p1', status: 'Going' },
    { participantId: 'p2', status: 'Cancelled' },
    { participantId: 'p3', status: 'Interested' },
    { participantId: 'p4', status: 'Going' },
  ],
  startAt: '2026-05-23T10:00:00.000Z',
} as any;

describe('mobile event formatters', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the default one-year occurrence query range from local day bounds', () => {
    const range = buildDefaultOccurrenceDateRange(new Date('2026-01-15T13:45:00.000Z'));
    expect(range.startDate).toBe(new Date(2026, 0, 15, 0, 0, 0, 0).toISOString());
    expect(range.endDate).toBe(new Date(2027, 0, 15, 23, 59, 59, 999).toISOString());
  });

  it('builds a wide selected-event occurrence range so exact series matches include past occurrences', () => {
    const range = buildSelectedEventOccurrenceDateRange(new Date('2026-01-15T13:45:00.000Z'));
    expect(range.startDate).toBe(new Date(2016, 0, 15, 0, 0, 0, 0).toISOString());
    expect(range.endDate).toBe(new Date(2036, 0, 15, 23, 59, 59, 999).toISOString());
  });

  it('deduplicates occurrences by event series and respects a limit', () => {
    const occurrences = [
      { eventSeriesId: 'a', occurrenceId: 'a1' },
      { eventSeriesId: 'a', occurrenceId: 'a2' },
      { eventSeriesId: 'b', occurrenceId: 'b1' },
      { eventSeriesId: 'c', occurrenceId: 'c1' },
    ];

    expect(dedupeOccurrencesBySeries(occurrences).map((item) => item.occurrenceId)).toEqual(['a1', 'b1', 'c1']);
    expect(dedupeOccurrencesBySeries(occurrences, 2).map((item) => item.occurrenceId)).toEqual(['a1', 'b1']);
  });

  it('builds recommendations without repeating series the user already RSVPd to', () => {
    const trendingOccurrences = [
      { eventSeriesId: 'series-1', occurrenceId: 'trend-1' },
      { eventSeriesId: 'series-2', occurrenceId: 'trend-2' },
      { eventSeriesId: 'series-3', occurrenceId: 'trend-3' },
    ] as any;
    const upcomingOccurrences = [
      { eventSeriesId: 'series-2', occurrenceId: 'upcoming-2' },
      { eventSeriesId: 'series-4', occurrenceId: 'upcoming-4' },
    ] as any;
    const excludedOccurrences = [{ eventSeriesId: 'series-1', occurrenceId: 'rsvp-1' }] as any;

    expect(
      buildRecommendedOccurrences(trendingOccurrences, upcomingOccurrences, excludedOccurrences, 3).map(
        (occurrence) => occurrence.occurrenceId,
      ),
    ).toEqual(['trend-2', 'trend-3', 'upcoming-4']);
  });

  it('sorts categories and organizations without mutating inputs', () => {
    const categories = [
      { name: 'Low', interestedUsersCount: 1 },
      { name: 'Missing', interestedUsersCount: null },
      { name: 'High', interestedUsersCount: 12 },
    ] as any;
    const organizations = [
      { name: 'Small', followersCount: 2 },
      { name: 'Missing', followersCount: null },
      { name: 'Large', followersCount: 99 },
    ] as any;

    expect(sortCategoriesByInterest(categories).map((item: any) => item.name)).toEqual(['High', 'Low', 'Missing']);
    expect(categories.map((item: any) => item.name)).toEqual(['Low', 'Missing', 'High']);
    expect(sortOrganizationsByFollowers(organizations).map((item: any) => item.name)).toEqual([
      'Large',
      'Small',
      'Missing',
    ]);
    expect(organizations.map((item: any) => item.name)).toEqual(['Small', 'Missing', 'Large']);
  });

  it('formats display names, initials, locations, categories, and city labels with fallbacks', () => {
    expect(getDisplayName({ given_name: 'Ada', family_name: 'Lovelace', username: 'ada' })).toBe('Ada Lovelace');
    expect(getDisplayName({ username: 'fallback' })).toBe('fallback');
    expect(getDisplayName(null)).toBe('');

    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials(' Prince ')).toBe('P');
    expect(getInitials('   ')).toBe('?');

    expect(formatLocationLabel(baseOccurrence)).toBe('Johannesburg, Gauteng, South Africa');
    expect(formatLocationLabel(null)).toBe('Location to be announced');
    expect(getEventCategoryLabel(baseOccurrence)).toBe('Concerts');
    expect(getEventCategoryLabel(null)).toBe('Event');
    expect(getEventCityLabel(baseOccurrence)).toBe('Johannesburg');
    expect(getEventCityLabel({ eventSeries: { location: { address: { state: 'Western Cape' } } } } as any)).toBe(
      'Western Cape',
    );
    expect(getEventCityLabel(null)).toBe('Featured');
  });

  it('formats dates, ranges, relative time, and day group labels', () => {
    expect(formatShortDateTime('2026-05-23T10:05:00.000Z')).toContain('May');
    expect(formatShortDateTime(null)).toBe('Date to be announced');
    expect(formatEventScheduleRange(baseOccurrence)).toContain('Saturday');
    expect(formatEventScheduleRange(baseOccurrence)).toContain(' - ');
    expect(formatEventScheduleRange({ ...baseOccurrence, endAt: null })).not.toContain(' - ');
    expect(formatEventScheduleRange(null)).toBe('Date to be announced');
    expect(formatEventScheduleTwoLine(baseOccurrence)).toContain('\n');
    expect(formatEventScheduleTwoLine({ ...baseOccurrence, endAt: null })).not.toContain(' - ');
    expect(formatEventScheduleTwoLine(null)).toBe('Date to be announced');
    expect(formatShortDate('2026-05-23T10:05:00.000Z')).toContain('May');
    expect(formatShortDate(null)).toBe('Date to be announced');

    expect(formatRelativeTime('2026-05-23T12:01:00.000Z')).toBe('in 1 min');
    expect(formatRelativeTime('2026-05-23T11:59:00.000Z')).toBe('1 min ago');
    expect(formatRelativeTime('2026-05-23T11:58:00.000Z')).toBe('2 min ago');
    expect(formatRelativeTime('2026-05-23T13:00:00.000Z')).toBe('in 1 hr');
    expect(formatRelativeTime('2026-05-23T14:00:00.000Z')).toBe('in 2 hr');
    expect(formatRelativeTime('2026-05-23T11:00:00.000Z')).toBe('1 hr ago');
    expect(formatRelativeTime('2026-05-23T10:00:00.000Z')).toBe('2 hr ago');
    expect(formatRelativeTime('2026-05-24T12:00:00.000Z')).toBe('tomorrow');
    expect(formatRelativeTime('2026-05-26T12:00:00.000Z')).toBe('in 3 days');
    expect(formatRelativeTime('2026-05-22T12:00:00.000Z')).toBe('yesterday');
    expect(formatRelativeTime('2026-05-20T12:00:00.000Z')).toBe('3 days ago');
    expect(formatRelativeTime('2026-06-15T12:00:00.000Z')).toContain('Jun');
    expect(formatRelativeTime(null)).toBe('');

    expect(formatDateGroupLabel('2026-05-23T01:00:00.000Z')).toBe('Today');
    expect(formatDateGroupLabel('2026-05-22T01:00:00.000Z')).toBe('Yesterday');
    expect(formatDateGroupLabel('2026-05-20T01:00:00.000Z')).toContain('Wednesday');
    expect(formatDateGroupLabel(null)).toBe('Earlier');
  });

  it('counts participant previews and pluralizes count labels', () => {
    expect(getOccurrenceParticipantPreview(baseOccurrence).map((item: any) => item.participantId)).toEqual([
      'p1',
      'p3',
      'p4',
    ]);
    expect(getOccurrenceParticipantPreview(baseOccurrence, 2)).toHaveLength(2);
    expect(getOccurrenceParticipantPreview(null)).toEqual([]);
    expect(getOccurrenceParticipantCount(baseOccurrence)).toBe(3);
    expect(getOccurrenceParticipantCount(null)).toBe(0);

    expect(formatCountLabel(1, 'guest')).toBe('1 guest');
    expect(formatCountLabel(2, 'guest')).toBe('2 guests');
    expect(formatCountLabel(null, 'person', 'people')).toBe('0 people');
  });

  it('formats event card data with fallback labels', () => {
    expect(getEventStatusLabel(null)).toBe('Upcoming');
    expect(getEventStatusLabel({ startAt: '2026-05-22T12:00:00.000Z' } as any)).toBe('Past');
    expect(getEventStatusLabel({ startAt: '2026-05-23T18:00:00.000Z' } as any)).toBe('Today');
    expect(
      getEventStatusLabel({
        startAt: '2026-05-22T12:00:00.000Z',
        endAt: '2026-05-24T12:00:00.000Z',
      } as any),
    ).toBe('Ongoing');
    expect(getEventStatusLabel({ startAt: '2026-05-30T12:00:00.000Z' } as any)).toBe('Upcoming');

    expect(
      getEventImageUrl({ eventSeries: { media: { featuredImageUrl: 'https://img.example/event.jpg' } } } as any),
    ).toBe('https://img.example/event.jpg');
    expect(getEventImageUrl(null)).toBeNull();
    expect(getEventTitle({ eventSeries: { title: 'Signal Night' } } as any)).toBe('Signal Night');
    expect(getEventTitle(null)).toBe('Untitled Event');
    expect(getEventSummary({ eventSeries: { summary: 'Summary', description: 'Description' } } as any)).toBe('Summary');
    expect(getEventSummary({ eventSeries: { description: 'Description' } } as any)).toBe('Description');
    expect(getEventSummary(null)).toBe('Details coming soon.');

    expect(getOrganizerLabel({ eventSeries: { organization: { name: 'Signal Studios' } } } as any)).toBe(
      'Signal Studios',
    );
    expect(
      getOrganizerLabel({
        eventSeries: { organizers: [{ user: { given_name: 'Ada', family_name: 'Lovelace', username: 'ada' } }] },
      } as any),
    ).toBe('Ada Lovelace');
    expect(getOrganizerLabel(null)).toBe('');

    expect(getParticipantKey({ participantId: 'participant-1', userId: 'user-1' } as any)).toBe('participant-1');
    expect(getParticipantKey({ participantId: '', userId: 'user-1' } as any)).toBe('user-1');
    expect(getParticipantKey({ participantId: '', userId: '' } as any)).toBe('guest');
  });

  it('maps event series list items into mobile occurrence cards and drops events without a representative occurrence', () => {
    expect(mapEventSeriesToOccurrence({ representativeOccurrence: null } as any)).toBeNull();

    const mapped = mapEventSeriesToOccurrence({
      description: 'Description',
      eventCategories: [{ name: 'Music' }],
      eventId: 'event-1',
      isSavedByMe: true,
      location: { address: { city: 'Pretoria' } },
      media: null,
      myRsvp: null,
      orgId: null,
      organization: null,
      organizers: [],
      representativeOccurrence: {
        endAt: null,
        eventSeriesId: 'event-1',
        isException: false,
        myRsvp: null,
        occurrenceId: 'occ-1',
        occurrenceKey: '2026-05-23',
        originalStartAt: null,
        participants: null,
        rsvpCount: null,
        startAt: '2026-05-23T10:00:00.000Z',
        status: 'Scheduled',
        timezone: 'Africa/Johannesburg',
      },
      savedByCount: null,
      slug: 'event-slug',
      status: 'Published',
      summary: null,
      title: 'Event title',
      venueId: null,
      visibility: null,
    } as any);

    expect(mapped).toMatchObject({
      eventSeriesId: 'event-1',
      occurrenceId: 'occ-1',
      eventSeries: {
        eventId: 'event-1',
        isSavedByMe: true,
        slug: 'event-slug',
        title: 'Event title',
      },
    });
  });

  it('maps event series list items from schedule fallbacks when no representative occurrence exists yet', () => {
    const mapped = mapEventSeriesToOccurrence({
      description: null,
      eventCategories: [],
      eventId: 'event-2',
      eventLink: null,
      isSavedByMe: false,
      location: { address: { city: 'Cape Town' } },
      media: null,
      myRsvp: { participantId: 'series-rsvp', quantity: 1, status: 'Interested' },
      orgId: null,
      organization: null,
      organizers: [],
      representativeOccurrence: null,
      primarySchedule: {
        anchorStartAt: '2026-06-01T08:00:00.000Z',
        occurrenceDurationMinutes: 90,
        timezone: 'Africa/Johannesburg',
      },
      rsvpCount: 8,
      savedByCount: 4,
      slug: 'fallback-series',
      status: 'Published',
      summary: 'Fallback summary',
      title: 'Fallback Event',
      venueId: null,
      visibility: null,
    } as any);

    expect(mapped).toMatchObject({
      occurrenceId: 'synthetic:event-2',
      occurrenceKey: 'synthetic:event-2',
      startAt: '2026-06-01T08:00:00.000Z',
      endAt: '2026-06-01T09:30:00.000Z',
      timezone: 'Africa/Johannesburg',
      status: 'Scheduled',
      myRsvp: { participantId: 'series-rsvp', quantity: 1, status: 'Interested' },
      rsvpCount: 8,
    });
  });

  it('maps navigable event occurrences, dedupes duplicates, and selects an explicit occurrence anchor', () => {
    const event = {
      eventId: 'event-nav-1',
      slug: 'navigable-series',
      title: 'Navigable Event',
      upcomingOccurrences: [
        {
          occurrenceId: 'occ-1',
          occurrenceKey: 'occ-1',
          eventSeriesId: 'event-nav-1',
          startAt: '2026-06-01T08:00:00.000Z',
          endAt: '2026-06-01T09:00:00.000Z',
          timezone: 'Africa/Johannesburg',
          originalStartAt: '2026-06-01T08:00:00.000Z',
          status: 'Scheduled',
          isException: false,
          rsvpCount: 4,
          participants: null,
          myRsvp: null,
        },
        {
          occurrenceId: 'occ-2',
          occurrenceKey: 'occ-2',
          eventSeriesId: 'event-nav-1',
          startAt: '2026-06-08T08:00:00.000Z',
          endAt: '2026-06-08T09:00:00.000Z',
          timezone: 'Africa/Johannesburg',
          originalStartAt: '2026-06-08T08:00:00.000Z',
          status: 'Scheduled',
          isException: false,
          rsvpCount: 7,
          participants: null,
          myRsvp: null,
        },
      ],
      representativeOccurrence: {
        occurrenceId: 'occ-2',
        occurrenceKey: 'occ-2',
        eventSeriesId: 'event-nav-1',
        startAt: '2026-06-08T08:00:00.000Z',
        endAt: '2026-06-08T09:00:00.000Z',
        timezone: 'Africa/Johannesburg',
        originalStartAt: '2026-06-08T08:00:00.000Z',
        status: 'Scheduled',
        isException: false,
        rsvpCount: 7,
        participants: null,
        myRsvp: null,
      },
    } as any;

    const occurrences = mapNavigableEventOccurrences(event);
    expect(occurrences.map((occurrence) => occurrence.occurrenceId)).toEqual(['occ-1', 'occ-2']);
    expect(occurrences[0].eventSeries).toMatchObject({
      eventId: 'event-nav-1',
      slug: 'navigable-series',
      title: 'Navigable Event',
    });

    const selected = mapNavigableEventToOccurrence(event, getOccurrencePublicAnchor('2026-06-08T08:00:00.000Z'));
    expect(selected?.occurrenceId).toBe('occ-2');
  });

  it('merges matching route and fetched occurrences so fetched detail data wins for the active session', () => {
    const routeOccurrence = {
      occurrenceId: 'occ-1',
      occurrenceKey: 'occ-1',
      eventSeriesId: 'event-nav-1',
      startAt: '2026-06-01T08:00:00.000Z',
      endAt: '2026-06-01T09:00:00.000Z',
      timezone: 'Africa/Johannesburg',
      originalStartAt: '2026-06-01T08:00:00.000Z',
      status: 'Scheduled',
      isException: false,
      rsvpCount: 2,
      participants: null,
      myRsvp: { participantId: 'route-rsvp', occurrenceId: 'occ-1', status: 'Going', quantity: 1 },
      eventSeries: {
        eventId: 'event-nav-1',
        slug: 'navigable-series',
        title: 'Navigable Event',
        summary: 'Thin route payload',
      },
    } as any;

    const merged = mergeNavigableOccurrences(routeOccurrence, [
      {
        ...routeOccurrence,
        rsvpCount: 5,
        participants: [{ participantId: 'participant-1', status: 'Going' }],
        eventSeries: {
          ...routeOccurrence.eventSeries,
          description: 'Fetched event detail payload',
        },
      } as any,
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      occurrenceId: 'occ-1',
      rsvpCount: 5,
      participants: [{ participantId: 'participant-1', status: 'Going' }],
      myRsvp: { participantId: 'route-rsvp', occurrenceId: 'occ-1', status: 'Going', quantity: 1 },
      eventSeries: {
        slug: 'navigable-series',
        summary: 'Thin route payload',
        description: 'Fetched event detail payload',
      },
    });
  });

  it('falls back to the first navigable occurrence and returns null when none exist', () => {
    const withoutExplicitMatch = mapNavigableEventToOccurrence(
      {
        eventId: 'event-nav-2',
        slug: 'fallback-nav-series',
        title: 'Fallback Navigable Event',
        upcomingOccurrences: [
          {
            occurrenceId: 'occ-3',
            occurrenceKey: 'occ-3',
            eventSeriesId: 'event-nav-2',
            startAt: '2026-07-01T08:00:00.000Z',
            endAt: '2026-07-01T09:00:00.000Z',
            timezone: null,
            originalStartAt: '2026-07-01T08:00:00.000Z',
            status: 'Scheduled',
            isException: false,
            rsvpCount: 2,
            participants: null,
            myRsvp: null,
          },
        ],
        representativeOccurrence: null,
      } as any,
      '2026-08-01T08:00:00.000Z',
    );

    expect(withoutExplicitMatch?.occurrenceId).toBe('occ-3');
    expect(
      mapNavigableEventToOccurrence({ upcomingOccurrences: [], representativeOccurrence: null } as any),
    ).toBeNull();
  });
});
