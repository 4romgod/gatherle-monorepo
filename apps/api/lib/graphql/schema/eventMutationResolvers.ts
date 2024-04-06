import {GraphQLID, Thunk, GraphQLFieldConfigMap, GraphQLNonNull} from 'graphql';
import {CreateEventInputType, EventType, UpdateEventInputType} from '../types';
import {EventDAO} from '../../mongodb/dao';

const events: Thunk<GraphQLFieldConfigMap<any, any>> = {
    createEvent: {
        type: EventType,
        args: {
            input: {type: GraphQLNonNull(CreateEventInputType)},
        },
        resolve(parent, args, context, resolveInfo) {
            return EventDAO.create(args.input);
        },
    },
    updateEvent: {
        type: EventType,
        args: {
            id: {type: GraphQLNonNull(GraphQLID)},
            input: {type: GraphQLNonNull(UpdateEventInputType)},
        },
        resolve(parent, args, context, resolveInfo) {
            return EventDAO.updateEvent(args.eventID, args.input);
        },
    },
    deleteEvent: {
        type: EventType,
        args: {
            id: {type: GraphQLNonNull(GraphQLID)},
        },
        resolve(parent, args, context, resolveInfo) {
            return EventDAO.deleteEvent(args.eventID);
        },
    },
};

export default events;
