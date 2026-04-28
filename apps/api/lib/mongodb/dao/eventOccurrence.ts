import { EventOccurrence as EventOccurrenceModel } from '@/mongodb/models';
import { EventOccurrenceStatus, type EventOccurrence } from '@gatherle/commons/types';
import { KnownCommonError, logDaoError } from '@/utils';

class EventOccurrenceDAO {
  static async readByOccurrenceId(occurrenceId: string): Promise<EventOccurrence | null> {
    try {
      const occurrence = await EventOccurrenceModel.findOne({ occurrenceId }).lean().exec();
      return occurrence;
    } catch (error) {
      logDaoError('Error reading event occurrence by occurrenceId', { error, occurrenceId });
      throw KnownCommonError(error);
    }
  }

  static async readByOccurrenceIds(occurrenceIds: string[]): Promise<EventOccurrence[]> {
    if (occurrenceIds.length === 0) {
      return [];
    }

    try {
      return await EventOccurrenceModel.find({ occurrenceId: { $in: occurrenceIds } })
        .lean()
        .exec();
    } catch (error) {
      logDaoError('Error reading event occurrences by occurrenceIds', { error, occurrenceIds });
      throw KnownCommonError(error);
    }
  }

  static async bulkUpsert(occurrences: EventOccurrence[]): Promise<void> {
    if (occurrences.length === 0) {
      return;
    }

    try {
      await EventOccurrenceModel.bulkWrite(
        occurrences.map((occurrence) => {
          const setPayload: Record<string, unknown> = {
            eventSeriesId: occurrence.eventSeriesId,
            occurrenceKey: occurrence.occurrenceKey,
            originalStartAt: occurrence.originalStartAt,
            startAt: occurrence.startAt,
            timezone: occurrence.timezone,
            status: occurrence.status,
            isException: occurrence.isException,
            seriesScheduleVersion: occurrence.seriesScheduleVersion,
          };

          if (occurrence.endAt !== undefined) {
            setPayload.endAt = occurrence.endAt;
          }

          return {
            updateOne: {
              filter: { occurrenceKey: occurrence.occurrenceKey },
              update: {
                $set: setPayload,
                $setOnInsert: {
                  occurrenceId: occurrence.occurrenceId,
                  reservedSlotCount: occurrence.reservedSlotCount ?? 0,
                },
              },
              upsert: true,
            },
          };
        }),
        { ordered: false },
      );
    } catch (error) {
      logDaoError('Error bulk upserting event occurrences', { error, count: occurrences.length });
      throw KnownCommonError(error);
    }
  }

  static async readExceptionOccurrenceKeysByEventSeriesId(eventSeriesId: string): Promise<string[]> {
    try {
      const occurrences = await EventOccurrenceModel.find({
        eventSeriesId,
        isException: true,
      })
        .select('occurrenceKey')
        .lean()
        .exec();

      return occurrences.map((occurrence) => occurrence.occurrenceKey);
    } catch (error) {
      logDaoError('Error reading exception occurrence keys by eventSeriesId', { error, eventSeriesId });
      throw KnownCommonError(error);
    }
  }

  static async deleteMissingGeneratedOccurrences(eventSeriesId: string, occurrenceKeys: string[]): Promise<void> {
    try {
      await EventOccurrenceModel.deleteMany({
        eventSeriesId,
        isException: false,
        occurrenceKey: { $nin: occurrenceKeys },
      }).exec();
    } catch (error) {
      logDaoError('Error deleting stale generated event occurrences', { error, eventSeriesId });
      throw KnownCommonError(error);
    }
  }

  static async deleteByEventSeriesId(eventSeriesId: string): Promise<void> {
    try {
      await EventOccurrenceModel.deleteMany({ eventSeriesId }).exec();
    } catch (error) {
      logDaoError('Error deleting event occurrences by eventSeriesId', { error, eventSeriesId });
      throw KnownCommonError(error);
    }
  }

  static async deleteByOccurrenceIds(occurrenceIds: string[]): Promise<void> {
    if (occurrenceIds.length === 0) {
      return;
    }

    try {
      await EventOccurrenceModel.deleteMany({ occurrenceId: { $in: occurrenceIds } }).exec();
    } catch (error) {
      logDaoError('Error deleting event occurrences by occurrenceIds', { error, occurrenceIds });
      throw KnownCommonError(error);
    }
  }

