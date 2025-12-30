import {EventCategoryGroup as EventCategoryGroupModel} from '@/mongodb/models';
import {GraphQLError} from 'graphql';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery} from '@/utils';
import type {CreateEventCategoryGroupInput, EventCategoryGroup, QueryOptionsInput, UpdateEventCategoryGroupInput} from '@ntlango/commons/types';

/**
 * Data Access Object for Event Category Group operations.
 *
 * All read and write methods populate the `eventCategoryList` field with full EventCategory objects,
 * ensuring consistent data structure across all operations. The `deleteEventCategoryGroupBySlug`
 * method is an exception as deleted entities typically don't require populated references.
 */
class EventCategoryGroupDAO {
  /**
   * Creates a new event category group.
   * @returns EventCategoryGroup with populated eventCategoryList
   */
  static async create(input: CreateEventCategoryGroupInput): Promise<EventCategoryGroup> {
    try {
      const eventCategoryGroup = await EventCategoryGroupModel.create(input);
      await eventCategoryGroup.populate('eventCategoryList');
      return eventCategoryGroup.toObject();
    } catch (error) {
      console.log('Error creating event category group', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Reads a single event category group by slug.
   * @returns EventCategoryGroup with populated eventCategoryList
   */
  static async readEventCategoryGroupBySlug(slug: string): Promise<EventCategoryGroup> {
    try {
      const query = EventCategoryGroupModel.findOne({slug: slug}).populate('eventCategoryList');
      const eventCategoryGroup = await query.exec();
      if (!eventCategoryGroup) {
        throw CustomError(`Event Category Group with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return eventCategoryGroup.toObject();
    } catch (error) {
      console.log(`Error reading event category by slug ${slug}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  /**
   * Reads all event category groups, optionally with filters, sorting, and pagination.
   * @returns Array of EventCategoryGroup objects with populated eventCategoryList
   */
  static async readEventCategoryGroups(options?: QueryOptionsInput): Promise<EventCategoryGroup[]> {
    try {
      const query = options
        ? transformOptionsToQuery(EventCategoryGroupModel, options).populate('eventCategoryList')
        : EventCategoryGroupModel.find({}).populate('eventCategoryList');
      const eventCategoryGroups = await query.exec();
      return eventCategoryGroups.map((eventCategoryGroup) => eventCategoryGroup.toObject());
    } catch (error) {
      console.error('Error reading event category groups:', error);
      throw KnownCommonError(error);
    }
  }

  /**
   * Updates an event category group.
   * @returns Updated EventCategoryGroup with populated eventCategoryList
   */
  static async updateEventCategoryGroup(input: UpdateEventCategoryGroupInput) {
    try {
      const updatedEventCategoryGroup = await EventCategoryGroupModel.findByIdAndUpdate(input.eventCategoryGroupId, input, {
        new: true,
      })
        .populate('eventCategoryList')
        .exec();

      if (!updatedEventCategoryGroup) {
        throw CustomError('Event Category Group not found', ErrorTypes.NOT_FOUND);
      }
      return updatedEventCategoryGroup.toObject();
    } catch (error) {
      console.log(`Error updating event category group with eventCategoryGroupId ${input.eventCategoryGroupId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  /**
   * Deletes an event category group by slug.
   * @returns Deleted EventCategoryGroup without populated references (deleted entities don't need populated data)
   */
  static async deleteEventCategoryGroupBySlug(slug: string): Promise<EventCategoryGroup> {
    try {
      const deletedEventCategoryGroup = await EventCategoryGroupModel.findOneAndDelete({slug}).exec();
      if (!deletedEventCategoryGroup) {
        throw CustomError(`Event Category Group with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEventCategoryGroup.toObject();
    } catch (error) {
      console.error('Error deleting event category group by slug:', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default EventCategoryGroupDAO;
