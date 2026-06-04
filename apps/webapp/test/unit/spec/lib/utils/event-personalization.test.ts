import { sortEventOccurrencesForViewer } from '@/lib/utils/event-personalization';

const makeEvent = (
  occurrenceId: string,
  {
    categories = [],
    city,
    country = 'South Africa',
    isSavedByMe = false,
    myRsvpStatus = null,
    rsvpCount = 0,
    savedByCount = 0,
    startAt = '2026-06-10T18:00:00.000Z',
    state = 'Gauteng',
  }: {
    categories?: Array<{ eventCategoryId?: string; name?: string; slug?: string }>;
    city?: string;
    country?: string;
    isSavedByMe?: boolean;
    myRsvpStatus?: string | null;
    rsvpCount?: number;
    savedByCount?: number;
    startAt?: string;
    state?: string;
  } = {},
) =>
  ({
    occurrenceId,
    myRsvp: myRsvpStatus ? { status: myRsvpStatus } : null,
    rsvpCount,
    startAt,
    eventSeries: {
      eventCategories: categories,
      isSavedByMe,
      location: {
        address: {
          city,
          country,
          state,
        },
      },
      savedByCount,
    },
  }) as any;

describe('event-personalization', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pushes interest and local matches to the top of the events feed', () => {
    const events = [
      makeEvent('generic-early', { city: 'Durban', startAt: '2026-06-05T18:00:00.000Z' }),
      makeEvent('interest-match', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Cape Town',
        startAt: '2026-06-09T18:00:00.000Z',
      }),
      makeEvent('interest-and-local', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Johannesburg',
        startAt: '2026-06-08T18:00:00.000Z',
      }),
    ];

    const sorted = sortEventOccurrencesForViewer(events, {
      interests: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
      location: { city: 'Johannesburg', country: 'South Africa', state: 'Gauteng' },
    });

    expect(sorted.map((event: any) => event.occurrenceId)).toEqual([
      'interest-and-local',
      'interest-match',
      'generic-early',
    ]);
  });

  it('falls back to sooner events when two items have the same personalization score', () => {
    const events = [
      makeEvent('later-match', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Cape Town',
        startAt: '2026-06-12T18:00:00.000Z',
      }),
      makeEvent('earlier-match', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Cape Town',
        startAt: '2026-06-06T18:00:00.000Z',
      }),
    ];

    const sorted = sortEventOccurrencesForViewer(events, {
      interests: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
    });

    expect(sorted.map((event: any) => event.occurrenceId)).toEqual(['earlier-match', 'later-match']);
  });

  it('keeps the original ordering when there are no viewer signals to personalize against', () => {
    const events = [
      makeEvent('first', { city: 'Cape Town' }),
      makeEvent('second', { city: 'Johannesburg', savedByCount: 12 }),
    ];

    const sorted = sortEventOccurrencesForViewer(events, {
      interests: [],
      location: null,
    });

    expect(sorted.map((event: any) => event.occurrenceId)).toEqual(['first', 'second']);
  });

  it('returns the original array for a single event and when viewer signals produce no matches', () => {
    const singleEvent = [makeEvent('solo', { city: 'Cape Town' })];
    const singleSorted = sortEventOccurrencesForViewer(singleEvent as any, {
      interests: ['music'],
      location: { city: 'Johannesburg' },
    });

    expect(singleSorted).toBe(singleEvent);

    const unmatchedEvents = [makeEvent('first', { city: 'Cape Town' }), makeEvent('second', { city: 'Durban' })];
    const unmatchedSorted = sortEventOccurrencesForViewer(unmatchedEvents as any, {
      interests: ['comedy'],
      location: { city: 'Johannesburg' },
    });

    expect(unmatchedSorted).toBe(unmatchedEvents);
  });

  it('supports string interests, multi-category boosts, and support signals for matched events only', () => {
    const events = [
      makeEvent('matched-rich', {
        categories: [
          { eventCategoryId: 'music', name: 'Music', slug: 'music' },
          { eventCategoryId: 'nightlife', name: 'Night Life', slug: 'night-life' },
        ],
        city: 'Johannesburg',
        isSavedByMe: true,
        myRsvpStatus: 'Going',
        rsvpCount: 25,
        savedByCount: 30,
        startAt: '2026-06-03T18:00:00.000Z',
      }),
      makeEvent('popular-but-unmatched', {
        categories: [{ eventCategoryId: 'sports', name: 'Sports', slug: 'sports' }],
        city: 'Cape Town',
        rsvpCount: 100,
        savedByCount: 100,
        startAt: '2026-06-02T18:00:00.000Z',
      }),
      makeEvent('matched-lean', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Johannesburg',
        startAt: '2026-06-20T18:00:00.000Z',
      }),
    ];

    const sorted = sortEventOccurrencesForViewer(events as any, {
      interests: [' MUSIC ', 'night-life'],
      location: { city: 'Johannesburg' },
    });

    expect(sorted.map((event: any) => event.occurrenceId)).toEqual([
      'matched-rich',
      'matched-lean',
      'popular-but-unmatched',
    ]);
  });

  it('falls back from city to state and country matches and handles invalid or missing start times', () => {
    const events = [
      makeEvent('country-match', {
        city: 'Paris',
        country: 'France',
        startAt: '2026-06-25T18:00:00.000Z',
      }),
      makeEvent('state-match', {
        city: 'Cape Town',
        country: 'South Africa',
        startAt: null as any,
        state: 'Western Cape',
      }),
      makeEvent('city-match', {
        city: 'Berlin',
        country: 'Germany',
        startAt: 'not-a-date',
        state: 'Berlin',
      }),
    ];

    const sorted = sortEventOccurrencesForViewer(events as any, {
      location: { city: 'Berlin', country: 'France', state: 'Western Cape' },
    });

    expect(sorted.map((event: any) => event.occurrenceId)).toEqual(['city-match', 'state-match', 'country-match']);
  });

  it('applies urgency tiers before stable ordering when matched events tie on base signals', () => {
    const events = [
      makeEvent('within-30-days', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Johannesburg',
        startAt: '2026-06-25T18:00:00.000Z',
      }),
      makeEvent('within-14-days', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Johannesburg',
        startAt: '2026-06-12T18:00:00.000Z',
      }),
      makeEvent('within-7-days', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Johannesburg',
        startAt: '2026-06-07T18:00:00.000Z',
      }),
      makeEvent('within-3-days', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Johannesburg',
        startAt: '2026-06-02T18:00:00.000Z',
      }),
      makeEvent('past-match', {
        categories: [{ eventCategoryId: 'music', name: 'Music', slug: 'music' }],
        city: 'Johannesburg',
        startAt: '2026-05-25T18:00:00.000Z',
      }),
    ];

    const sorted = sortEventOccurrencesForViewer(events as any, {
      interests: [{ eventCategoryId: 'music' }],
      location: { city: 'Johannesburg' },
    });

    expect(sorted.map((event: any) => event.occurrenceId)).toEqual([
      'within-3-days',
      'within-7-days',
      'within-14-days',
      'within-30-days',
      'past-match',
    ]);
  });
});
