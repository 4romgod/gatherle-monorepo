import {IEventCategory} from '../../interface';
import {EventCategory} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {Schema} from 'mongoose';

class EventDAO {
    static async create(category: IEventCategory): Promise<IEventCategory> {
        try {
            return await EventCategory.create(category);
        } catch (error) {
            console.log(error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readEventCategoryById(id: string, projections?: Array<string>): Promise<IEventCategory> {
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

    static async readEventCategories(): Promise<Array<IEventCategory>> {
        const query = EventCategory.find();
        return await query.exec();
    }

    static async updateEventCategory(id: string, category: IEventCategory) {
        const updatedEventCategory = await EventCategory.findOneAndUpdate({id}, {...category, id}, {new: true}).exec();
        if (!updatedEventCategory) {
            throw ResourceNotFoundException('Event Category not found');
        }
        return updatedEventCategory;
    }

    static async deleteEventCategory(id: string): Promise<IEventCategory> {
        const deletedEventCategory = await EventCategory.findOneAndDelete({id}).exec();
        if (!deletedEventCategory) {
            throw ResourceNotFoundException('Event Category not found');
        }
        return deletedEventCategory;
    }
}

export default EventDAO;
