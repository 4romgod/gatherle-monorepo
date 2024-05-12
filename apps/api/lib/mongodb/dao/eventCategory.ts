import {EventCategory} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {EventCategoryType, UpdateEventCategoryInputType, CreateEventCategoryInputType} from '../../graphql/types';

class EventDAO {
    static async create(category: CreateEventCategoryInputType): Promise<EventCategoryType> {
        try {
            return await EventCategory.create(category);
        } catch (error) {
            console.error('Error creating event category:', error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readEventCategoryById(id: string, projections?: Array<string>): Promise<EventCategoryType> {
        try {
            const query = EventCategory.findById({id});
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const event = await query.exec();

            if (!event) {
                throw ResourceNotFoundException('Event Category not found');
            }
            return event;
        } catch (error) {
            console.error('Error reading event category by id:', error);
            throw error;
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
                throw ResourceNotFoundException('Event Category not found');
            }
            return event;
        } catch (error) {
            console.error('Error reading event category by slug:', error);
            throw error;
        }
    }

    static async readEventCategories(): Promise<Array<EventCategoryType>> {
        try {
            const query = EventCategory.find();
            return await query.exec();
        } catch (error) {
            console.error('Error reading event categories:', error);
            throw error;
        }
    }

    static async updateEventCategory(category: UpdateEventCategoryInputType) {
        try {
            const updatedEventCategory = await EventCategory.findByIdAndUpdate(category.id, {...category}, {new: true}).exec();
            if (!updatedEventCategory) {
                throw ResourceNotFoundException('Event Category not found');
            }
            return updatedEventCategory;
        } catch (error) {
            console.error('Error updating event category:', error);
            throw error;
        }
    }

    static async deleteEventCategory(id: string): Promise<EventCategoryType> {
        try {
            const deletedEventCategory = await EventCategory.findOneAndDelete({id}).exec();
            if (!deletedEventCategory) {
                throw ResourceNotFoundException('Event Category not found');
            }
            return deletedEventCategory;
        } catch (error) {
            console.error('Error deleting event category by id:', error);
            throw error;
        }
    }
}

export default EventDAO;
