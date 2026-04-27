import { EventOccurrence as EventOccurrenceModel } from '@/mongodb/models';
import type { EventOccurrence } from '@gatherle/commons/types';
import { KnownCommonError, logDaoError } from '@/utils';

class EventOccurrenceDAO {
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
}

export default EventOccurrenceDAO;