  static async readByEventSeriesIdsInRange(
    eventSeriesIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<EventOccurrence[]> {
    if (eventSeriesIds.length === 0) {
      return [];
    }

    try {
      return await EventOccurrenceModel.find({
        eventSeriesId: { $in: eventSeriesIds },
        startAt: { $lte: endDate },
        $or: [{ endAt: { $gte: startDate } }, { endAt: { $exists: false }, startAt: { $gte: startDate } }],
      })
        .sort({ startAt: 1, occurrenceKey: 1 })
        .lean()
        .exec();
    } catch (error) {
      logDaoError('Error reading event occurrences in date range', {
        error,
        eventSeriesIds,
        startDate,
        endDate,
      });
      throw KnownCommonError(error);
    }
  }

  static async readUpcomingByEventSeriesId(
    eventSeriesId: string,
    fromDate: Date,
    limit: number,
  ): Promise<EventOccurrence[]> {
    try {
      return await EventOccurrenceModel.find({
        eventSeriesId,
        $or: [{ endAt: { $gte: fromDate } }, { endAt: { $exists: false }, startAt: { $gte: fromDate } }],
      })
        .sort({ startAt: 1, occurrenceKey: 1 })
        .limit(limit)
        .lean()
        .exec();
    } catch (error) {
      logDaoError('Error reading upcoming event occurrences by eventSeriesId', {
        error,
        eventSeriesId,
        fromDate,
        limit,
      });
      throw KnownCommonError(error);
    }
  }

  static async readByEventSeriesIdFromOriginalStart(
    eventSeriesId: string,
    originalStartAt: Date,
  ): Promise<EventOccurrence[]> {
    try {
      return await EventOccurrenceModel.find({
        eventSeriesId,
        originalStartAt: { $gte: originalStartAt },
      })
        .sort({ originalStartAt: 1, occurrenceKey: 1 })
        .lean()
        .exec();
    } catch (error) {
      logDaoError('Error reading event occurrences by eventSeriesId from originalStartAt', {
        error,
        eventSeriesId,
        originalStartAt,
      });
      throw KnownCommonError(error);
    }
  }

  static async updateException(
    occurrenceId: string,
    updates: Pick<EventOccurrence, 'startAt' | 'endAt' | 'timezone'>,
  ): Promise<EventOccurrence | null> {
    try {
      const update: {
        $set: {
          startAt: EventOccurrence['startAt'];
          timezone: EventOccurrence['timezone'];
          isException: true;
          endAt?: EventOccurrence['endAt'];
        };
        $unset?: {
          endAt: 1;
        };
      } = {
        $set: {
          startAt: updates.startAt,
          timezone: updates.timezone,
          isException: true,
        },
      };

      if (updates.endAt !== undefined) {
        update.$set.endAt = updates.endAt;
      } else {
        update.$unset = { endAt: 1 };
      }

      const updatedOccurrence = await EventOccurrenceModel.findOneAndUpdate({ occurrenceId }, update, {
        new: true,
      })
        .lean()
        .exec();

      return updatedOccurrence;
    } catch (error) {
      logDaoError('Error updating occurrence exception', { error, occurrenceId, updates });
      throw KnownCommonError(error);
    }
  }

  static async cancelOccurrence(occurrenceId: string): Promise<EventOccurrence | null> {
    try {
      return await EventOccurrenceModel.findOneAndUpdate(
        { occurrenceId },
        {
          $set: {
            status: EventOccurrenceStatus.Cancelled,
            isException: true,
          },
        },
        { new: true },
      )
        .lean()
        .exec();
    } catch (error) {
      logDaoError('Error cancelling occurrence', { error, occurrenceId });
      throw KnownCommonError(error);
    }
  }

  static async reassignOccurrencesToSeries(
    occurrences: Array<{
      oldOccurrenceId: string;
      occurrenceId: string;
      eventSeriesId: string;
      occurrenceKey: string;
      seriesScheduleVersion: number;
    }>,
  ): Promise<void> {
    if (occurrences.length === 0) {
      return;
    }

    try {
      await EventOccurrenceModel.bulkWrite(
        occurrences.map((occurrence) => ({
          updateOne: {
            filter: { occurrenceId: occurrence.oldOccurrenceId },
            update: {
              $set: {
                occurrenceId: occurrence.occurrenceId,
                eventSeriesId: occurrence.eventSeriesId,
                occurrenceKey: occurrence.occurrenceKey,
                seriesScheduleVersion: occurrence.seriesScheduleVersion,
              },
            },
          },
        })),
        { ordered: true },
      );
    } catch (error) {
      logDaoError('Error reassigning event occurrences to successor series', { error, count: occurrences.length });
      throw KnownCommonError(error);
    }
  }

  static async reserveSlots(occurrenceId: string, slots: number, limit: number): Promise<boolean> {
    if (slots <= 0) {
      return true;
    }

    try {
      const occurrence = await EventOccurrenceModel.findOneAndUpdate(
        {
          occurrenceId,
          $expr: {
            $lte: [{ $add: [{ $ifNull: ['$reservedSlotCount', 0] }, slots] }, limit],
          },
        },
        {
          $inc: { reservedSlotCount: slots },
        },
        {
          new: true,
        },
      ).exec();

      return Boolean(occurrence);
    } catch (error) {
      logDaoError('Error reserving occurrence slots', { error, occurrenceId, slots, limit });
      throw KnownCommonError(error);
    }
  }

  static async releaseReservedSlots(occurrenceId: string, slots: number): Promise<void> {
    if (slots <= 0) {
      return;
    }

    try {
      await EventOccurrenceModel.updateOne(
        {
          occurrenceId,
        },
        {
          $inc: { reservedSlotCount: -slots },
        },
      ).exec();
    } catch (error) {
      logDaoError('Error releasing occurrence slots', { error, occurrenceId, slots });
      throw KnownCommonError(error);
    }
  }

  static async clearReservedSlotCount(occurrenceId: string): Promise<void> {
    try {
      await EventOccurrenceModel.updateOne(
        { occurrenceId },
        {
          $set: { reservedSlotCount: 0 },
        },
      ).exec();
    } catch (error) {
      logDaoError('Error clearing reserved slot count', { error, occurrenceId });
      throw KnownCommonError(error);
    }
  }
}

export default EventOccurrenceDAO;
