import {EventCategoryGroup} from '@/mongodb/models';
import {GraphQLError} from 'graphql';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery} from '@/utils';
import {
  CreateEventCategoryGroupInputType,
  EventCategoryGroupType,
  QueryOptionsInput,
  UpdateEventCategoryGroupInputType,
} from '@ntlango/commons/types';

class EventCategoryGroupDAO {
  static async create(input: CreateEventCategoryGroupInputType): Promise<EventCategoryGroupType> {
    try {
      const eventCategoryGroup = await EventCategoryGroup.create(input);
      return eventCategoryGroup.toObject();
    } catch (error) {
      console.log('Error creating event category group', error);
      throw KnownCommonError(error);
    }
  }

  static async readEventCategoryGroupBySlug(slug: string): Promise<EventCategoryGroupType> {
    try {
      const query = EventCategoryGroup.findOne({ slug: slug }).populate('eventCategoryList');
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

  static async readEventCategoryGroups(options?: QueryOptionsInput): Promise<EventCategoryGroupType[]> {
    try {
      const query = options ? transformOptionsToQuery(EventCategoryGroup, options) : EventCategoryGroup.find({}).populate('eventCategoryList');
      const eventCategoryGroups = await query.exec();
      return eventCategoryGroups.map((eventCategoryGroup) => eventCategoryGroup.toObject());
    } catch (error) {
      console.error('Error reading event category groups:', error);
      throw KnownCommonError(error);
    }
  }

  static async updateEventCategoryGroup(input: UpdateEventCategoryGroupInputType) {
    try {
      const updatedEventCategoryGroup = await EventCategoryGroup.findByIdAndUpdate(input.eventCategoryGroupId, input, { new: true })
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

  static async deleteEventCategoryGroupBySlug(slug: string): Promise<EventCategoryGroupType> {
    try {
      const deletedEventCategoryGroup = await EventCategoryGroup.findOneAndDelete({ slug }).exec();
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
