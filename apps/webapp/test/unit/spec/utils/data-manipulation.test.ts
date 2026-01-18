import { groupEventsByCategory } from '@/lib/utils/data-manipulation';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { EventStatus } from '@/data/graphql/types/graphql';

// Mock event factory - matches the EventPreview type from GetAllEventsQuery
const createMockEvent = (overrides: Partial<EventPreview> = {}): EventPreview => ({
  eventId: 'event-1',
  title: 'Test Event',
  slug: 'test-event',
  description: 'Test description',
  recurrenceRule: 'FREQ=DAILY;COUNT=1',
  status: EventStatus.Upcoming,
  eventCategories: [],
  organizers: [],
  location: {
    locationType: 'venue',
    address: {
      city: 'London',
      state: 'England',
      zipCode: 'SW1A 1AA',
      country: 'UK',
    },
  },
  ...overrides,
});

const createMockCategory = (name: string, id?: string) => ({
  eventCategoryId: id || `cat-${name.toLowerCase()}`,
  name,
  slug: name.toLowerCase(),
  iconName: 'default',
  description: `${name} events`,
  color: '#000000',
});

describe('groupEventsByCategory', () => {
  it('should return empty object for empty events array', () => {
    const result = groupEventsByCategory([]);
    expect(result).toEqual({});
  });

  it('should group events with no categories under "All events"', () => {
    const events = [
      createMockEvent({ eventId: '1', eventCategories: [] }),
      createMockEvent({ eventId: '2', eventCategories: [] }),
    ];

    const result = groupEventsByCategory(events);

    expect(Object.keys(result)).toEqual(['All events']);
    expect(result['All events']).toHaveLength(2);
  });

  it('should group events by their category names', () => {
    const musicCategory = createMockCategory('Music');
    const sportsCategory = createMockCategory('Sports');

    const events = [
      createMockEvent({ eventId: '1', eventCategories: [musicCategory] }),
      createMockEvent({ eventId: '2', eventCategories: [sportsCategory] }),
      createMockEvent({ eventId: '3', eventCategories: [musicCategory] }),
    ];

    const result = groupEventsByCategory(events);

    expect(Object.keys(result).sort()).toEqual(['Music', 'Sports']);
    expect(result['Music']).toHaveLength(2);
    expect(result['Sports']).toHaveLength(1);
  });

  it('should handle events with multiple categories (event appears in each)', () => {
    const musicCategory = createMockCategory('Music');
    const festivalCategory = createMockCategory('Festival');

    const events = [
      createMockEvent({ 
        eventId: '1', 
        eventCategories: [musicCategory, festivalCategory] 
      }),
    ];

    const result = groupEventsByCategory(events);

    expect(Object.keys(result).sort()).toEqual(['Festival', 'Music']);
    expect(result['Music']).toHaveLength(1);
    expect(result['Festival']).toHaveLength(1);
    // Same event should be in both categories
    expect(result['Music'][0].eventId).toBe('1');
    expect(result['Festival'][0].eventId).toBe('1');
  });

  it('should handle mix of categorized and uncategorized events', () => {
    const musicCategory = createMockCategory('Music');

    const events = [
      createMockEvent({ eventId: '1', eventCategories: [musicCategory] }),
      createMockEvent({ eventId: '2', eventCategories: [] }),
      createMockEvent({ eventId: '3', eventCategories: undefined as any }),
    ];

    const result = groupEventsByCategory(events);

    expect(result['Music']).toHaveLength(1);
    expect(result['All events']).toHaveLength(2);
  });

  it('should fallback to "All events" when no grouping occurred but events exist', () => {
    // Edge case: events with null/undefined categories that don't match the forEach logic
    const events = [
      createMockEvent({ eventId: '1', eventCategories: null as any }),
    ];

    const result = groupEventsByCategory(events);

    // Should still have the events under "All events"
    expect(result['All events']).toHaveLength(1);
  });
});
