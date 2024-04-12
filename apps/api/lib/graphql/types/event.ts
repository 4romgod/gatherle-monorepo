import {GraphQLObjectType, GraphQLString, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLInputObjectType} from 'graphql';
import {GraphQLJSONObject} from 'graphql-type-json';
import {UserType} from './user';
import {EventCategoryType} from './eventCategory';

export const EventType = new GraphQLObjectType({
    name: 'Event',
    fields: {
        id: {type: GraphQLNonNull(GraphQLID)},
        title: {type: GraphQLNonNull(GraphQLString)},
        description: {type: GraphQLNonNull(GraphQLString)},
        startDate: {type: GraphQLNonNull(GraphQLString)},
        endDate: {type: GraphQLNonNull(GraphQLString)},
        location: {type: GraphQLNonNull(GraphQLString)},
        status: {type: GraphQLNonNull(GraphQLString)},
        capacity: {type: GraphQLInt},
        eventCategory: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(EventCategoryType)))},
        organizers: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(UserType)))},
        rSVPs: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(UserType)))},
        tags: {type: GraphQLJSONObject},
        media: {
            type: GraphQLNonNull(
                new GraphQLObjectType({
                    name: 'Media',
                    fields: {
                        featuredImageUrl: {type: GraphQLNonNull(GraphQLString)},
                        otherMediaData: {type: GraphQLJSONObject},
                    },
                }),
            ),
        },
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
        status: {type: GraphQLNonNull(GraphQLString)},
        capacity: {type: GraphQLInt},
        eventCategory: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))}, // input is a string
        organizers: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))}, // input is a string
        rSVPs: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))}, // input is a string
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
        status: {type: GraphQLNonNull(GraphQLString)},
        capacity: {type: GraphQLInt},
        eventCategory: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))}, // input is a string
        organizers: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))}, // input is a string
        rSVPs: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))}, // input is a string
        tags: {type: GraphQLJSONObject},
        media: {type: GraphQLJSONObject},
        additionalDetails: {type: GraphQLJSONObject},
        comments: {type: GraphQLJSONObject},
        privacySetting: {type: GraphQLString},
        eventLink: {type: GraphQLString},
    },
});
