import {IEvent, ICreateEvent, IUpdateEvent} from '../../interface';
import {Event} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {v4 as uuidv4} from 'uuid';

export type EventQueryParams = Partial<Record<keyof IEvent, any>>;

class EventDAO {
    static async create(eventData: ICreateEvent): Promise<IEvent> {
        try {
            return await Event.create({
                ...eventData,
                eventID: uuidv4(),
            });
        } catch (error) {
            console.log(error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readEventById(eventID: string, projections?: Array<string>): Promise<IEvent> {
        const query = Event.findById({eventID});
        if (projections && projections.length) {
            query.select(projections.join(' '));
        }
        const event = await query.exec();

        if (!event) {
            throw ResourceNotFoundException('Event not found');
        }
        return event;
    }

    static async readEvents(queryParams?: EventQueryParams, projections?: Array<string>): Promise<Array<IEvent>> {
        const query = Event.find({...queryParams});
        if (projections && projections.length) {
            query.select(projections.join(' '));
        }
        return await query.exec();
    }

    static async updateEvent(eventID: string, eventData: IUpdateEvent) {
        const updatedEvent = await Event.findOneAndUpdate({eventID}, {...eventData, eventID}, {new: true}).exec();
        if (!updatedEvent) {
            throw ResourceNotFoundException('Event not found');
        }
        return updatedEvent;
    }

    static async deleteEvent(eventID: string): Promise<IEvent> {
        const deletedEvent = await Event.findOneAndDelete({eventID}).exec();
        if (!deletedEvent) {
            throw ResourceNotFoundException('Event not found');
        }
        return deletedEvent;
    }

    //TODO look deeper into this, its very suspecious. Why not just push 1 userID
    static async rsvp(eventID: string, userIDs: Array<string>) {
        const event = await Event.findOneAndUpdate({eventID}, {$addToSet: {rSVPs: {$each: userIDs}}}, {new: true}).exec();
        return event;
    }

    //TODO look deeper into this, its very suspecious. Why not just pop 1 userID
    static async cancelRsvp(eventID: string, userIDs: Array<string>) {
        const event = await Event.findOneAndUpdate({eventID}, {$pull: {rSVPs: {$in: userIDs}}}, {new: true}).exec();
        return event;
    }
}

export default EventDAO;
