import { EventSeries as EventSeriesModel } from '@/mongodb/models';
import EventOccurrenceDAO from '@/mongodb/dao/eventOccurrence';
import { kebabCase } from 'lodash';
import type {
  EventSeries as EventEntity,
  EventSchedule,
  UpdateEventInput,
  CreateEventInput,
  EventsQueryOptionsInput,
} from '@gatherle/commons/types';
import {
  CustomError,
  ErrorTypes,
  KnownCommonError,
  extractValidationErrorMessage,
  transformEventOptionsToPipeline,
  enrichLocationWithCoordinates,
  createEventLookupStages,
  logDaoError,
  areEventSchedulesEqual,
} from '@/utils';
import { ParticipantStatus, DATE_FILTER_OPTIONS, EventOccurrenceStatus, EventStatus } from '@gatherle/commons';
import { logger } from '@/utils/logger';
import { getDateRangeForFilter } from '@/utils/rrule';

type EventOccurrenceMaintenanceSnapshot = Pick<
  EventEntity,
  'eventId' | 'slug' | 'primarySchedule' | 'status' | 'scheduleVersion'
> & {
  createdAt?: Date;
  updatedAt?: Date;
};

class EventSeriesDAO {
  private static resolveReadEventsDateRange(
    options?: EventsQueryOptionsInput,
  ): { startDate: Date; endDate: Date } | null {
    if (options?.customDate) {
      return getDateRangeForFilter(DATE_FILTER_OPTIONS.CUSTOM, new Date(options.customDate));
    }

    if (options?.dateFilterOption) {
      return getDateRangeForFilter(options.dateFilterOption, undefined);
    }

    if (options?.dateRange?.startDate && options?.dateRange?.endDate) {
      return {
        startDate: new Date(options.dateRange.startDate),
        endDate: new Date(options.dateRange.endDate),
      };
    }

    return null;
  }

