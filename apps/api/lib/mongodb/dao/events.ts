import {GraphQLError} from 'graphql';
import {Event} from '@/mongodb/models';
import {EventType, UpdateEventInputType, CreateEventInputType, QueryOptionsInput} from '@/graphql/types';
import {CustomError, ErrorTypes, KnownCommonError, transformIdFields, transformOptionsToQuery} from '@/utils';
import {kebabCase} from 'lodash';
import {transformOptionsToPipeline} from '@/utils/queries/aggregate/eventsPipeline';

class EventDAO {
    static async create(event: CreateEventInputType): Promise<EventType> {
        try {
            const slug = kebabCase(event.title);
            return (await Event.create({...event, slug})).populate('organizerList rSVPList eventCategoryList');
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error creating event', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async readEventById(eventId: string, projections?: Array<string>): Promise<EventType> {
        try {
            const query = Event.findById(eventId).populate('organizerList rSVPList eventCategoryList');
            if (projections && projections.length) {
                query.select(projections.join(' '));
            }
            const event = await query.exec();

            if (!event) {
                throw CustomError(`Event with id ${eventId} not found`, ErrorTypes.NOT_FOUND);
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
            const query = Event.findOne({slug: slug}).populate('organizerList rSVPList eventCategoryList');
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

    static async queryEvents(options?: QueryOptionsInput): Promise<EventType[]> {
        try {
            const query = options ? transformOptionsToQuery(Event, options) : Event.find({});
            const events = await query.populate('organizerList rSVPList eventCategoryList').exec();
            return events;
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                console.error('Error reading events', error);
                throw KnownCommonError(error);
            }
        }
    }

    static async readEvents(options?: QueryOptionsInput): Promise<EventType[]> {
        try {
            const pipeline = transformOptionsToPipeline(options);
            const events = await Event.aggregate<EventType>(pipeline).exec();
            return transformIdFields(events);
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
            const updatedEvent = await Event.findByIdAndUpdate(event.id, {...event, ...(slug && {slug})}, {new: true})
                .populate('organizerList rSVPList eventCategoryList')
                .exec();
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

    static async deleteEventById(eventId: string): Promise<EventType> {
        try {
            const deletedEvent = await Event.findByIdAndDelete(eventId).populate('organizerList rSVPList eventCategoryList').exec();
            if (!deletedEvent) {
                throw CustomError(`Event with ID ${eventId} not found`, ErrorTypes.NOT_FOUND);
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

    static async deleteEventBySlug(slug: string): Promise<EventType> {
        try {
            const deletedEvent = await Event.findOneAndDelete({slug}).populate('organizerList rSVPList eventCategoryList').exec();
            if (!deletedEvent) {
                throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
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
    static async rsvp(eventId: string, userIDs: Array<string>) {
        try {
            const event = await Event.findOneAndUpdate({_id: eventId}, {$addToSet: {rSVPList: {$each: userIDs}}}, {new: true})
                .populate('organizerList rSVPList eventCategoryList')
                .exec();
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
    static async cancelRsvp(eventId: string, userIDs: Array<string>) {
        try {
            const event = await Event.findOneAndUpdate({_id: eventId}, {$pull: {rSVPList: {$in: userIDs}}}, {new: true})
                .populate('organizerList rSVPList eventCategoryList')
                .exec();
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
