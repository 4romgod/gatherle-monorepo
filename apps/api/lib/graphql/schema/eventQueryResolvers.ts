import {GraphQLID, GraphQLList, GraphQLString, Thunk, GraphQLFieldConfigMap} from 'graphql';
import {EventType} from '../types';
import {EventDAO} from '../../mongodb/dao';

const events: Thunk<GraphQLFieldConfigMap<any, any>> = {
    readEventById: {
        type: EventType,
        args: {
            id: {type: GraphQLID},
        },
        resolve(parent, args, context, resolveInfo) {
            return EventDAO.readEventById(args.eventID);
        },
    },
    readEvents: {
        type: new GraphQLList(EventType),
        resolve(parent, args, context, resolveInfo) {
            return EventDAO.readEvents();
        },
    },
    queryEvents: {
        args: {
            title: {type: GraphQLString},
            // Write the other filters
        },
        type: new GraphQLList(EventType),
        resolve(parent, args, context, resolveInfo) {
            return EventDAO.readEvents({title: args.title});
        },
    },
};

export default events;
