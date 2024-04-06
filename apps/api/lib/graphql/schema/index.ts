import {GraphQLObjectType, GraphQLSchema} from 'graphql';
import eventQueryResolvers from './eventQueryResolvers';
import eventMutationResolvers from './eventMutationResolvers';
import userQueryResolvers from './userQueryResolvers';
import userMutationResolvers from './userMutationResolvers';

const query = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        ...eventQueryResolvers,
        ...userQueryResolvers,
    },
});

const mutation = new GraphQLObjectType({
    name: 'RootMutation',
    fields: {
        ...eventMutationResolvers,
        ...userMutationResolvers,
    },
});

export default new GraphQLSchema({
    query,
    mutation,
});
