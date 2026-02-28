import { EventCategoryGroup as EventCategoryGroupModel } from '@/mongodb/models';
import { CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery , logDaoError } from '@/utils';
import type {
  CreateEventCategoryGroupInput,
  EventCategoryGroup,
  QueryOptionsInput,
  UpdateEventCategoryGroupInput,
} from '@gatherle/commons/types';

/**
 * Data Access Object for Event Category Group operations.
 *
 * All read and write methods populate the `eventCategories` field with full EventCategory objects,
 * ensuring consistent data structure across all operations. The `deleteEventCategoryGroupBySlug`
 * method is an exception as deleted entities typically don't require populated references.
 */
class EventCategoryGroupDAO {
  /**
   * Creates a new event category group.
   * @returns EventCategoryGroup with populated eventCategories
   */
  static async create(input: CreateEventCategoryGroupInput): Promise<EventCategoryGroup> {
    try {
      const eventCategoryGroup = await EventCategoryGroupModel.create(input);
      return eventCategoryGroup.toObject();
    } catch (error) {
      logDaoError('Error creating event category group', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Reads a single event category group by slug.
   * @returns EventCategoryGroup with populated eventCategories
   */
  static async readEventCategoryGroupBySlug(slug: string): Promise<EventCategoryGroup> {
    let eventCategoryGroup;
    try {
      const query = EventCategoryGroupModel.findOne({ slug: slug });
      eventCategoryGroup = await query.exec();
    } catch (error) {
      logDaoError(`Error reading event category group by slug ${slug}`, { error });
      throw KnownCommonError(error);
    }
    if (!eventCategoryGroup) {
      throw CustomError(`Event Category Group with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return eventCategoryGroup.toObject();
  }

  /**
   * Reads all event category groups, optionally with filters, sorting, and pagination.
   * @returns Array of EventCategoryGroup objects with populated eventCategories
   */
  static async readEventCategoryGroups(options?: QueryOptionsInput): Promise<EventCategoryGroup[]> {
    try {
      const query = options
        ? transformOptionsToQuery(EventCategoryGroupModel, options)
        : EventCategoryGroupModel.find({});
      const eventCategoryGroups = await query.exec();
      return eventCategoryGroups.map((eventCategoryGroup) => eventCategoryGroup.toObject());
    } catch (error) {
      logDaoError('Error reading event category groups:', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Updates an event category group.
   * @returns Updated EventCategoryGroup with populated eventCategories
   */
  static async updateEventCategoryGroup(input: UpdateEventCategoryGroupInput) {
    let eventCategoryGroup;
    try {
      eventCategoryGroup = await EventCategoryGroupModel.findById(input.eventCategoryGroupId).exec();
    } catch (error) {
      logDaoError(`Error finding event category group for update ${input.eventCategoryGroupId}`, { error });
      throw KnownCommonError(error);
    }
    if (!eventCategoryGroup) {
      throw CustomError('Event Category Group not found', ErrorTypes.NOT_FOUND);
    }

    try {
      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(Object.entries(input).filter(([_, value]) => value !== undefined));
      Object.assign(eventCategoryGroup, fieldsToUpdate);
      await eventCategoryGroup.save();
      return eventCategoryGroup.toObject();
    } catch (error) {
      logDaoError(`Error updating event category group ${input.eventCategoryGroupId}`, { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Deletes an event category group by slug.
   * @returns Deleted EventCategoryGroup without populated references (deleted entities don't need populated data)
   */
  static async deleteEventCategoryGroupBySlug(slug: string): Promise<EventCategoryGroup> {
    let deletedEventCategoryGroup;
    try {
      deletedEventCategoryGroup = await EventCategoryGroupModel.findOneAndDelete({ slug }).exec();
    } catch (error) {
      logDaoError('Error deleting event category group by slug:', { error });
      throw KnownCommonError(error);
    }
    if (!deletedEventCategoryGroup) {
      throw CustomError(`Event Category Group with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedEventCategoryGroup.toObject();
  }

  static async count(filter: Record<string, unknown> = {}): Promise<number> {
    try {
      return EventCategoryGroupModel.countDocuments(filter).exec();
    } catch (error) {
      logDaoError('Error counting event category groups', { error });
      throw KnownCommonError(error);
    }
  }
}

export default EventCategoryGroupDAO;
