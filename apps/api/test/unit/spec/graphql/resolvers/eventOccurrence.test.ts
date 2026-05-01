import DataLoader from 'dataloader';
import { EventOccurrenceResolver } from '@/graphql/resolvers/eventOccurrence';
import type { ServerContext } from '@/graphql';
import type { EventOccurrence, EventOccurrenceParticipant, EventSeries, User } from '@gatherle/commons/types';
import { EventStatus, ParticipantStatus } from '@gatherle/commons/types';
import { buildMyEventOccurrenceParticipantLoadKey } from '@/utils';

describe('EventOccurrenceResolver field resolvers', () => {
  const resolver = new EventOccurrenceResolver();

  const eventSeries: EventSeries = {
    eventId: 'series-1',
    slug: 'weekly-yoga',
    title: 'Weekly Yoga',
    description: 'Weekly class',
    primarySchedule: {
      startAt: new Date('2026-05-06T16:00:00.000Z'),
      endAt: new Date('2026-05-06T18:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=WE',
    },
    location: { type: 'Online', coordinates: [0, 0] } as any,
    status: EventStatus.Upcoming,
    eventCategories: [],
    organizers: [],
  } as EventSeries;

  const occurrence: EventOccurrence = {
    occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
    eventSeriesId: 'series-1',
    occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
    originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
    startAt: new Date('2026-05-06T16:00:00.000Z'),
    endAt: new Date('2026-05-06T18:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: 'Scheduled' as any,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const occurrenceParticipant: EventOccurrenceParticipant = {
    participantId: 'participant-occ-1',
    occurrenceId: occurrence.occurrenceId,
    userId: 'user-1',
    status: ParticipantStatus.Going,
    quantity: 1,
    rsvpAt: new Date(),
  };

  const user: User = {
    userId: 'user-1',
    email: 'user@example.com',
    username: 'user1',
    password: '',
    given_name: 'User',
    family_name: 'One',
    userRole: 'User' as any,
    isTestUser: true,
    interests: [],
  };

  const context: ServerContext = {
    user,
    loaders: {
      user: new DataLoader(async (keys: readonly string[]) => keys.map(() => user)),
      eventCategory: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventCategoryInterestCount: new DataLoader(async (keys: readonly string[]) => keys.map(() => 0)),
      eventSeries: new DataLoader(async (keys: readonly string[]) => keys.map(() => eventSeries)),
      eventOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => occurrence)),
      eventOccurrenceByEventSeries: new DataLoader(async (keys: readonly string[]) => keys.map(() => occurrence)),
      organization: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) =>
        keys.map(() => occurrenceParticipant),
      ),
      eventOccurrenceParticipantsByOccurrence: new DataLoader(async (keys: readonly string[]) =>
        keys.map(() => [occurrenceParticipant]),
      ),
      eventOccurrenceParticipantCountByOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => 3)),
      myEventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) => {
        const expectedKey = buildMyEventOccurrenceParticipantLoadKey(occurrence.occurrenceId, user.userId);
        return keys.map((key) => (key === expectedKey ? occurrenceParticipant : null));
      }),
    },
  } as ServerContext;

  it('resolves participants from the occurrence participant loaders and enriches them with user data', async () => {
    const result = await resolver.participants(occurrence, context);

    expect(result).toEqual([
      expect.objectContaining({
        participantId: occurrenceParticipant.participantId,
        occurrenceId: occurrence.occurrenceId,
        user: expect.objectContaining({ userId: user.userId }),
      }),
    ]);
  });

  it('uses the occurrence participant count loader when the count is not already populated', async () => {
    const result = await resolver.rsvpCount(occurrence, context);

    expect(result).toBe(3);
  });

  it('prefers the preloaded occurrence RSVP count when present on the root object', async () => {
    const result = await resolver.rsvpCount({ ...occurrence, rsvpCount: 7 }, context);

    expect(result).toBe(7);
  });

  it('resolves the current user RSVP through the myEventOccurrenceParticipant loader', async () => {
    const result = await resolver.myRsvp(occurrence, context);

    expect(result).toEqual(
      expect.objectContaining({
        participantId: occurrenceParticipant.participantId,
        status: ParticipantStatus.Going,
      }),
    );
  });

  it('returns null for myRsvp when the request is unauthenticated', async () => {
    const unauthenticatedContext = { ...context, user: undefined } as ServerContext;

    const result = await resolver.myRsvp(occurrence, unauthenticatedContext);

    expect(result).toBeNull();
  });
});
