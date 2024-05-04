import {EventCategory} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {EventCategoryType, UpdateEventCategoryInputType, CreateEventCategoryInputType} from '../../graphql/types';

class EventDAO {
    static async create(category: CreateEventCategoryInputType): Promise<EventCategoryType> {
        try {
            return await EventCategory.create(category);
        } catch (error) {
            console.log(error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readEventCategoryById(id: string, projections?: Array<string>): Promise<EventCategoryType> {
        const query = EventCategory.findById({id});
        if (projections && projections.length) {
            query.select(projections.join(' '));
        }
        const event = await query.exec();

        if (!event) {
            throw ResourceNotFoundException('Event Category not found');
        }
        return event;
    }

    static async readEventCategories(): Promise<Array<EventCategoryType>> {
        const query = EventCategory.find();
        return await query.exec();
    }

    static async updateEventCategory(category: UpdateEventCategoryInputType) {
        const updatedEventCategory = await EventCategory.findByIdAndUpdate(category.id, {...category}, {new: true}).exec();
        if (!updatedEventCategory) {
            throw ResourceNotFoundException('Event Category not found');
        }
        return updatedEventCategory;
    }

    static async deleteEventCategory(id: string): Promise<EventCategoryType> {
        const deletedEventCategory = await EventCategory.findOneAndDelete({id}).exec();
        if (!deletedEventCategory) {
            throw ResourceNotFoundException('Event Category not found');
        }
        return deletedEventCategory;
    }
}

export default EventDAO;
