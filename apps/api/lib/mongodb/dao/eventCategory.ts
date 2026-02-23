import { EventCategory as EventCategoryModel } from '@/mongodb/models';
import type {
  EventCategory,
  UpdateEventCategoryInput,
  CreateEventCategoryInput,
  QueryOptionsInput,
} from '@gatherle/commons/types';
import { CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery } from '@/utils';
import { logger } from '@/utils/logger';

class EventCategoryDAO {
  static async create(input: CreateEventCategoryInput): Promise<EventCategory> {
    try {
      const eventCategory = await EventCategoryModel.create(input);
      return eventCategory.toObject();
    } catch (error) {
      logger.info('Error creating event category', { error });
      throw KnownCommonError(error);
    }
  }

  static async readEventCategoryById(eventCategoryId: string): Promise<EventCategory> {
    let eventCategory;
    try {
      const query = EventCategoryModel.findById(eventCategoryId);
      eventCategory = await query.exec();
    } catch (error) {
      logger.error(`Error reading event category by eventCategoryId ${eventCategoryId}`, { error });
      throw KnownCommonError(error);
    }
    if (!eventCategory) {
      throw CustomError(`Event Category with eventCategoryId ${eventCategoryId} does not exist`, ErrorTypes.NOT_FOUND);
    }
    return eventCategory.toObject();
  }

  static async readEventCategoryBySlug(slug: string): Promise<EventCategory> {
    let eventCategory;
    try {
      const query = EventCategoryModel.findOne({ slug: slug });
      eventCategory = await query.exec();
    } catch (error) {
      logger.error(`Error reading event category by slug ${slug}`, { error });
      throw KnownCommonError(error);
    }
    if (!eventCategory) {
      throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return eventCategory.toObject();
  }

  static async readEventCategories(options?: QueryOptionsInput): Promise<EventCategory[]> {
    try {
      const query = options ? transformOptionsToQuery(EventCategoryModel, options) : EventCategoryModel.find({});
      const eventCategories = await query.exec();
      return eventCategories.map((eventCategory) => eventCategory.toObject());
    } catch (error) {
      logger.error('Error reading event categories:', { error });
      throw KnownCommonError(error);
    }
  }

  static async updateEventCategory(input: UpdateEventCategoryInput) {
    let eventCategory;
    try {
      eventCategory = await EventCategoryModel.findById(input.eventCategoryId).exec();
    } catch (error) {
      logger.error(`Error finding event category for update ${input.eventCategoryId}`, { error });
      throw KnownCommonError(error);
    }
    if (!eventCategory) {
      throw CustomError('Event Category not found', ErrorTypes.NOT_FOUND);
    }

    try {
      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(Object.entries(input).filter(([_, value]) => value !== undefined));
      Object.assign(eventCategory, fieldsToUpdate);
      await eventCategory.save();
      return eventCategory.toObject();
    } catch (error) {
      logger.error(`Error updating event category ${input.eventCategoryId}`, { error });
      throw KnownCommonError(error);
    }
  }

  static async deleteEventCategoryById(eventCategoryId: string): Promise<EventCategory> {
    let deletedEventCategory;
    try {
      deletedEventCategory = await EventCategoryModel.findByIdAndDelete(eventCategoryId).exec();
    } catch (error) {
      logger.error('Error deleting event category by eventCategoryId:', { error });
      throw KnownCommonError(error);
    }
    if (!deletedEventCategory) {
      throw CustomError(`Event Category with eventCategoryId ${eventCategoryId} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedEventCategory.toObject();
  }

  static async deleteEventCategoryBySlug(slug: string): Promise<EventCategory> {
    let deletedEventCategory;
    try {
      deletedEventCategory = await EventCategoryModel.findOneAndDelete({ slug }).exec();
    } catch (error) {
      logger.error('Error deleting event category by slug:', { error });
      throw KnownCommonError(error);
    }
    if (!deletedEventCategory) {
      throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
    }
    return deletedEventCategory.toObject();
  }

  static async count(filter: Record<string, unknown> = {}): Promise<number> {
    try {
      return EventCategoryModel.countDocuments(filter).exec();
    } catch (error) {
      logger.error('Error counting event categories', { error });
      throw KnownCommonError(error);
    }
  }
}

export default EventCategoryDAO;
