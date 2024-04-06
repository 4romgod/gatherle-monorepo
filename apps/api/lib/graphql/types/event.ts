import {GraphQLObjectType, GraphQLString, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLInputObjectType} from 'graphql';
import {GraphQLJSONObject} from 'graphql-type-json';
import {UserType} from './user';
import {usersSampleData} from '../../mongodb/sampleData';

export const EventType = new GraphQLObjectType({
    name: 'Event',
    fields: {
        eventID: {type: GraphQLNonNull(GraphQLID)},
        title: {type: GraphQLNonNull(GraphQLString)},
        description: {type: GraphQLNonNull(GraphQLString)},
        startDate: {type: GraphQLNonNull(GraphQLString)},
        endDate: {type: GraphQLNonNull(GraphQLString)},
        location: {type: GraphQLNonNull(GraphQLString)},
        eventType: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
        eventCategory: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
        capacity: {type: GraphQLInt},
        status: {type: GraphQLNonNull(GraphQLString)},
        organizers: {
            type: GraphQLList(UserType),
            resolve(parent, args, context, resolveInfo) {
                return usersSampleData.filter((user) => parent.organizers.includes(user.id));
            },
        },
        rSVPs: {
            type: GraphQLList(UserType),
            resolve(parent, args, context, resolveInfo) {
                return usersSampleData.filter((user) => parent.rSVPs.includes(user.id));
            },
        },
        tags: {type: GraphQLJSONObject},
        media: {type: GraphQLJSONObject},
        additionalDetails: {type: GraphQLJSONObject},
        comments: {type: GraphQLJSONObject},
        privacySetting: {type: GraphQLString},
        eventLink: {type: GraphQLString},
    },
});

export const CreateEventInputType = new GraphQLInputObjectType({
    name: 'CreateEventInput',
    fields: {
        title: {type: new GraphQLNonNull(GraphQLString)},
        description: {type: new GraphQLNonNull(GraphQLString)},
        startDate: {type: GraphQLNonNull(GraphQLString)},
        endDate: {type: GraphQLNonNull(GraphQLString)},
        location: {type: GraphQLNonNull(GraphQLString)},
        eventType: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
        eventCategory: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
        capacity: {type: GraphQLInt},
        status: {type: GraphQLNonNull(GraphQLString)},
        organizers: {type: new GraphQLList(GraphQLString)},
        rSVPs: {type: GraphQLList(GraphQLString)},
        tags: {type: GraphQLJSONObject},
        media: {type: GraphQLJSONObject},
        additionalDetails: {type: GraphQLJSONObject},
        comments: {type: GraphQLJSONObject},
        privacySetting: {type: GraphQLString},
        eventLink: {type: GraphQLString},
    },
});

export const UpdateEventInputType = new GraphQLInputObjectType({
    name: 'UpdateEventInput',
    fields: {
        id: {type: GraphQLNonNull(GraphQLID)},
        title: {type: new GraphQLNonNull(GraphQLString)},
        description: {type: new GraphQLNonNull(GraphQLString)},
        startDate: {type: GraphQLNonNull(GraphQLString)},
        endDate: {type: GraphQLNonNull(GraphQLString)},
        location: {type: GraphQLNonNull(GraphQLString)},
        eventType: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
        eventCategory: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
        capacity: {type: GraphQLInt},
        status: {type: GraphQLNonNull(GraphQLString)},
        organizers: {type: new GraphQLList(GraphQLString)},
        rSVPs: {type: GraphQLList(GraphQLString)},
        tags: {type: GraphQLJSONObject},
        media: {type: GraphQLJSONObject},
        additionalDetails: {type: GraphQLJSONObject},
        comments: {type: GraphQLJSONObject},
        privacySetting: {type: GraphQLString},
        eventLink: {type: GraphQLString},
    },
});
