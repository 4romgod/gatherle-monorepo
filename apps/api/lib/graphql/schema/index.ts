import {GraphQLObjectType, GraphQLID, GraphQLList, GraphQLSchema, GraphQLString} from 'graphql';
import {EventType, UserType} from '../types';
import {usersSampleData, eventsSampleData} from '../../mongodb/sampleData';

const RootQuery = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        readEventById: {
            type: EventType,
            args: {
                eventID: {type: GraphQLID},
            },
            resolve(parent, args, context, resolveInfo) {
                return eventsSampleData.find((event) => event.eventID === args.eventID);
            },
        },
        readEvents: {
            type: new GraphQLList(EventType),
            resolve(parent, args, context, resolveInfo) {
                return eventsSampleData;
            },
        },
        readEventsQuery: {
            args: {
                title: {type: GraphQLString},
                // Write the other filters
            },
            type: new GraphQLList(EventType),
            resolve(parent, args, context, resolveInfo) {
                return eventsSampleData.filter((event) => event.title === args.title);
            },
        },
        readUserById: {
            type: UserType,
            args: {
                userID: {type: GraphQLID},
            },
            resolve(parent, args, context, resolveInfo) {
                return usersSampleData.find((user) => user.userID === args.userID);
            },
        },
        readUsers: {
            args: {
                gender: {type: GraphQLString},
                // Write the other filters
            },
            type: new GraphQLList(UserType),
            resolve(parent, args, context, resolveInfo) {
                return usersSampleData.find((user) => user.gender === args.gender);
            },
        },
    },
});

// const RootMutation = new GraphQLObjectType({
//     name: 'RootMutation',
//     fields: {
//         createEvent: {
//             type: EventType,
//             args: {
//                 ...{EventType}
//             },
//             resolve(parent, args, context, resolveInfo) {
//                 return EventDAO.create(args);
//             },
//         },
//     },
// });

export default new GraphQLSchema({
    query: RootQuery,
    // mutation: RootMutation,
});
