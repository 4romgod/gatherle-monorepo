import EventSeriesService from '@/services/eventSeries';
import type { CreateEventInput, EventSeries, SplitEventSeriesInput, UpdateEventInput } from '@gatherle/commons/types';
import { EventOccurrenceStatus, EventStatus } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventSeriesDAO: {
    create: jest.fn(),
    createSplitSuccessor: jest.fn(),
    readEventById: jest.fn(),
    updateEvent: jest.fn(),
    applySeriesSplit: jest.fn(),
    deleteEventById: jest.fn(),
    deleteEventBySlug: jest.fn(),
    readTrending: jest.fn(),
  },
}));

jest.mock('@/services/eventOccurrence', () => ({
  __esModule: true,
  default: {
    syncEventSeriesOccurrences: jest.fn(),
    deleteOccurrencesForSeries: jest.fn(),
    deleteFutureExceptionOccurrences: jest.fn(),
    moveFutureOccurrencesToSeries: jest.fn(),
    readRecurringOccurrenceContext: jest.fn(),
    splitRecurringRuleAtOccurrence: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  LOG_LEVEL_MAP: { debug: 0, info: 1, warn: 2, error: 3, none: 4 },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  initLogger: jest.fn(),
}));

import { EventSeriesDAO } from '@/mongodb/dao';
import EventOccurrenceService from '@/services/eventOccurrence';

const makeEvent = (overrides: Partial<EventSeries> = {}): EventSeries =>
  ({
    eventId: 'event-1',
    title: 'Test EventSeries',
    rsvpCount: 5,
    savedByCount: 2,
    ...overrides,
  }) as EventSeries;

const makeCreateInput = (overrides: Partial<CreateEventInput> = {}): CreateEventInput =>
  ({
    title: 'Test EventSeries',
    description: 'Test description',
    status: EventStatus.Upcoming,
    location: { locationType: 'tba' },
    primarySchedule: {
      startAt: new Date('2026-05-01T18:00:00.000Z'),
      timezone: 'Africa/Johannesburg',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
    },
    organizers: [],
    eventCategories: [],
    ...overrides,
  }) as CreateEventInput;

const makeUpdateInput = (overrides: Partial<UpdateEventInput> = {}): UpdateEventInput =>
  ({
    eventId: 'event-1',
    ...overrides,
  }) as UpdateEventInput;

describe('EventSeriesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (EventOccurrenceService.syncEventSeriesOccurrences as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceService.deleteOccurrencesForSeries as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceService.deleteFutureExceptionOccurrences as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceService.moveFutureOccurrencesToSeries as jest.Mock).mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('creates the series via the DAO and then syncs occurrences', async () => {
      const input = makeCreateInput();
      const createdEvent = makeEvent({ primarySchedule: input.primarySchedule, status: input.status });
      (EventSeriesDAO.create as jest.Mock).mockResolvedValue(createdEvent);

      const result = await EventSeriesService.create(input);

      expect(EventSeriesDAO.create).toHaveBeenCalledWith(input);
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual(createdEvent);
    });

    it('propagates DAO create errors without syncing occurrences', async () => {
      const error = new Error('create failed');
      (EventSeriesDAO.create as jest.Mock).mockRejectedValue(error);

      await expect(EventSeriesService.create(makeCreateInput())).rejects.toThrow('create failed');
      expect(EventOccurrenceService.syncEventSeriesOccurrences).not.toHaveBeenCalled();
    });

    it('fails the operation if occurrence sync fails after create', async () => {
      const createdEvent = makeEvent();
      (EventSeriesDAO.create as jest.Mock).mockResolvedValue(createdEvent);
      (EventOccurrenceService.syncEventSeriesOccurrences as jest.Mock).mockRejectedValue(new Error('sync failed'));

      await expect(EventSeriesService.create(makeCreateInput())).rejects.toMatchObject({
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    });

    it('forwards the provided status to the DAO', async () => {
      const input = makeCreateInput({ status: EventStatus.Cancelled });
      const createdEvent = makeEvent({ status: input.status });
      (EventSeriesDAO.create as jest.Mock).mockResolvedValue(createdEvent);

      const result = await EventSeriesService.create(input);

      expect(EventSeriesDAO.create).toHaveBeenCalledWith(input);
      expect(result.status).toBe(EventStatus.Cancelled);
    });
  });

  describe('update', () => {
    it('syncs occurrences after a schedule update', async () => {
      const existingEvent = makeEvent({
        primarySchedule: {
          startAt: new Date('2026-05-01T18:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        } as any,
      });
      const input = makeUpdateInput({
        primarySchedule: {
          startAt: new Date('2026-05-08T18:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        },
      });
      const updatedEvent = makeEvent({ scheduleVersion: 2, primarySchedule: input.primarySchedule });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      const result = await EventSeriesService.update(input, existingEvent);

      expect(EventSeriesDAO.updateEvent).toHaveBeenCalledWith(input);
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(updatedEvent);
      expect(result).toEqual(updatedEvent);
    });

    it('syncs occurrences after a status update', async () => {
      const input = makeUpdateInput({ status: EventStatus.Cancelled });
      const updatedEvent = makeEvent({ status: input.status });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      await EventSeriesService.update(input, makeEvent({ status: EventStatus.Upcoming }));

      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(updatedEvent);
    });

    it('does not sync occurrences for unrelated updates', async () => {
      const input = makeUpdateInput({ title: 'Renamed EventSeries' });
      const updatedEvent = makeEvent({ title: 'Renamed EventSeries' });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      const result = await EventSeriesService.update(input, makeEvent());

      expect(EventOccurrenceService.syncEventSeriesOccurrences).not.toHaveBeenCalled();
      expect(result).toEqual(updatedEvent);
    });

    it('does not sync occurrences when the provided schedule is identical', async () => {
      const existingEvent = makeEvent({
        primarySchedule: {
          startAt: new Date('2026-05-01T18:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        } as any,
      });
      const input = makeUpdateInput({ primarySchedule: existingEvent.primarySchedule });
      const updatedEvent = makeEvent({ primarySchedule: existingEvent.primarySchedule });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      const result = await EventSeriesService.update(input, existingEvent);

      expect(EventOccurrenceService.syncEventSeriesOccurrences).not.toHaveBeenCalled();
      expect(result).toEqual(updatedEvent);
    });

    it('fails the operation if occurrence sync fails after update', async () => {
      const input = makeUpdateInput({ status: EventStatus.Cancelled });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(makeEvent({ status: input.status }));
      (EventOccurrenceService.syncEventSeriesOccurrences as jest.Mock).mockRejectedValue(new Error('sync failed'));

      await expect(EventSeriesService.update(input, makeEvent({ status: EventStatus.Upcoming }))).rejects.toMatchObject(
        {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      );
    });

    it('clears future exception rows before re-syncing after a schedule update', async () => {
      const existingEvent = makeEvent({
        eventId: 'event-1',
        primarySchedule: {
          startAt: new Date('2026-05-01T18:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        } as any,
      });
      const input = makeUpdateInput({
        primarySchedule: {
          startAt: new Date('2026-05-08T18:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        },
      });
      const updatedEvent = makeEvent({ eventId: 'event-1', primarySchedule: input.primarySchedule });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      await EventSeriesService.update(input, existingEvent);

      expect(EventOccurrenceService.deleteFutureExceptionOccurrences).toHaveBeenCalledWith('event-1', expect.any(Date));
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(updatedEvent);
    });

    it('preserves future exception rows when only non-anchor schedule fields change', async () => {
      const existingEvent = makeEvent({
        eventId: 'event-1',
        primarySchedule: {
          startAt: new Date('2026-05-01T18:00:00.000Z'),
          endAt: new Date('2026-05-01T20:00:00.000Z'),
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        } as any,
      });
      const input = makeUpdateInput({
        primarySchedule: {
          startAt: new Date('2026-05-01T18:00:00.000Z'),
          endAt: new Date('2026-05-01T21:00:00.000Z'),
          timezone: 'UTC',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
        },
      });
      const updatedEvent = makeEvent({ eventId: 'event-1', primarySchedule: input.primarySchedule });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      await EventSeriesService.update(input, existingEvent);

      expect(EventOccurrenceService.deleteFutureExceptionOccurrences).not.toHaveBeenCalled();
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(updatedEvent);
    });
  });

  describe('delete', () => {
    it('deletes by id via the DAO and then cleans up occurrences', async () => {
      const deletedEvent = makeEvent();
      (EventSeriesDAO.deleteEventById as jest.Mock).mockResolvedValue(deletedEvent);

      const result = await EventSeriesService.deleteById('event-1');

      expect(EventSeriesDAO.deleteEventById).toHaveBeenCalledWith('event-1');
      expect(EventOccurrenceService.deleteOccurrencesForSeries).toHaveBeenCalledWith('event-1');
      expect(result).toEqual(deletedEvent);
    });

    it('deletes by slug via the DAO and then cleans up occurrences', async () => {
      const deletedEvent = makeEvent({ slug: 'test-event-series' });
      (EventSeriesDAO.deleteEventBySlug as jest.Mock).mockResolvedValue(deletedEvent);

      const result = await EventSeriesService.deleteBySlug('test-event-series');

      expect(EventSeriesDAO.deleteEventBySlug).toHaveBeenCalledWith('test-event-series');
      expect(EventOccurrenceService.deleteOccurrencesForSeries).toHaveBeenCalledWith('event-1');
      expect(result).toEqual(deletedEvent);
    });

    it('fails the delete if occurrence cleanup fails', async () => {
      (EventSeriesDAO.deleteEventById as jest.Mock).mockResolvedValue(makeEvent());
      (EventOccurrenceService.deleteOccurrencesForSeries as jest.Mock).mockRejectedValue(new Error('cleanup failed'));

      await expect(EventSeriesService.deleteById('event-1')).rejects.toMatchObject({
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    });
  });

  describe('readTrending', () => {
    it('delegates to EventSeriesDAO.readTrending with the provided limit', async () => {
      const mockEvents = [makeEvent({ eventId: 'e-1' }), makeEvent({ eventId: 'e-2' })];
      (EventSeriesDAO.readTrending as jest.Mock).mockResolvedValue(mockEvents);

      const result = await EventSeriesService.readTrending(5);

      expect(EventSeriesDAO.readTrending).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockEvents);
    });

    it('uses the default limit of 10 when no argument is supplied', async () => {
      (EventSeriesDAO.readTrending as jest.Mock).mockResolvedValue([]);

      await EventSeriesService.readTrending();

      expect(EventSeriesDAO.readTrending).toHaveBeenCalledWith(10);
    });

    it('returns an empty array when the DAO returns no events', async () => {
      (EventSeriesDAO.readTrending as jest.Mock).mockResolvedValue([]);

      const result = await EventSeriesService.readTrending(10);

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by EventSeriesDAO.readTrending', async () => {
      const error = new Error('DB failure');
      (EventSeriesDAO.readTrending as jest.Mock).mockRejectedValue(error);

      await expect(EventSeriesService.readTrending(10)).rejects.toThrow('DB failure');
    });
  });

  describe('splitAtOccurrence', () => {
    it('creates a successor series, relinks future occurrences, and syncs both series', async () => {
      const sourceEvent = {
        ...makeEvent({
          eventId: 'event-1',
          slug: 'weekly-yoga',
          title: 'Weekly Yoga',
          description: 'Original series',
          primarySchedule: {
            startAt: new Date('2026-05-06T16:00:00.000Z'),
            endAt: new Date('2026-05-06T18:00:00.000Z'),
            timezone: 'Africa/Johannesburg',
            recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=WE',
          },
          eventCategories: ['cat-1'] as any,
          organizers: [{ user: 'user-1', role: 'Host' }] as any,
          location: { locationType: 'tba' } as any,
        }),
      } as EventSeries;
      const pivotOccurrence = {
        occurrenceId: 'event-1#2026-05-20T16:00:00.000Z',
        eventSeriesId: 'event-1',
        occurrenceKey: 'event-1#2026-05-20T16:00:00.000Z',
        originalStartAt: new Date('2026-05-20T16:00:00.000Z'),
        startAt: new Date('2026-05-20T16:00:00.000Z'),
        endAt: new Date('2026-05-20T18:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      };
      const successorEvent = {
        ...sourceEvent,
        eventId: 'event-2',
        slug: 'weekly-yoga-from-2026-05-20',
        primarySchedule: {
          ...sourceEvent.primarySchedule,
          startAt: new Date('2026-05-20T16:00:00.000Z'),
          endAt: new Date('2026-05-20T18:00:00.000Z'),
          recurrenceRule: 'DTSTART:20260520T160000Z\nRRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE',
        },
        splitFromEventSeriesId: 'event-1',
      };
      const updatedSourceEvent = {
        ...sourceEvent,
        splitIntoEventSeriesId: 'event-2',
        scheduleVersion: 2,
        primarySchedule: {
          ...sourceEvent.primarySchedule,
          recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;UNTIL=20260520T155959Z;BYDAY=WE',
        },
      };
      (EventOccurrenceService.readRecurringOccurrenceContext as jest.Mock).mockResolvedValue({
        occurrence: pivotOccurrence,
        eventSeries: sourceEvent,
      });
      (EventOccurrenceService.splitRecurringRuleAtOccurrence as jest.Mock).mockReturnValue({
        predecessorRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;UNTIL=20260520T155959Z;BYDAY=WE',
        successorRule: 'DTSTART:20260520T160000Z\nRRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE',
      });
      (EventSeriesDAO.createSplitSuccessor as jest.Mock).mockResolvedValue(successorEvent);
      (EventSeriesDAO.applySeriesSplit as jest.Mock).mockResolvedValue(updatedSourceEvent);

      const result = await EventSeriesService.splitAtOccurrence({
        occurrenceId: pivotOccurrence.occurrenceId,
        title: 'Weekly Yoga South',
      } as SplitEventSeriesInput);

      expect(EventSeriesDAO.createSplitSuccessor).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Weekly Yoga South',
          primarySchedule: expect.objectContaining({
            recurrenceRule: 'DTSTART:20260520T160000Z\nRRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE',
          }),
        }),
        'weekly-yoga-from-2026-05-20',
        'event-1',
      );
      expect(EventSeriesDAO.applySeriesSplit).toHaveBeenCalledWith(
        'event-1',
        'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;UNTIL=20260520T155959Z;BYDAY=WE',
        'event-2',
      );
      expect(EventOccurrenceService.moveFutureOccurrencesToSeries).toHaveBeenCalledWith(
        'event-1',
        'event-2',
        new Date('2026-05-20T16:00:00.000Z'),
        1,
      );
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(updatedSourceEvent);
      expect(EventOccurrenceService.syncEventSeriesOccurrences).toHaveBeenCalledWith(successorEvent);
      expect(result).toEqual(successorEvent);
    });

    it('fails loudly when an organizer cannot be normalized for the successor series', async () => {
      const sourceEvent = {
        ...makeEvent({
          eventId: 'event-1',
          slug: 'weekly-yoga',
          title: 'Weekly Yoga',
          description: 'Original series',
          primarySchedule: {
            startAt: new Date('2026-05-06T16:00:00.000Z'),
            endAt: new Date('2026-05-06T18:00:00.000Z'),
            timezone: 'Africa/Johannesburg',
            recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=WE',
          },
          eventCategories: ['cat-1'] as any,
          organizers: [{ user: { username: 'broken-shape' }, role: 'Host' }] as any,
          location: { locationType: 'tba' } as any,
        }),
      } as EventSeries;
      const pivotOccurrence = {
        occurrenceId: 'event-1#2026-05-20T16:00:00.000Z',
        eventSeriesId: 'event-1',
        occurrenceKey: 'event-1#2026-05-20T16:00:00.000Z',
        originalStartAt: new Date('2026-05-20T16:00:00.000Z'),
        startAt: new Date('2026-05-20T16:00:00.000Z'),
        endAt: new Date('2026-05-20T18:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      };
      (EventOccurrenceService.readRecurringOccurrenceContext as jest.Mock).mockResolvedValue({
        occurrence: pivotOccurrence,
        eventSeries: sourceEvent,
      });
      (EventOccurrenceService.splitRecurringRuleAtOccurrence as jest.Mock).mockReturnValue({
        predecessorRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;UNTIL=20260520T155959Z;BYDAY=WE',
        successorRule: 'DTSTART:20260520T160000Z\nRRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE',
      });

      await expect(
        EventSeriesService.splitAtOccurrence({
          occurrenceId: pivotOccurrence.occurrenceId,
        } as SplitEventSeriesInput),
      ).rejects.toThrow('Unable to normalize event organizer user reference.');
      expect(EventSeriesDAO.createSplitSuccessor).not.toHaveBeenCalled();
    });

    it('fails loudly when an event category cannot be normalized for the successor series', async () => {
      const sourceEvent = {
        ...makeEvent({
          eventId: 'event-1',
          slug: 'weekly-yoga',
          title: 'Weekly Yoga',
          description: 'Original series',
          primarySchedule: {
            startAt: new Date('2026-05-06T16:00:00.000Z'),
            endAt: new Date('2026-05-06T18:00:00.000Z'),
            timezone: 'Africa/Johannesburg',
            recurrenceRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=WE',
          },
          eventCategories: [{ slug: 'broken-shape' }] as any,
          organizers: [{ user: 'user-1', role: 'Host' }] as any,
          location: { locationType: 'tba' } as any,
        }),
      } as EventSeries;
      const pivotOccurrence = {
        occurrenceId: 'event-1#2026-05-20T16:00:00.000Z',
        eventSeriesId: 'event-1',
        occurrenceKey: 'event-1#2026-05-20T16:00:00.000Z',
        originalStartAt: new Date('2026-05-20T16:00:00.000Z'),
        startAt: new Date('2026-05-20T16:00:00.000Z'),
        endAt: new Date('2026-05-20T18:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      };
      (EventOccurrenceService.readRecurringOccurrenceContext as jest.Mock).mockResolvedValue({
        occurrence: pivotOccurrence,
        eventSeries: sourceEvent,
      });
      (EventOccurrenceService.splitRecurringRuleAtOccurrence as jest.Mock).mockReturnValue({
        predecessorRule: 'DTSTART:20260506T160000Z\nRRULE:FREQ=WEEKLY;UNTIL=20260520T155959Z;BYDAY=WE',
        successorRule: 'DTSTART:20260520T160000Z\nRRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE',
      });

      await expect(
        EventSeriesService.splitAtOccurrence({
          occurrenceId: pivotOccurrence.occurrenceId,
        } as SplitEventSeriesInput),
      ).rejects.toThrow('Unable to normalize event category reference.');
      expect(EventSeriesDAO.createSplitSuccessor).not.toHaveBeenCalled();
    });
  });
});
