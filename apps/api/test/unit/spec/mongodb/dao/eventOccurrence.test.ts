import { GraphQLError } from 'graphql';
import { EventOccurrenceDAO } from '@/mongodb/dao';
import { EventOccurrence as EventOccurrenceModel } from '@/mongodb/models';
import { EventOccurrenceStatus, type EventOccurrence } from '@gatherle/commons/types';
import { createMockSuccessMongooseQuery, createMockFailedMongooseQuery, type MockQueryOptions } from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  EventOccurrence: {
    bulkWrite: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
  },
}));

const FIND_CHAIN_METHODS: MockQueryOptions = { chainMethods: ['sort', 'limit', 'lean'] };

describe('EventOccurrenceDAO', () => {
  const occurrence: EventOccurrence = {
    occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
    eventSeriesId: 'series-1',
    occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
    originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
    startAt: new Date('2026-05-06T16:00:00.000Z'),
    endAt: new Date('2026-05-06T19:00:00.000Z'),
    timezone: 'Africa/Johannesburg',
    status: EventOccurrenceStatus.Scheduled,
    isException: false,
    seriesScheduleVersion: 1,
    createdAt: new Date('2026-04-27T00:00:00.000Z'),
    updatedAt: new Date('2026-04-27T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpsert', () => {
    it('returns early when no occurrences are provided', async () => {
      await EventOccurrenceDAO.bulkUpsert([]);

      expect(EventOccurrenceModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('upserts occurrences by occurrenceKey', async () => {
      (EventOccurrenceModel.bulkWrite as jest.Mock).mockResolvedValue(undefined);

      await EventOccurrenceDAO.bulkUpsert([occurrence]);

      expect(EventOccurrenceModel.bulkWrite).toHaveBeenCalledWith(
        [
          {
            updateOne: {
              filter: { occurrenceKey: occurrence.occurrenceKey },
              update: {
                $set: {
                  eventSeriesId: occurrence.eventSeriesId,
                  occurrenceKey: occurrence.occurrenceKey,
                  originalStartAt: occurrence.originalStartAt,
                  startAt: occurrence.startAt,
                  endAt: occurrence.endAt,
                  timezone: occurrence.timezone,
                  status: occurrence.status,
                  isException: occurrence.isException,
                  seriesScheduleVersion: occurrence.seriesScheduleVersion,
                },
                $setOnInsert: {
                  occurrenceId: occurrence.occurrenceId,
                },
              },
              upsert: true,
            },
          },
        ],
        { ordered: false },
      );
    });

    it('omits endAt from the update payload when an occurrence has no end time', async () => {
      (EventOccurrenceModel.bulkWrite as jest.Mock).mockResolvedValue(undefined);

      await EventOccurrenceDAO.bulkUpsert([
        {
          ...occurrence,
          endAt: undefined,
        },
      ]);

      expect(EventOccurrenceModel.bulkWrite).toHaveBeenCalledWith(
        [
          {
            updateOne: {
              filter: { occurrenceKey: occurrence.occurrenceKey },
              update: {
                $set: {
                  eventSeriesId: occurrence.eventSeriesId,
                  occurrenceKey: occurrence.occurrenceKey,
                  originalStartAt: occurrence.originalStartAt,
                  startAt: occurrence.startAt,
                  timezone: occurrence.timezone,
                  status: occurrence.status,
                  isException: occurrence.isException,
                  seriesScheduleVersion: occurrence.seriesScheduleVersion,
                },
                $setOnInsert: {
                  occurrenceId: occurrence.occurrenceId,
                },
              },
              upsert: true,
            },
          },
        ],
        { ordered: false },
      );
    });

    it('wraps bulk write failures', async () => {
      (EventOccurrenceModel.bulkWrite as jest.Mock).mockRejectedValue(new Error('bulk write failed'));

      await expect(EventOccurrenceDAO.bulkUpsert([occurrence])).rejects.toThrow(GraphQLError);
    });
  });

  describe('deleteMissingGeneratedOccurrences', () => {
    it('deletes only generated rows that are no longer present', async () => {
      (EventOccurrenceModel.deleteMany as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ deletedCount: 2 }),
      );

      await EventOccurrenceDAO.deleteMissingGeneratedOccurrences('series-1', [occurrence.occurrenceKey]);

      expect(EventOccurrenceModel.deleteMany).toHaveBeenCalledWith({
        eventSeriesId: 'series-1',
        isException: false,
        occurrenceKey: { $nin: [occurrence.occurrenceKey] },
      });
    });

    it('wraps delete failures when pruning stale occurrences', async () => {
      (EventOccurrenceModel.deleteMany as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('delete failed')),
      );

      await expect(
        EventOccurrenceDAO.deleteMissingGeneratedOccurrences('series-1', [occurrence.occurrenceKey]),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('deleteByEventSeriesId', () => {
    it('deletes all occurrences for the series', async () => {
      (EventOccurrenceModel.deleteMany as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ deletedCount: 3 }),
      );

      await EventOccurrenceDAO.deleteByEventSeriesId('series-1');

      expect(EventOccurrenceModel.deleteMany).toHaveBeenCalledWith({ eventSeriesId: 'series-1' });
    });

    it('wraps delete failures when removing all occurrences for a series', async () => {
      (EventOccurrenceModel.deleteMany as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('delete failed')),
      );

      await expect(EventOccurrenceDAO.deleteByEventSeriesId('series-1')).rejects.toThrow(GraphQLError);
    });
  });

  describe('readByEventSeriesIdsInRange', () => {
    it('reads overlapping occurrences for the provided series IDs', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([occurrence], FIND_CHAIN_METHODS),
      );

      const startDate = new Date('2026-05-01T00:00:00.000Z');
      const endDate = new Date('2026-05-31T23:59:59.999Z');
      const results = await EventOccurrenceDAO.readByEventSeriesIdsInRange(
        ['series-1', 'series-2'],
        startDate,
        endDate,
      );

      expect(results).toEqual([occurrence]);
      expect(EventOccurrenceModel.find).toHaveBeenCalledWith({
        eventSeriesId: { $in: ['series-1', 'series-2'] },
        startAt: { $lte: endDate },
        $or: [{ endAt: { $gte: startDate } }, { endAt: { $exists: false }, startAt: { $gte: startDate } }],
      });
    });

    it('returns early when no series IDs are provided', async () => {
      const results = await EventOccurrenceDAO.readByEventSeriesIdsInRange(
        [],
        new Date('2026-05-01T00:00:00.000Z'),
        new Date('2026-05-31T23:59:59.999Z'),
      );

      expect(results).toEqual([]);
      expect(EventOccurrenceModel.find).not.toHaveBeenCalled();
    });

    it('wraps read failures when querying overlapping occurrences', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed'), FIND_CHAIN_METHODS),
      );

      await expect(
        EventOccurrenceDAO.readByEventSeriesIdsInRange(
          ['series-1'],
          new Date('2026-05-01T00:00:00.000Z'),
          new Date('2026-05-31T23:59:59.999Z'),
        ),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('readUpcomingByEventSeriesId', () => {
    it('reads upcoming overlapping occurrences for one series in ascending start order', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([occurrence], FIND_CHAIN_METHODS),
      );

      const fromDate = new Date('2026-05-01T00:00:00.000Z');
      const results = await EventOccurrenceDAO.readUpcomingByEventSeriesId('series-1', fromDate, 5);

      expect(results).toEqual([occurrence]);
      expect(EventOccurrenceModel.find).toHaveBeenCalledWith({
        eventSeriesId: 'series-1',
        $or: [{ endAt: { $gte: fromDate } }, { endAt: { $exists: false }, startAt: { $gte: fromDate } }],
      });
    });

    it('wraps read failures when querying upcoming occurrences', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed'), FIND_CHAIN_METHODS),
      );

      await expect(
        EventOccurrenceDAO.readUpcomingByEventSeriesId('series-1', new Date('2026-05-01T00:00:00.000Z'), 5),
      ).rejects.toThrow(GraphQLError);
    });
  });
});
