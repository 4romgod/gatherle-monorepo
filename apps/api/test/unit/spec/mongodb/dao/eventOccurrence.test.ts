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
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));

const FIND_CHAIN_METHODS: MockQueryOptions = { chainMethods: ['sort', 'limit', 'select', 'lean'] };

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

  describe('readByOccurrenceId', () => {
    it('reads one occurrence by occurrenceId', async () => {
      (EventOccurrenceModel.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery(occurrence, { chainMethods: ['lean'] }),
      );

      const result = await EventOccurrenceDAO.readByOccurrenceId(occurrence.occurrenceId);

      expect(result).toEqual(occurrence);
      expect(EventOccurrenceModel.findOne).toHaveBeenCalledWith({ occurrenceId: occurrence.occurrenceId });
    });

    it('wraps read failures when querying one occurrence by occurrenceId', async () => {
      (EventOccurrenceModel.findOne as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed')),
      );

      await expect(EventOccurrenceDAO.readByOccurrenceId(occurrence.occurrenceId)).rejects.toThrow(GraphQLError);
    });
  });

  describe('readByOccurrenceIds', () => {
    it('returns early when no occurrenceIds are provided', async () => {
      const results = await EventOccurrenceDAO.readByOccurrenceIds([]);

      expect(results).toEqual([]);
      expect(EventOccurrenceModel.find).not.toHaveBeenCalled();
    });

    it('reads occurrences by occurrenceIds', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([occurrence], { chainMethods: ['lean'] }),
      );

      const results = await EventOccurrenceDAO.readByOccurrenceIds([occurrence.occurrenceId]);

      expect(results).toEqual([occurrence]);
      expect(EventOccurrenceModel.find).toHaveBeenCalledWith({
        occurrenceId: { $in: [occurrence.occurrenceId] },
      });
    });

    it('wraps read failures when querying occurrenceIds', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new Error('read failed')));

      await expect(EventOccurrenceDAO.readByOccurrenceIds([occurrence.occurrenceId])).rejects.toThrow(GraphQLError);
    });
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
                  reservedSlotCount: 0,
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
                  reservedSlotCount: 0,
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

  describe('readExceptionOccurrenceKeysByEventSeriesId', () => {
    it('reads only exception occurrence keys for the series', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([{ occurrenceKey: occurrence.occurrenceKey }], {
          chainMethods: ['select', 'lean'],
        }),
      );

      const result = await EventOccurrenceDAO.readExceptionOccurrenceKeysByEventSeriesId('series-1');

      expect(result).toEqual([occurrence.occurrenceKey]);
      expect(EventOccurrenceModel.find).toHaveBeenCalledWith({
        eventSeriesId: 'series-1',
        isException: true,
      });
    });

    it('wraps read failures when loading exception occurrence keys', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(new Error('read failed')));

      await expect(EventOccurrenceDAO.readExceptionOccurrenceKeysByEventSeriesId('series-1')).rejects.toThrow(
        GraphQLError,
      );
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

  describe('deleteByOccurrenceIds', () => {
    it('returns early when no occurrence IDs are provided', async () => {
      await EventOccurrenceDAO.deleteByOccurrenceIds([]);

      expect(EventOccurrenceModel.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes event occurrences by occurrence IDs', async () => {
      (EventOccurrenceModel.deleteMany as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ deletedCount: 2 }),
      );

      await EventOccurrenceDAO.deleteByOccurrenceIds([occurrence.occurrenceId]);

      expect(EventOccurrenceModel.deleteMany).toHaveBeenCalledWith({
        occurrenceId: { $in: [occurrence.occurrenceId] },
      });
    });

    it('wraps delete failures when removing occurrence IDs', async () => {
      (EventOccurrenceModel.deleteMany as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('delete failed')),
      );

      await expect(EventOccurrenceDAO.deleteByOccurrenceIds([occurrence.occurrenceId])).rejects.toThrow(GraphQLError);
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

  describe('readByEventSeriesIdFromOriginalStart', () => {
    it('reads future occurrences from an original start boundary', async () => {
      const fromOriginalStart = new Date('2026-05-13T16:00:00.000Z');
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery([occurrence], { chainMethods: ['sort', 'lean'] }),
      );

      const result = await EventOccurrenceDAO.readByEventSeriesIdFromOriginalStart('series-1', fromOriginalStart);

      expect(result).toEqual([occurrence]);
      expect(EventOccurrenceModel.find).toHaveBeenCalledWith({
        eventSeriesId: 'series-1',
        originalStartAt: { $gte: fromOriginalStart },
      });
    });

    it('wraps read failures when loading future occurrences from an original start', async () => {
      (EventOccurrenceModel.find as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('read failed'), { chainMethods: ['sort', 'lean'] }),
      );

      await expect(
        EventOccurrenceDAO.readByEventSeriesIdFromOriginalStart('series-1', new Date('2026-05-13T16:00:00.000Z')),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('updateException', () => {
    it('marks an occurrence as an exception and updates schedule fields', async () => {
      const updatedOccurrence = {
        ...occurrence,
        isException: true,
        startAt: new Date('2026-05-06T17:00:00.000Z'),
        timezone: 'UTC',
      };
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery(updatedOccurrence, { chainMethods: ['lean'] }),
      );

      const result = await EventOccurrenceDAO.updateException(occurrence.occurrenceId, {
        ...occurrence,
        startAt: updatedOccurrence.startAt,
        endAt: updatedOccurrence.endAt,
        timezone: updatedOccurrence.timezone,
      });

      expect(result).toEqual(updatedOccurrence);
      expect(EventOccurrenceModel.findOneAndUpdate).toHaveBeenCalledWith(
        { occurrenceId: occurrence.occurrenceId },
        {
          $set: {
            startAt: updatedOccurrence.startAt,
            endAt: updatedOccurrence.endAt,
            timezone: updatedOccurrence.timezone,
            isException: true,
          },
        },
        { new: true },
      );
    });

    it('unsets endAt when clearing the exception end time', async () => {
      const updatedOccurrence = {
        ...occurrence,
        endAt: undefined,
        isException: true,
      };
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery(updatedOccurrence, { chainMethods: ['lean'] }),
      );

      const result = await EventOccurrenceDAO.updateException(occurrence.occurrenceId, {
        startAt: occurrence.startAt,
        endAt: undefined,
        timezone: occurrence.timezone,
      });

      expect(result).toEqual(updatedOccurrence);
      expect(EventOccurrenceModel.findOneAndUpdate).toHaveBeenCalledWith(
        { occurrenceId: occurrence.occurrenceId },
        {
          $set: {
            startAt: occurrence.startAt,
            timezone: occurrence.timezone,
            isException: true,
          },
          $unset: {
            endAt: 1,
          },
        },
        { new: true },
      );
    });

    it('wraps update failures when persisting an occurrence exception', async () => {
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('update failed'), { chainMethods: ['lean'] }),
      );

      await expect(
        EventOccurrenceDAO.updateException(occurrence.occurrenceId, {
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
          timezone: occurrence.timezone,
        }),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('cancelOccurrence', () => {
    it('marks the occurrence as cancelled and exceptional', async () => {
      const cancelledOccurrence = {
        ...occurrence,
        status: EventOccurrenceStatus.Cancelled,
        isException: true,
      };
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery(cancelledOccurrence, { chainMethods: ['lean'] }),
      );

      const result = await EventOccurrenceDAO.cancelOccurrence(occurrence.occurrenceId);

      expect(result).toEqual(cancelledOccurrence);
      expect(EventOccurrenceModel.findOneAndUpdate).toHaveBeenCalledWith(
        { occurrenceId: occurrence.occurrenceId },
        {
          $set: {
            status: EventOccurrenceStatus.Cancelled,
            isException: true,
          },
        },
        { new: true },
      );
    });

    it('wraps update failures when cancelling an occurrence', async () => {
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('cancel failed'), { chainMethods: ['lean'] }),
      );

      await expect(EventOccurrenceDAO.cancelOccurrence(occurrence.occurrenceId)).rejects.toThrow(GraphQLError);
    });
  });

  describe('reassignOccurrencesToSeries', () => {
    it('returns early when no occurrences are provided for reassignment', async () => {
      await EventOccurrenceDAO.reassignOccurrencesToSeries([]);

      expect(EventOccurrenceModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('updates occurrence ownership and ids in bulk', async () => {
      (EventOccurrenceModel.bulkWrite as jest.Mock).mockResolvedValue(undefined);

      await EventOccurrenceDAO.reassignOccurrencesToSeries([
        {
          oldOccurrenceId: occurrence.occurrenceId,
          occurrenceId: 'series-2#2026-05-06T16:00:00.000Z',
          eventSeriesId: 'series-2',
          occurrenceKey: 'series-2#2026-05-06T16:00:00.000Z',
          seriesScheduleVersion: 1,
        },
      ]);

      expect(EventOccurrenceModel.bulkWrite).toHaveBeenCalledWith(
        [
          {
            updateOne: {
              filter: { occurrenceId: occurrence.occurrenceId },
              update: {
                $set: {
                  occurrenceId: 'series-2#2026-05-06T16:00:00.000Z',
                  eventSeriesId: 'series-2',
                  occurrenceKey: 'series-2#2026-05-06T16:00:00.000Z',
                  seriesScheduleVersion: 1,
                },
              },
            },
          },
        ],
        { ordered: true },
      );
    });

    it('wraps bulk write failures when reassigning occurrences', async () => {
      (EventOccurrenceModel.bulkWrite as jest.Mock).mockRejectedValue(new Error('bulk write failed'));

      await expect(
        EventOccurrenceDAO.reassignOccurrencesToSeries([
          {
            oldOccurrenceId: occurrence.occurrenceId,
            occurrenceId: 'series-2#2026-05-06T16:00:00.000Z',
            eventSeriesId: 'series-2',
            occurrenceKey: 'series-2#2026-05-06T16:00:00.000Z',
            seriesScheduleVersion: 1,
          },
        ]),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('reserveSlots', () => {
    it('returns true without writing when slots are zero or negative', async () => {
      await expect(EventOccurrenceDAO.reserveSlots(occurrence.occurrenceId, 0, 10)).resolves.toBe(true);
      await expect(EventOccurrenceDAO.reserveSlots(occurrence.occurrenceId, -1, 10)).resolves.toBe(true);

      expect(EventOccurrenceModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('atomically reserves slots when capacity allows', async () => {
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(occurrence));

      const result = await EventOccurrenceDAO.reserveSlots(occurrence.occurrenceId, 2, 10);

      expect(result).toBe(true);
      expect(EventOccurrenceModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          occurrenceId: occurrence.occurrenceId,
          $expr: {
            $lte: [{ $add: [{ $ifNull: ['$reservedSlotCount', 0] }, 2] }, 10],
          },
        },
        {
          $inc: { reservedSlotCount: 2 },
        },
        {
          new: true,
        },
      );
    });

    it('returns false when reserving the slots would exceed capacity', async () => {
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      const result = await EventOccurrenceDAO.reserveSlots(occurrence.occurrenceId, 2, 1);

      expect(result).toBe(false);
    });

    it('wraps reserve slot failures', async () => {
      (EventOccurrenceModel.findOneAndUpdate as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('reserve failed')),
      );

      await expect(EventOccurrenceDAO.reserveSlots(occurrence.occurrenceId, 2, 10)).rejects.toThrow(GraphQLError);
    });
  });

  describe('releaseReservedSlots', () => {
    it('returns early without writing when slots are zero or negative', async () => {
      await expect(EventOccurrenceDAO.releaseReservedSlots(occurrence.occurrenceId, 0)).resolves.toBeUndefined();
      await expect(EventOccurrenceDAO.releaseReservedSlots(occurrence.occurrenceId, -1)).resolves.toBeUndefined();

      expect(EventOccurrenceModel.updateOne).not.toHaveBeenCalled();
    });

    it('decrements reserved slots when capacity is released', async () => {
      (EventOccurrenceModel.updateOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ acknowledged: true }),
      );

      await EventOccurrenceDAO.releaseReservedSlots(occurrence.occurrenceId, 2);

      expect(EventOccurrenceModel.updateOne).toHaveBeenCalledWith(
        {
          occurrenceId: occurrence.occurrenceId,
        },
        {
          $inc: { reservedSlotCount: -2 },
        },
      );
    });

    it('wraps release slot failures', async () => {
      (EventOccurrenceModel.updateOne as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('release failed')),
      );

      await expect(EventOccurrenceDAO.releaseReservedSlots(occurrence.occurrenceId, 2)).rejects.toThrow(GraphQLError);
    });
  });

  describe('clearReservedSlotCount', () => {
    it('resets the reserved slot counter to zero', async () => {
      (EventOccurrenceModel.updateOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({ acknowledged: true }),
      );

      await EventOccurrenceDAO.clearReservedSlotCount(occurrence.occurrenceId);

      expect(EventOccurrenceModel.updateOne).toHaveBeenCalledWith(
        { occurrenceId: occurrence.occurrenceId },
        {
          $set: { reservedSlotCount: 0 },
        },
      );
    });

    it('wraps update failures when clearing the reserved slot count', async () => {
      (EventOccurrenceModel.updateOne as jest.Mock).mockReturnValue(
        createMockFailedMongooseQuery(new Error('clear failed')),
      );

      await expect(EventOccurrenceDAO.clearReservedSlotCount(occurrence.occurrenceId)).rejects.toThrow(GraphQLError);
    });
  });
});
