import {GraphQLObjectType, GraphQLString, GraphQLID, GraphQLNonNull, GraphQLInputObjectType} from 'graphql';

export const UserType = new GraphQLObjectType({
    name: 'User',
    fields: {
        id: {type: GraphQLNonNull(GraphQLID)},
        email: {type: GraphQLNonNull(GraphQLString)},
        username: {type: GraphQLNonNull(GraphQLString)},
        address: {type: GraphQLNonNull(GraphQLString)},
        birthdate: {type: GraphQLNonNull(GraphQLString)},
        given_name: {type: GraphQLNonNull(GraphQLString)},
        family_name: {type: GraphQLNonNull(GraphQLString)},
        gender: {type: GraphQLNonNull(GraphQLString)},
        encrypted_password: {type: GraphQLNonNull(GraphQLString)},
        phone_number: {type: GraphQLString},
        profile_picture: {type: GraphQLString},
        userType: {type: GraphQLNonNull(GraphQLString)},
    },
});

export const CreateUserInputType = new GraphQLInputObjectType({
    name: 'CreateUserInput',
    fields: () => ({
        email: {type: GraphQLNonNull(GraphQLString)},
        username: {type: GraphQLString},
        address: {type: GraphQLNonNull(GraphQLString)},
        birthdate: {type: GraphQLNonNull(GraphQLString)},
        given_name: {type: GraphQLNonNull(GraphQLString)},
        family_name: {type: GraphQLNonNull(GraphQLString)},
        gender: {type: GraphQLNonNull(GraphQLString)},
        password: {type: GraphQLNonNull(GraphQLString)},
        phone_number: {type: GraphQLString},
        profile_picture: {type: GraphQLString},
        userType: {type: GraphQLNonNull(GraphQLString)},
    }),
});

export const UpdateUserInputType = new GraphQLInputObjectType({
    name: 'UpdateUserInput',
    fields: () => ({
        email: {type: GraphQLNonNull(GraphQLString)},
        username: {type: GraphQLString},
        address: {type: GraphQLNonNull(GraphQLString)},
        birthdate: {type: GraphQLNonNull(GraphQLString)},
        given_name: {type: GraphQLNonNull(GraphQLString)},
        family_name: {type: GraphQLNonNull(GraphQLString)},
        gender: {type: GraphQLNonNull(GraphQLString)},
        password: {type: GraphQLNonNull(GraphQLString)},
        phone_number: {type: GraphQLString},
        profile_picture: {type: GraphQLString},
        userType: {type: GraphQLNonNull(GraphQLString)},
    }),
});
