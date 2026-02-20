import { EventCategory as EventCategoryModel } from '@/mongodb/models';
import type {
  EventCategory,
  UpdateEventCategoryInput,
  CreateEventCategoryInput,
  QueryOptionsInput,
} from '@gatherle/commons/types';
import { GraphQLError } from 'graphql';
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

  static async readEventCategoryById(evenCategoryId: string): Promise<EventCategory> {
    try {
      const query = EventCategoryModel.findById(evenCategoryId);
      const eventCategory = await query.exec();
      if (!eventCategory) {
        throw CustomError(`Event Category with eventCategoryId ${evenCategoryId} does not exist`, ErrorTypes.NOT_FOUND);
      }
      return eventCategory.toObject();
    } catch (error) {
      logger.info(`Error reading event category by evenCategoryId ${evenCategoryId}`, { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readEventCategoryBySlug(slug: string): Promise<EventCategory> {
    try {
      const query = EventCategoryModel.findOne({ slug: slug });
      const eventCategory = await query.exec();
      if (!eventCategory) {
        throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return eventCategory.toObject();
    } catch (error) {
      logger.info(`Error reading event category by slug ${slug}`, { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
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
    try {
      const eventCategory = await EventCategoryModel.findById(input.eventCategoryId).exec();
      if (!eventCategory) {
        throw CustomError('Event Category not found', ErrorTypes.NOT_FOUND);
      }

      // Filter out undefined values to avoid overwriting with undefined
      const fieldsToUpdate = Object.fromEntries(Object.entries(input).filter(([_, value]) => value !== undefined));
      Object.assign(eventCategory, fieldsToUpdate);
      await eventCategory.save();

      return eventCategory.toObject();
    } catch (error) {
      logger.info(`Error updating event category with eventCategoryId ${input.eventCategoryId}`, { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteEventCategoryById(eventCategoryId: string): Promise<EventCategory> {
    try {
      const deletedEventCategory = await EventCategoryModel.findByIdAndDelete(eventCategoryId).exec();
      if (!deletedEventCategory) {
        throw CustomError(`Event Category with eventCategoryId ${eventCategoryId} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEventCategory.toObject();
    } catch (error) {
      logger.error('Error deleting event category by eventCategoryId:', { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteEventCategoryBySlug(slug: string): Promise<EventCategory> {
    try {
      const deletedEventCategory = await EventCategoryModel.findOneAndDelete({ slug }).exec();
      if (!deletedEventCategory) {
        throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEventCategory.toObject();
    } catch (error) {
      logger.error('Error deleting event category by slug:', { error });
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
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
