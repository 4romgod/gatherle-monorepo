import {IEvent, ICreateEvent, IUpdateEvent} from '../../interface';
import {Event} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {Schema} from 'mongoose';

export type EventQueryParams = Partial<Record<keyof IEvent, any>>;

class EventDAO {
    static async create(eventData: ICreateEvent): Promise<IEvent> {
        try {
            return await Event.create(eventData);
        } catch (error) {
            console.log(error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readEventById(id: string, projections?: Array<string>): Promise<IEvent> {
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

    static async readEvents(queryParams?: EventQueryParams, projections?: Array<string>): Promise<Array<IEvent>> {
        const query = Event.find({...queryParams})
            .populate('organizers')
            .populate('rSVPs')
            .populate('eventCategory');

        if (projections && projections.length) {
            query.select(projections.join(' '));
        }
        return await query.exec();
    }

    static async updateEvent(id: string, eventData: IUpdateEvent) {
        const updatedEvent = await Event.findOneAndUpdate({id}, {...eventData, id}, {new: true}).exec();
        if (!updatedEvent) {
            throw ResourceNotFoundException('Event not found');
        }
        return updatedEvent;
    }

    static async deleteEvent(id: string): Promise<IEvent> {
        const deletedEvent = await Event.findOneAndDelete({id}).exec();
        if (!deletedEvent) {
            throw ResourceNotFoundException('Event not found');
        }
        return deletedEvent;
    }

    //TODO look deeper into this, its very suspecious. Why not just push 1 userID
    static async rsvp(id: string, userIDs: Array<Schema.Types.ObjectId>) {
        const event = await Event.findOneAndUpdate({id}, {$addToSet: {rSVPs: {$each: userIDs}}}, {new: true}).exec();
        return event;
    }

    //TODO look deeper into this, its very suspecious. Why not just pop 1 userID
    static async cancelRsvp(id: string, userIDs: Array<Schema.Types.ObjectId>) {
        const event = await Event.findOneAndUpdate({id}, {$pull: {rSVPs: {$in: userIDs}}}, {new: true}).exec();
        return event;
    }
}

export default EventDAO;
