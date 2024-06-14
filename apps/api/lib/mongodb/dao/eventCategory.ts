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
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.log('Error creating event category', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async readEventCategoryById(eventId: string, projections?: Array<string>): Promise<EventCategoryType> {
        try {
            const query = EventCategory.findById({id: eventId});
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const event = await query.exec();

            if (!event) {
                throw CustomError(`Event Category with id ${eventId} does not exist`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.log(`Error reading event category by id ${eventId}`, error);
                throw KnownCommonError(error);
            }
        }
    }

    static async readEventCategoryBySlug(slug: string, projections?: Array<string>): Promise<EventCategoryType> {
        try {
            const query = EventCategory.findOne({slug: slug});
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const event = await query.exec();

            if (!event) {
                throw CustomError(`Event Category with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error reading event category by slug:', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async readEventCategories(options?: QueryOptionsInput): Promise<EventCategoryType[]> {
        try {
            const query = options ? transformOptionsToQuery(EventCategory, options) : EventCategory.find({});
            return await query.exec();
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error reading event categories:', error);
                throw KnownCommonError(error);
            }
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
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error updating event category', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async deleteEventCategoryById(eventId: string): Promise<EventCategoryType> {
        try {
            const deletedEventCategory = await EventCategory.findOneAndDelete({_id: eventId}).exec();
            if (!deletedEventCategory) {
                throw CustomError(`Event Category with id ${eventId} not found`, ErrorTypes.NOT_FOUND);
            }
            return deletedEventCategory;
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error deleting event category by id:', error);
                throw KnownCommonError(error);
            }
        }
    }
}

export default EventCategoryDAO;
