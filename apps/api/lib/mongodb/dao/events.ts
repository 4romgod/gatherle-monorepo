import {Event} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {EventType, UpdateEventInputType, CreateEventInputType, EventQueryParams} from '../../graphql/types';

class EventDAO {
    static async create(eventData: CreateEventInputType): Promise<EventType> {
        try {
            return await Event.create(eventData);
        } catch (error) {
            console.log(error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readEventById(id: string, projections?: Array<string>): Promise<EventType> {
        const query = Event.findById({id}).populate('organizers').populate('rSVPs').populate('eventCategory');
        if (projections && projections.length) {
            query.select(projections.join(' '));
        }
        const event = await query.exec();

        if (!event) {
            throw ResourceNotFoundException('Event not found');
        }
        return event;
    }

    static async readEvents(queryParams?: EventQueryParams, projections?: Array<string>): Promise<Array<EventType>> {
        const query = Event.find({...queryParams})
            .populate('organizers')
            .populate('rSVPs')
            .populate('eventCategory');

        if (projections && projections.length) {
            query.select(projections.join(' '));
        }
        return await query.exec();
    }

    static async updateEvent(event: UpdateEventInputType): Promise<EventType> {
        const updatedEvent = await Event.findByIdAndUpdate(event.id, {...event}, {new: true}).exec();
        if (!updatedEvent) {
            throw ResourceNotFoundException('Event not found');
        }
        return updatedEvent;
    }

    static async deleteEvent(id: string): Promise<EventType> {
        const deletedEvent = await Event.findByIdAndUpdate(id).exec();
        if (!deletedEvent) {
            throw ResourceNotFoundException('Event not found');
        }
        return deletedEvent;
    }

    //TODO look deeper into this, its very suspecious. Why not just push 1 userID
    static async rsvp(id: string, userIDs: Array<string>) {
        const event = await Event.findOneAndUpdate({id}, {$addToSet: {rSVPs: {$each: userIDs}}}, {new: true}).exec();
        return event;
    }

    //TODO look deeper into this, its very suspecious. Why not just pop 1 userID
    static async cancelRsvp(id: string, userIDs: Array<string>) {
        const event = await Event.findOneAndUpdate({id}, {$pull: {rSVPs: {$in: userIDs}}}, {new: true}).exec();
        return event;
    }
}

export default EventDAO;
