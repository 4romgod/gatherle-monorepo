import { sortEventOccurrencesForViewer } from '@/lib/events/personalization';

const makeEvent = (
  occurrenceId: string,
  {
    categories = [],
    city,
    country = 'South Africa',
    savedByCount = 0,
    startAt = '2026-06-10T18:00:00.000Z',
    state = 'Gauteng',
  }: {
    categories?: Array<{ eventCategoryId?: string; name?: string; slug?: string }>;
    city?: string;
    country?: string;
    savedByCount?: number;
    startAt?: string;
    state?: string;
  } = {},
) =>
  ({
    occurrenceId,
    rsvpCount: 0,
    startAt,
    eventSeries: {
      eventCategories: categories,
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

describe('mobile event personalization', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ranks local interest matches ahead of generic upcoming events', () => {
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

  it('uses event timing as a tie-breaker for equally relevant matches', () => {
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

  it('keeps the original order when no profile interests or location are available', () => {
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
});
