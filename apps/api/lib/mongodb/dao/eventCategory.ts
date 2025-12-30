import {EventCategory as EventCategoryModel} from '@/mongodb/models';
import type {EventCategory, UpdateEventCategoryInput, CreateEventCategoryInput, QueryOptionsInput} from '@ntlango/commons/types';
import {GraphQLError} from 'graphql';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery} from '@/utils';

class EventCategoryDAO {
  static async create(input: CreateEventCategoryInput): Promise<EventCategory> {
    try {
      const eventCategory = await EventCategoryModel.create(input);
      return eventCategory.toObject();
    } catch (error) {
      console.log('Error creating event category', error);
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
      console.log(`Error reading event category by evenCategoryId ${evenCategoryId}`, error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async readEventCategoryBySlug(slug: string): Promise<EventCategory> {
    try {
      const query = EventCategoryModel.findOne({slug: slug});
      const eventCategory = await query.exec();
      if (!eventCategory) {
        throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return eventCategory.toObject();
    } catch (error) {
      console.log(`Error reading event category by slug ${slug}`, error);
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
      console.error('Error reading event categories:', error);
      throw KnownCommonError(error);
    }
  }

  static async updateEventCategory(input: UpdateEventCategoryInput) {
    try {
      const updatedEventCategory = await EventCategoryModel.findByIdAndUpdate(input.eventCategoryId, input, {
        new: true,
      }).exec();
      if (!updatedEventCategory) {
        throw CustomError('Event Category not found', ErrorTypes.NOT_FOUND);
      }
      return updatedEventCategory.toObject();
    } catch (error) {
      console.log(`Error updating event category with eventCategoryId ${input.eventCategoryId}`, error);
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
      console.error('Error deleting event category by eventCategoryId:', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }

  static async deleteEventCategoryBySlug(slug: string): Promise<EventCategory> {
    try {
      const deletedEventCategory = await EventCategoryModel.findOneAndDelete({slug}).exec();
      if (!deletedEventCategory) {
        throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
      }
      return deletedEventCategory.toObject();
    } catch (error) {
      console.error('Error deleting event category by slug:', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw KnownCommonError(error);
    }
  }
}

export default EventCategoryDAO;
