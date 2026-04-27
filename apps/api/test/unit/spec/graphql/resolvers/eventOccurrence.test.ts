import DataLoader from 'dataloader';
import { EventOccurrenceResolver } from '@/graphql/resolvers/eventOccurrence';
import { EventSeriesParticipantDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import type {
  EventOccurrence,
  EventOccurrenceParticipant,
  EventSeries,
  EventSeriesParticipant,
} from '@gatherle/commons/types';
import { EventStatus, ParticipantStatus } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventSeriesParticipantDAO: {
    readByEvent: jest.fn(),
    readByEventAndUser: jest.fn(),
  },
}));

describe('EventOccurrenceResolver field resolvers', () => {
  const resolver = new EventOccurrenceResolver();
  const recurringEventSeries: EventSeries = {
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
  const singleEventSeries: EventSeries = {
    ...recurringEventSeries,
    eventId: 'series-2',
    primarySchedule: {
      startAt: new Date('2026-05-07T10:00:00.000Z'),
      endAt: new Date('2026-05-07T12:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'DTSTART:20260507T100000Z\nRRULE:FREQ=DAILY;COUNT=1',
    },
  };
  const recurringOccurrence: EventOccurrence = {
    occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
    eventSeriesId: 'series-1',
    occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
    originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
    startAt: new Date('2026-05-06T16:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: 'Scheduled' as any,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const singleOccurrence: EventOccurrence = {
    ...recurringOccurrence,
    occurrenceId: 'series-2#2026-05-07T10:00:00.000Z',
    eventSeriesId: 'series-2',
    occurrenceKey: 'series-2#2026-05-07T10:00:00.000Z',
    originalStartAt: new Date('2026-05-07T10:00:00.000Z'),
    startAt: new Date('2026-05-07T10:00:00.000Z'),
  };
  const occurrenceParticipant: EventOccurrenceParticipant = {
    participantId: 'participant-occ-1',
    occurrenceId: recurringOccurrence.occurrenceId,
    userId: 'user-1',
    status: ParticipantStatus.Going,
    quantity: 1,
    rsvpAt: new Date(),
  };
  const seriesParticipant: EventSeriesParticipant = {
    participantId: 'participant-series-1',
    eventId: singleEventSeries.eventId,
    userId: 'user-1',
    status: ParticipantStatus.Going,
    quantity: 1,
    rsvpAt: new Date(),
  };

  const context: ServerContext = {
    user: {
      userId: 'user-1',
      email: 'user@example.com',
      username: 'user1',
      userRole: 'User' as any,
      isTestUser: true,
    },
    loaders: {
      user: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventCategory: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventCategoryInterestCount: new DataLoader(async (keys: readonly string[]) => keys.map(() => 0)),
      eventSeries: new DataLoader(async (keys: readonly string[]) =>
        keys.map((key) => (key === recurringEventSeries.eventId ? recurringEventSeries : singleEventSeries)),
      ),
      eventOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      organization: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventSeriesParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventSeriesParticipantsByEvent: new DataLoader(async (keys: readonly string[]) =>
        keys.map(() => [seriesParticipant]),
      ),
      eventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) => keys.map(() => null)),
      eventOccurrenceParticipantsByOccurrence: new DataLoader(async (keys: readonly string[]) =>
        keys.map(() => [occurrenceParticipant]),
      ),
      eventOccurrenceParticipantCountByOccurrence: new DataLoader(async (keys: readonly string[]) => keys.map(() => 1)),
      myEventOccurrenceParticipant: new DataLoader(async (keys: readonly string[]) =>
        keys.map(() => occurrenceParticipant),
      ),
    },
  } as ServerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    (EventSeriesParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(seriesParticipant);
    (EventSeriesParticipantDAO.readByEvent as jest.Mock).mockResolvedValue([seriesParticipant]);
  });

  it('resolves recurring occurrence participants from the new occurrence participant loaders', async () => {
    const result = await resolver.participants(recurringOccurrence, context);

    expect(result).toHaveLength(1);
    expect(result[0].occurrenceId).toBe(recurringOccurrence.occurrenceId);
  });

  it('maps series participants into occurrence participants for synthetic single-event occurrences', async () => {
    const result = await resolver.myRsvp(singleOccurrence, context);

    expect(EventSeriesParticipantDAO.readByEventAndUser).toHaveBeenCalledWith(singleEventSeries.eventId, 'user-1');
    expect(result).toEqual(
      expect.objectContaining({
        participantId: seriesParticipant.participantId,
        occurrenceId: singleOccurrence.occurrenceId,
        status: ParticipantStatus.Going,
      }),
    );
  });

  it('uses the occurrence participant count loader for recurring occurrences', async () => {
    const result = await resolver.rsvpCount(recurringOccurrence, context);

    expect(result).toBe(1);
  });

  it('sums active RSVP quantity for synthetic single-event occurrences', async () => {
    (EventSeriesParticipantDAO.readByEvent as jest.Mock).mockResolvedValue([
      { ...seriesParticipant, quantity: 2, status: ParticipantStatus.Interested },
      {
        ...seriesParticipant,
        participantId: 'participant-series-2',
        userId: 'user-2',
        status: ParticipantStatus.CheckedIn,
      },
      {
        ...seriesParticipant,
        participantId: 'participant-series-3',
        userId: 'user-3',
        status: ParticipantStatus.Cancelled,
      },
    ]);

    const result = await resolver.rsvpCount(singleOccurrence, context);

    expect(EventSeriesParticipantDAO.readByEvent).toHaveBeenCalledWith(singleEventSeries.eventId);
    expect(result).toBe(3);
  });
});
