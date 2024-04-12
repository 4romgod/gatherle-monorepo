import {GraphQLObjectType, GraphQLSchema} from 'graphql';
import eventQueryResolvers from './eventQueryResolvers';
import eventMutationResolvers from './eventMutationResolvers';
import eventCategoryQueryResolvers from './eventCategoryQueryResolvers';
import eventCategoryMutationResolvers from './eventCategoryMutationResolvers';
import userQueryResolvers from './userQueryResolvers';
import userMutationResolvers from './userMutationResolvers';

const query = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        ...eventQueryResolvers,
        ...eventCategoryQueryResolvers,
        ...userQueryResolvers,
    },
});

const mutation = new GraphQLObjectType({
    name: 'RootMutation',
    fields: {
        ...eventMutationResolvers,
        ...eventCategoryMutationResolvers,
        ...userMutationResolvers,
    },
});

export default new GraphQLSchema({
    query,
    mutation,
});
