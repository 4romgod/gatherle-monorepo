import EventSeriesService from '@/services/eventSeries';
import type { CreateEventInput, EventSeries, UpdateEventInput } from '@gatherle/commons/types';
import { EventStatus } from '@gatherle/commons/types';

jest.mock('@/mongodb/dao', () => ({
  EventSeriesDAO: {
    create: jest.fn(),
    readEventById: jest.fn(),
    updateEvent: jest.fn(),
    deleteEventById: jest.fn(),
    deleteEventBySlug: jest.fn(),
    readTrending: jest.fn(),
  },
}));

jest.mock('@/services/eventOccurrence', () => ({
  __esModule: true,
  default: {
    syncRecurringSeriesOccurrences: jest.fn(),
    deleteOccurrencesForSeries: jest.fn(),
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
    (EventOccurrenceService.syncRecurringSeriesOccurrences as jest.Mock).mockResolvedValue(undefined);
    (EventOccurrenceService.deleteOccurrencesForSeries as jest.Mock).mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('creates the series via the DAO and then syncs occurrences', async () => {
      const input = makeCreateInput();
      const createdEvent = makeEvent({ primarySchedule: input.primarySchedule, status: input.status });
      (EventSeriesDAO.create as jest.Mock).mockResolvedValue(createdEvent);

      const result = await EventSeriesService.create(input);

      expect(EventSeriesDAO.create).toHaveBeenCalledWith(input);
      expect(EventOccurrenceService.syncRecurringSeriesOccurrences).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual(createdEvent);
    });

    it('propagates DAO create errors without syncing occurrences', async () => {
      const error = new Error('create failed');
      (EventSeriesDAO.create as jest.Mock).mockRejectedValue(error);

      await expect(EventSeriesService.create(makeCreateInput())).rejects.toThrow('create failed');
      expect(EventOccurrenceService.syncRecurringSeriesOccurrences).not.toHaveBeenCalled();
    });

    it('fails the operation if occurrence sync fails after create', async () => {
      const createdEvent = makeEvent();
      (EventSeriesDAO.create as jest.Mock).mockResolvedValue(createdEvent);
      (EventOccurrenceService.syncRecurringSeriesOccurrences as jest.Mock).mockRejectedValue(new Error('sync failed'));

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
      expect(EventOccurrenceService.syncRecurringSeriesOccurrences).toHaveBeenCalledWith(updatedEvent);
      expect(result).toEqual(updatedEvent);
    });

    it('syncs occurrences after a status update', async () => {
      const input = makeUpdateInput({ status: EventStatus.Cancelled });
      const updatedEvent = makeEvent({ status: input.status });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      await EventSeriesService.update(input, makeEvent({ status: EventStatus.Upcoming }));

      expect(EventOccurrenceService.syncRecurringSeriesOccurrences).toHaveBeenCalledWith(updatedEvent);
    });

    it('does not sync occurrences for unrelated updates', async () => {
      const input = makeUpdateInput({ title: 'Renamed EventSeries' });
      const updatedEvent = makeEvent({ title: 'Renamed EventSeries' });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(updatedEvent);

      const result = await EventSeriesService.update(input, makeEvent());

      expect(EventOccurrenceService.syncRecurringSeriesOccurrences).not.toHaveBeenCalled();
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

      expect(EventOccurrenceService.syncRecurringSeriesOccurrences).not.toHaveBeenCalled();
      expect(result).toEqual(updatedEvent);
    });

    it('fails the operation if occurrence sync fails after update', async () => {
      const input = makeUpdateInput({ status: EventStatus.Cancelled });
      (EventSeriesDAO.updateEvent as jest.Mock).mockResolvedValue(makeEvent({ status: input.status }));
      (EventOccurrenceService.syncRecurringSeriesOccurrences as jest.Mock).mockRejectedValue(new Error('sync failed'));

      await expect(EventSeriesService.update(input, makeEvent({ status: EventStatus.Upcoming }))).rejects.toMatchObject(
        {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      );
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
});
