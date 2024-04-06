import {GraphQLObjectType, GraphQLString, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull} from 'graphql';
import {GraphQLJSONObject} from 'graphql-type-json';
import {IEvent} from '../../interface';
import UserType from './user';
import {usersSampleData} from '../../mongodb/sampleData';

const EventType = new GraphQLObjectType({
    name: 'Event',
    fields: {
        _id: {type: new GraphQLNonNull(GraphQLID)},
        eventID: {type: new GraphQLNonNull(GraphQLID)},
        title: {type: new GraphQLNonNull(GraphQLString)},
        description: {type: new GraphQLNonNull(GraphQLString)},
        startDate: {type: GraphQLString},
        endDate: {type: GraphQLString},
        location: {type: GraphQLString},
        eventType: {type: GraphQLList(GraphQLString)},
        eventCategory: {type: GraphQLList(GraphQLString)},
        capacity: {type: GraphQLInt},
        eventLink: {type: GraphQLString},
        privacySetting: {type: GraphQLString},
        status: {type: GraphQLString},
        organizers: {
            type: new GraphQLList(UserType),
            resolve(parent, args, context, resolveInfo) {
                return usersSampleData.filter((user) => parent.organizers.includes(user.userID));
            },
        },
        rSVPs: {
            type: new GraphQLList(UserType),
            resolve(parent, args, context, resolveInfo) {
                return usersSampleData.filter((user) => parent.rSVPs.includes(user.userID));
            },
        },
        tags: {type: GraphQLJSONObject},
        media: {type: GraphQLJSONObject},
        additionalDetails: {type: GraphQLJSONObject},
        comments: {type: GraphQLJSONObject},
    },
});

export default EventType;
