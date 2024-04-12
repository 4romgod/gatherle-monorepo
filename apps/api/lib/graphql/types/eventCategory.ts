import {GraphQLObjectType, GraphQLString, GraphQLID, GraphQLNonNull, GraphQLInputObjectType} from 'graphql';

export const EventCategoryType = new GraphQLObjectType({
    name: 'EventCategory',
    fields: {
        id: {type: GraphQLNonNull(GraphQLID)},
        name: {type: GraphQLNonNull(GraphQLString)},
        iconName: {type: GraphQLNonNull(GraphQLString)},
        description: {type: GraphQLNonNull(GraphQLString)},
        color: {type: GraphQLString},
    },
});

export const CreateEventCategoryInputType = new GraphQLInputObjectType({
    name: 'CreateEventCategoryInput',
    fields: {
        name: {type: GraphQLNonNull(GraphQLString)},
        iconName: {type: GraphQLNonNull(GraphQLString)},
        description: {type: GraphQLNonNull(GraphQLString)},
        color: {type: GraphQLString},
    },
});

export const UpdateEventCategoryInputType = new GraphQLInputObjectType({
    name: 'UpdateEventCategoryInput',
    fields: {
        name: {type: GraphQLNonNull(GraphQLString)},
        iconName: {type: GraphQLNonNull(GraphQLString)},
        description: {type: GraphQLNonNull(GraphQLString)},
        color: {type: GraphQLString},
    },
});