  private static buildSavedByLookupStages() {
    return [
      {
        $lookup: {
          from: 'follows',
          let: { eid: '$eventId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$targetId', '$$eid'] },
                    { $eq: ['$targetType', 'EventSeries'] },
                    { $eq: ['$approvalStatus', 'Accepted'] },
                  ],
                },
              },
            },
            { $count: 'n' },
          ],
          as: '_savedAgg',
        },
      },
      {
        $addFields: {
          savedByCount: { $ifNull: [{ $arrayElemAt: ['$_savedAgg.n', 0] }, 0] },
        },
      },
    ];
  }

  private static buildOccurrenceRsvpLookupStages(now: Date) {
    return [
      {
        $lookup: {
          from: 'eventoccurrences',
          let: { eid: '$eventId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$eventSeriesId', '$$eid'] },
                status: { $ne: EventOccurrenceStatus.Cancelled },
                $or: [{ endAt: { $gte: now } }, { endAt: { $exists: false }, startAt: { $gte: now } }],
              },
            },
            { $project: { _id: 0, occurrenceId: 1 } },
          ],
          as: '_activeOccurrences',
        },
      },
      {
        $lookup: {
          from: 'eventoccurrenceparticipants',
          let: { occurrenceIds: '$_activeOccurrences.occurrenceId' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$occurrenceId', '$$occurrenceIds'] },
                status: {
                  $in: [ParticipantStatus.Going, ParticipantStatus.Interested, ParticipantStatus.CheckedIn],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $cond: [{ $gt: [{ $ifNull: ['$quantity', 1] }, 1] }, '$quantity', 1],
                  },
                },
              },
            },
          ],
          as: '_rsvpAgg',
        },
      },
      {
        $addFields: {
          rsvpCount: { $ifNull: [{ $arrayElemAt: ['$_rsvpAgg.total', 0] }, 0] },
        },
      },
    ];
  }

  private static buildHasActiveOccurrenceMatchStage() {
    return {
      $match: {
        '_activeOccurrences.0': { $exists: true },
      },
    };
  }

  private static async createWithSlug(
    input: CreateEventInput,
    slug: string,
    extraFields: Record<string, unknown> = {},
  ): Promise<EventEntity> {
    const event = new EventSeriesModel({ ...input, slug, ...extraFields });
    await event.save();
    return event.toObject();
  }

  private static async buildUniqueSlug(baseSlug: string): Promise<string> {
    let candidateSlug = baseSlug;
    let suffix = 2;

    while (await EventSeriesModel.findOne({ slug: candidateSlug }).select('_id').lean().exec()) {
      candidateSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidateSlug;
  }

  static async create(input: CreateEventInput): Promise<EventEntity> {
    try {
      const slug = kebabCase(input.title);
      const existingEvent = await EventSeriesModel.findOne({ slug }).select('_id').lean().exec();

      if (existingEvent) {
        throw CustomError(`Slug ${slug} already exists`, ErrorTypes.CONFLICT);
      }

      // Geocode address to coordinates if location has address but no coordinates
      if (input.location) {
        await enrichLocationWithCoordinates(input.location);
      }

      return await this.createWithSlug(input, slug);
    } catch (error) {
      logDaoError('Error creating event', { error });
      const validationMessage = extractValidationErrorMessage(error, 'EventSeries validation failed');

      if (validationMessage !== 'EventSeries validation failed') {
        throw CustomError(validationMessage, ErrorTypes.BAD_USER_INPUT);
      }
      throw KnownCommonError(error);
    }
  }

  static async readEventById(eventId: string): Promise<EventEntity> {
    let events;
    try {
      const pipeline = [{ $match: { eventId: eventId } }, ...createEventLookupStages()];
      events = await EventSeriesModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading event by id', { error });
      throw KnownCommonError(error);
    }
    if (!events || events.length === 0) {
      throw CustomError(`EventSeries with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
    }
    return events[0];
  }

  static async readEventsByIds(eventIds: string[]): Promise<EventEntity[]> {
    try {
      if (eventIds.length === 0) {
        return [];
      }

      const pipeline = [{ $match: { eventId: { $in: eventIds } } }, ...createEventLookupStages()];
      return await EventSeriesModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading events by ids', { error, eventIds });
      throw KnownCommonError(error);
    }
  }

  static async readEventBySlug(slug: string): Promise<EventEntity> {
    let events;
    try {
      // Use aggregation pipeline to include participants lookup
      const pipeline = [{ $match: { slug: slug } }, ...createEventLookupStages()];
      events = await EventSeriesModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading event by slug:', { error });
      throw KnownCommonError(error);
    }
    if (!events || events.length === 0) {
      throw CustomError(`EventSeries with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return events[0];
  }

  static async readEvents(options?: EventsQueryOptionsInput): Promise<EventEntity[]> {
    try {
      logger.debug('Reading events with options:', options);

      let effectiveOptions = options;
      const dateRange = this.resolveReadEventsDateRange(options);

      if (dateRange) {
        logger.debug('Applying persisted occurrence date range filter to event series query:', dateRange);
        const matchingEventSeriesIds = await EventOccurrenceDAO.readEventSeriesIdsInRange(
          dateRange.startDate,
          dateRange.endDate,
        );

        if (matchingEventSeriesIds.length === 0) {
          return [];
        }

        effectiveOptions = {
          ...options,
          filters: [...(options?.filters ?? []), { field: 'eventId', value: matchingEventSeriesIds }],
        };
      }

      const pipeline = transformEventOptionsToPipeline(effectiveOptions);
      return await EventSeriesModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading events', { error });
      throw KnownCommonError(error);
    }
  }

  static async countEvents(options?: EventsQueryOptionsInput): Promise<number> {
    try {
      let effectiveOptions = options;
      const dateRange = this.resolveReadEventsDateRange(options);

      if (dateRange) {
        const matchingEventSeriesIds = await EventOccurrenceDAO.readEventSeriesIdsInRange(
          dateRange.startDate,
          dateRange.endDate,
        );

        if (matchingEventSeriesIds.length === 0) {
          return 0;
        }

        effectiveOptions = {
          ...options,
          filters: [...(options?.filters ?? []), { field: 'eventId', value: matchingEventSeriesIds }],
        };
      }

      const pipeline = transformEventOptionsToPipeline(
        effectiveOptions
          ? {
              ...effectiveOptions,
              pagination: undefined,
              sort: undefined,
            }
          : undefined,
      );
      const result = await EventSeriesModel.aggregate<{ count: number }>([...pipeline, { $count: 'count' }]).exec();
      return result[0]?.count ?? 0;
    } catch (error) {
      logDaoError('Error counting filtered events', { error, options });
      throw KnownCommonError(error);
    }
  }

  static async readCandidateEventSeriesForOccurrences(options?: EventsQueryOptionsInput): Promise<EventEntity[]> {
    try {
      const pipeline = transformEventOptionsToPipeline(
        options
          ? {
              ...options,
              pagination: undefined,
              sort: undefined,
            }
          : undefined,
      );

      return await EventSeriesModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading candidate event series for occurrence query', { error, options });
      throw KnownCommonError(error);
    }
  }

  static async readOccurrenceMaintenanceBatch(
    limit: number,
    afterEventId?: string,
  ): Promise<EventOccurrenceMaintenanceSnapshot[]> {
    try {
      const query: Record<string, unknown> = {
        primarySchedule: { $exists: true, $ne: null },
      };

      if (afterEventId) {
        query.eventId = { $gt: afterEventId };
      }

      return await EventSeriesModel.find(query)
        .select('eventId slug primarySchedule status scheduleVersion createdAt updatedAt')
        .sort({ eventId: 1 })
        .limit(limit)
        .lean()
        .exec();
    } catch (error) {
      logDaoError('Error reading event series batch for occurrence maintenance', { error, limit, afterEventId });
      throw KnownCommonError(error);
    }
  }

  static async readOccurrenceMaintenanceSnapshotById(eventId: string): Promise<EventOccurrenceMaintenanceSnapshot> {
    try {
      const eventSeries = await EventSeriesModel.findOne({ eventId })
        .select('eventId slug primarySchedule status scheduleVersion createdAt updatedAt')
        .lean()
        .exec();

      if (!eventSeries) {
        throw CustomError(`EventSeries with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
      }

      return eventSeries;
    } catch (error) {
      if (error instanceof Error && 'extensions' in error) {
        throw error;
      }

      logDaoError('Error reading event series maintenance snapshot by eventId', { error, eventId });
      throw KnownCommonError(error);
    }
  }

  static async updateEvent(input: UpdateEventInput): Promise<EventEntity> {
    const { eventId, ...restInput } = input;
    let event;
    try {
      event = await EventSeriesModel.findById(eventId).exec();
    } catch (error) {
      logDaoError('Error finding event for update', { error });
      throw KnownCommonError(error);
    }

    if (!event) {
      throw CustomError(`EventSeries with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
    }

    try {
      // Geocode address to coordinates if location is being updated
      if (restInput.location) {
        await enrichLocationWithCoordinates(restInput.location);
      }

      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(
        Object.entries(restInput).filter(([_, value]) => value !== undefined),
      ) as Partial<Omit<UpdateEventInput, 'eventId'>> & { scheduleVersion?: number };
      const isScheduleUpdate = 'primarySchedule' in fieldsToUpdate;
      const didScheduleChange =
        isScheduleUpdate &&
        !areEventSchedulesEqual(event.primarySchedule, fieldsToUpdate.primarySchedule as EventSchedule);
      if (didScheduleChange) {
        fieldsToUpdate.scheduleVersion = (event.scheduleVersion ?? 1) + 1;
      }
      Object.assign(event, fieldsToUpdate);
      await event.save();
      return event.toObject();
    } catch (error) {
      logDaoError('Error updating event', { error });
      throw KnownCommonError(error);
    }
  }

  static async createSplitSuccessor(
    input: CreateEventInput,
    preferredSlugBase: string,
    splitFromEventSeriesId: string,
  ): Promise<EventEntity> {
    try {
      if (input.location) {
        await enrichLocationWithCoordinates(input.location);
      }

      const uniqueSlug = await this.buildUniqueSlug(preferredSlugBase);
      return await this.createWithSlug(input, uniqueSlug, { splitFromEventSeriesId });
    } catch (error) {
      logDaoError('Error creating split successor event series', { error, preferredSlugBase, splitFromEventSeriesId });
      const validationMessage = extractValidationErrorMessage(error, 'EventSeries validation failed');

      if (validationMessage !== 'EventSeries validation failed') {
        throw CustomError(validationMessage, ErrorTypes.BAD_USER_INPUT);
      }
      throw KnownCommonError(error);
    }
  }

  static async applySeriesSplit(
    eventId: string,
    predecessorRecurrenceRule: string,
    splitIntoEventSeriesId: string,
  ): Promise<EventEntity> {
    let event;
    try {
      event = await EventSeriesModel.findById(eventId).exec();
    } catch (error) {
      logDaoError('Error finding event for split update', { error, eventId });
      throw KnownCommonError(error);
    }

    if (!event) {
      throw CustomError(`EventSeries with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
    }

    try {
      event.primarySchedule = {
        ...event.primarySchedule,
        recurrenceRule: predecessorRecurrenceRule,
      };
      event.scheduleVersion = (event.scheduleVersion ?? 1) + 1;
      event.splitIntoEventSeriesId = splitIntoEventSeriesId;
      await event.save();
      return event.toObject();
    } catch (error) {
      logDaoError('Error applying event series split', { error, eventId, splitIntoEventSeriesId });
      throw KnownCommonError(error);
    }
  }

  static async deleteEventById(eventId: string): Promise<EventEntity> {
    let deletedEvent;
    try {
      deletedEvent = await EventSeriesModel.findByIdAndDelete(eventId).exec();
    } catch (error) {
      logDaoError(`Error deleting event by eventId ${eventId}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedEvent) {
      throw CustomError(`EventSeries with eventId ${eventId} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedEvent.toObject();
  }

  static async deleteEventBySlug(slug: string): Promise<EventEntity> {
    let deletedEvent;
    try {
      deletedEvent = await EventSeriesModel.findOneAndDelete({ slug }).exec();
    } catch (error) {
      logDaoError(`Error deleting event with slug ${slug}`, { error });
      throw KnownCommonError(error);
    }
    if (!deletedEvent) {
      throw CustomError(`EventSeries with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedEvent.toObject();
  }

  static async count(filter: Record<string, unknown> = {}): Promise<number> {
    try {
      return EventSeriesModel.countDocuments(filter).exec();
    } catch (error) {
      logDaoError('Error counting events', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Read trending events sorted by a composite score of RSVP count + saved-by count.
   * Scoped to Published, Upcoming/Ongoing, Public/Unlisted events starting from now.
   * The score is computed inline via aggregation $lookup stages so sorting happens in the DB.
   */
  static async readTrending(limit: number = 10): Promise<EventEntity[]> {
    try {
      const now = new Date();
      const pipeline = [
        {
          $match: {
            lifecycleStatus: 'Published',
            status: { $ne: EventStatus.Cancelled },
            visibility: { $in: ['Public', 'Unlisted'] },
          },
        },
        ...this.buildOccurrenceRsvpLookupStages(now),
        this.buildHasActiveOccurrenceMatchStage(),
        ...this.buildSavedByLookupStages(),
        {
          $addFields: {
            _trendingScore: {
              $add: ['$rsvpCount', '$savedByCount'],
            },
          },
        },
        { $sort: { _trendingScore: -1 as const, 'primarySchedule.anchorStartAt': 1 as const } },
        { $limit: limit },
        { $unset: ['_activeOccurrences', '_rsvpAgg', '_savedAgg', '_trendingScore'] },
        ...createEventLookupStages({ skipCounts: true }),
      ];

      return await EventSeriesModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading trending events', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Read upcoming and ongoing published events for feed candidate selection.
   * Scoped to public and unlisted events only — private/invitation events are never surfaced.
   * Used exclusively by the recommendation engine.
   */
  static async readUpcomingPublished(limit: number): Promise<EventEntity[]> {
    try {
      const now = new Date();
      const pipeline = [
        {
          $match: {
            lifecycleStatus: 'Published',
            status: { $ne: EventStatus.Cancelled },
            visibility: { $in: ['Public', 'Unlisted'] },
          },
        },
        ...this.buildOccurrenceRsvpLookupStages(now),
        this.buildHasActiveOccurrenceMatchStage(),
        ...this.buildSavedByLookupStages(),
        { $sort: { 'primarySchedule.anchorStartAt': 1 as const } },
        { $limit: limit },
        { $unset: ['_activeOccurrences', '_rsvpAgg', '_savedAgg'] },
        ...createEventLookupStages({ skipCounts: true }),
      ];

      return await EventSeriesModel.aggregate<EventEntity>(pipeline).exec();
    } catch (error) {
      logDaoError('Error reading upcoming published events', { error });
      throw KnownCommonError(error);
    }
  }
}

export default EventSeriesDAO;
