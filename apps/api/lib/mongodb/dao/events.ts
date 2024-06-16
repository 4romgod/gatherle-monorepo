import {GraphQLError} from 'graphql';
import {Event} from '@/mongodb/models';
import {EventType, UpdateEventInputType, CreateEventInputType, QueryOptionsInput} from '@/graphql/types';
import {CustomError, ErrorTypes, KnownCommonError, transformIdFields, transformOptionsToQuery, transformOptionsToPipeline} from '@/utils';
import {kebabCase} from 'lodash';

class EventDAO {
    static async create(event: CreateEventInputType): Promise<EventType> {
        try {
            const slug = kebabCase(event.title);
            return (await Event.create({...event, slug})).populate('organizerList rSVPList eventCategoryList');
        } catch (error) {
            console.error('Error creating event', error);
            throw KnownCommonError(error);
        }
    }

    static async readEventById(eventId: string): Promise<EventType> {
        try {
            const query = Event.findById(eventId).populate('organizerList rSVPList eventCategoryList');
            const event = await query.exec();
            if (!event) {
                throw CustomError(`Event with id ${eventId} not found`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            console.error('Error reading event by id', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async readEventBySlug(slug: string): Promise<EventType> {
        try {
            const query = Event.findOne({slug: slug}).populate('organizerList rSVPList eventCategoryList');
            const event = await query.exec();
            if (!event) {
                throw CustomError(`Event with slug ${slug} not found`, ErrorTypes.NOT_FOUND);
            }
            return event;
        } catch (error) {
            console.error('Error reading event by slug:', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
        }
    }

    static async queryEvents(options?: QueryOptionsInput): Promise<EventType[]> {
        try {
            const query = options ? transformOptionsToQuery(Event, options) : Event.find({});
            const events = await query.populate('organizerList rSVPList eventCategoryList').exec();
            return events;
        } catch (error) {
            console.error('Error reading events', error);
            throw KnownCommonError(error);
        }
    }

    static async readEvents(options?: QueryOptionsInput): Promise<EventType[]> {
        try {
            const pipeline = transformOptionsToPipeline(options);
            const events = await Event.aggregate<EventType>(pipeline).exec();
            return transformIdFields(events);
        } catch (error) {
            console.error('Error reading events', error);
            throw KnownCommonError(error);
        }
    }

    static async updateEvent(event: UpdateEventInputType): Promise<EventType> {
        try {
            const {id, ...rest} = event;
            const updateProps = {...rest, slug: kebabCase(event.title)};
            const updatedEvent = await Event.findByIdAndUpdate(event.id, updateProps, {new: true})
                .populate('organizerList rSVPList eventCategoryList')
                .exec();

            if (!updatedEvent) {
                throw CustomError(`Event with id ${event.id} not found`, ErrorTypes.NOT_FOUND);
            }
            return updatedEvent;
        } catch (error) {
            console.error('Error updating event', error);
            if (error instanceof GraphQLError) {
                throw error;
            } else {
                throw KnownCommonError(error);
            }
        }
    }

    static async deleteEventById(eventId: string): Promise<EventType> {
        try {
            const deletedEvent = await Event.findByIdAndDelete(eventId).populate('organizerList rSVPList eventCategoryList').exec();
            if (!deletedEvent) {
                throw CustomError(`Event with id ${eventId} not found`, ErrorTypes.NOT_FOUND);
            }
            return deletedEvent;
        } catch (error) {
            console.error('Error deleting event', error);
            if (error instanceof GraphQLError) {
                throw error;
            }
            throw KnownCommonError(error);
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
            }
            throw KnownCommonError(error);
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
