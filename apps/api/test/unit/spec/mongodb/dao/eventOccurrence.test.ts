import { GraphQLError } from 'graphql';
import { EventOccurrenceDAO } from '@/mongodb/dao';
import { EventOccurrence as EventOccurrenceModel } from '@/mongodb/models';
import { EventOccurrenceStatus, type EventOccurrence } from '@gatherle/commons/types';

jest.mock('@/mongodb/models', () => ({
  EventOccurrence: {
    bulkWrite: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
  exec: jest.fn().mockRejectedValue(error),
});

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
});
