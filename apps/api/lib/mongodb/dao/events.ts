import {Event} from '../models';
import {ResourceNotFoundException, mongodbErrorHandler} from '../../utils';
import {EventType, UpdateEventInputType, CreateEventInputType, EventQueryParams} from '../../graphql/types';

class EventDAO {
    static async create(eventData: CreateEventInputType): Promise<EventType> {
        try {
            return await Event.create(eventData);
        } catch (error) {
            console.error('Error creating event:', error);
            throw mongodbErrorHandler(error);
        }
    }

    static async readEventById(id: string, projections?: Array<string>): Promise<EventType> {
        try {
            const query = Event.findById({id}).populate('organizers').populate('rSVPs').populate('eventCategory');
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const event = await query.exec();

            if (!event) {
                throw ResourceNotFoundException('Event not found');
            }
            return event;
        } catch (error) {
            console.error('Error reading event by id:', error);
            throw error;
        }
    }

    static async readEventBySlug(slug: string, projections?: Array<string>): Promise<EventType> {
        try {
            const query = Event.findOne({slug: slug}).populate('organizers').populate('rSVPs').populate('eventCategory');
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const event = await query.exec();

            if (!event) {
                throw ResourceNotFoundException('Event not found');
            }
            return event;
        } catch (error) {
            console.error('Error reading event by slug:', error);
            throw error;
        }
    }

    static async readEvents(queryParams?: EventQueryParams, projections?: Array<string>): Promise<Array<EventType>> {
        try {
            const query = Event.find({...queryParams})
                .populate('organizers')
                .populate('rSVPs')
                .populate('eventCategory');

            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            return await query.exec();
        } catch (error) {
            console.error('Error reading events:', error);
            throw error;
        }
    }

    static async updateEvent(event: UpdateEventInputType): Promise<EventType> {
        try {
            const updatedEvent = await Event.findByIdAndUpdate(event.id, {...event}, {new: true}).exec();
            if (!updatedEvent) {
                throw ResourceNotFoundException('Event not found');
            }
            return updatedEvent;
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    }

    static async deleteEvent(id: string): Promise<EventType> {
        try {
            const deletedEvent = await Event.findByIdAndUpdate(id).exec();
            if (!deletedEvent) {
                throw ResourceNotFoundException('Event not found');
            }
            return deletedEvent;
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }

    //TODO look deeper into this, its very suspecious. Why not just push 1 userID
    static async rsvp(id: string, userIDs: Array<string>) {
        try {
            const event = await Event.findOneAndUpdate({id}, {$addToSet: {rSVPs: {$each: userIDs}}}, {new: true}).exec();
            return event;
        } catch (error) {
            console.error("Error updating event RSVP's:", error);
            throw error;
        }
    }

    //TODO look deeper into this, its very suspecious. Why not just pop 1 userID
    static async cancelRsvp(id: string, userIDs: Array<string>) {
        try {
            const event = await Event.findOneAndUpdate({id}, {$pull: {rSVPs: {$in: userIDs}}}, {new: true}).exec();
            return event;
        } catch (error) {
            console.error("Error cancelling event RSVP's:", error);
            throw error;
        }
    }
}

export default EventDAO;
