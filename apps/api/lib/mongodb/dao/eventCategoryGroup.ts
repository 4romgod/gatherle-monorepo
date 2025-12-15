import {EventCategoryGroup as EventCategoryGroupModel} from '@/mongodb/models';
import {GraphQLError} from 'graphql';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery} from '@/utils';
import type {
  CreateEventCategoryGroupInput,
  EventCategoryGroup,
  QueryOptionsInput,
  UpdateEventCategoryGroupInput,
} from '@ntlango/commons/types';

class EventCategoryGroupDAO {
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

  static async readEventCategoryGroups(options?: QueryOptionsInput): Promise<EventCategoryGroup[]> {
    try {
      const query = options
        ? transformOptionsToQuery(EventCategoryGroupModel, options)
        : EventCategoryGroupModel.find({}).populate('eventCategoryList');
      const eventCategoryGroups = await query.exec();
      return eventCategoryGroups.map((eventCategoryGroup) => eventCategoryGroup.toObject());
    } catch (error) {
      console.error('Error reading event category groups:', error);
      throw KnownCommonError(error);
    }
  }

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
