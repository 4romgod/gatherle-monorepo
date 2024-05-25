import {Event} from '../models';
import {EventType, UpdateEventInputType, CreateEventInputType, EventQueryParams} from '../../graphql/types';
import {transformReadEventsQueryParams} from '../../utils/queries/events';
import {GraphQLError} from 'graphql';
import {CustomError, ErrorTypes, KnownCommonError} from '../../utils';
import {kebabCase} from 'lodash';

class EventDAO {
    static async create(event: CreateEventInputType): Promise<EventType> {
        try {
            const slug = kebabCase(event.title);
            return await Event.create({...event, slug});
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error creating event', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async readEventById(id: string, projections?: Array<string>): Promise<EventType> {
        try {
            const query = Event.findById(id).populate('organizers').populate('rSVPs').populate('eventCategory');
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const event = await query.exec();

            if (!event) {
                throw CustomError(`Event with id ${id} not found`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error reading event by id', error);
                throw KnownCommonError(error);
            }
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
                throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error reading event by slug:', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async readEvents(queryParams?: EventQueryParams, projections?: Array<string>): Promise<Array<EventType>> {
        try {
            const queryConditions = transformReadEventsQueryParams(queryParams);
            const query = Event.find({...queryConditions})
                .populate('organizers')
                .populate('rSVPs')
                .populate('eventCategory');

            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            return await query.exec();
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error reading events', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async updateEvent(event: UpdateEventInputType): Promise<EventType> {
        try {
            const slug = kebabCase(event.title);
            const updatedEvent = await Event.findByIdAndUpdate(event.id, {...event, slug}, {new: true}).exec();
            if (!updatedEvent) {
                throw CustomError(`Event with ID ${event.id} not found`, ErrorTypes.NOT_FOUND);
            }
            return updatedEvent;
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error updating event', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async deleteEvent(id: string): Promise<EventType> {
        try {
            const deletedEvent = await Event.findByIdAndDelete(id).exec();
            if (!deletedEvent) {
                throw CustomError(`Event with ID ${id} not found`, ErrorTypes.NOT_FOUND);
            }
            return deletedEvent;
        } catch (error) {
            console.error('Error deleting event', error);
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                throw KnownCommonError(error);
            }
        }
    }

    //TODO look deeper into this, its very suspecious. Why not just push 1 userID
    static async rsvp(id: string, userIDs: Array<string>) {
        try {
            const event = await Event.findOneAndUpdate({_id: id}, {$addToSet: {rSVPs: {$each: userIDs}}}, {new: true}).exec();
            return event;
        } catch (error) {
            console.error("Error updating event RSVP's", error);
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                throw KnownCommonError(error);
            }
        }
    }

    //TODO look deeper into this, its very suspecious. Why not just pop 1 userID
    static async cancelRsvp(id: string, userIDs: Array<string>) {
        try {
            const event = await Event.findOneAndUpdate({_id: id}, {$pull: {rSVPs: {$in: userIDs}}}, {new: true}).exec();
            return event;
        } catch (error) {
            console.error("Error cancelling event RSVP's", error);
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                throw KnownCommonError(error);
            }
        }
    }
}

export default EventDAO;
