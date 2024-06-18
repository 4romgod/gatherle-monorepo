import {EventCategory} from '@/mongodb/models';
import {EventCategoryType, UpdateEventCategoryInputType, CreateEventCategoryInputType, QueryOptionsInput} from '@/graphql/types';
import {GraphQLError} from 'graphql';
import {CustomError, ErrorTypes, KnownCommonError, transformOptionsToQuery} from '@/utils';
import {kebabCase} from 'lodash';

class EventCategoryDAO {
    static async create(category: CreateEventCategoryInputType): Promise<EventCategoryType> {
        try {
            const slug = kebabCase(category.name);
            return await EventCategory.create({...category, slug});
        } catch (error) {
            console.log('Error creating event category', error);
            throw KnownCommonError(error);
        }
    }

    static async readEventCategoryById(eventId: string): Promise<EventCategoryType> {
        try {
            const query = EventCategory.findById(eventId);
            const event = await query.exec();
            if (!event) {
                throw CustomError(`Event Category with id ${eventId} does not exist`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            console.log(`Error reading event category by id ${eventId}`, error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readEventCategoryBySlug(slug: string): Promise<EventCategoryType> {
        try {
            const query = EventCategory.findOne({slug: slug});
            const event = await query.exec();
            if (!event) {
                throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            console.error('Error reading event category by slug:', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readEventCategories(options?: QueryOptionsInput): Promise<EventCategoryType[]> {
        try {
            const query = options ? transformOptionsToQuery(EventCategory, options) : EventCategory.find({});
            return await query.exec();
        } catch (error) {
            console.error('Error reading event categories:', error);
            throw KnownCommonError(error);
        }
    }

    static async updateEventCategory(category: UpdateEventCategoryInputType) {
        try {
            const slug = kebabCase(category.name);
            const updatedEventCategory = await EventCategory.findByIdAndUpdate(category.id, {...category, slug}, {new: true}).exec();
            if (!updatedEventCategory) {
                throw CustomError('Event Category not found', ErrorTypes.NOT_FOUND);
            }
            return updatedEventCategory;
        } catch (error) {
            console.error('Error updating event category', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async deleteEventCategoryById(eventId: string): Promise<EventCategoryType> {
        try {
            const deletedEventCategory = await EventCategory.findByIdAndDelete(eventId).exec();
            if (!deletedEventCategory) {
                throw CustomError(`Event Category with id ${eventId} not found`, ErrorTypes.NOT_FOUND);
            }
            return deletedEventCategory;
        } catch (error) {
            console.error('Error deleting event category by id:', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }
}

export default EventCategoryDAO;
