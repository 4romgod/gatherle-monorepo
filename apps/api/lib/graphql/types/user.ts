import {GraphQLObjectType, GraphQLString, GraphQLID, GraphQLNonNull, GraphQLScalarType} from 'graphql';
import {IUser} from '../../interface';

const UserType = new GraphQLObjectType<IUser>({
    name: 'User',
    fields: {
        _id: {type: new GraphQLNonNull(GraphQLID)},
        userID: {type: new GraphQLNonNull(GraphQLID)},
        address: {type: GraphQLString},
        birthdate: {type: GraphQLString},
        email: {type: GraphQLString},
        family_name: {type: GraphQLString},
        gender: {type: GraphQLString},
        given_name: {type: GraphQLString},
        password: {type: GraphQLString},
        phone_number: {type: GraphQLString},
        preferred_username: {type: GraphQLString},
        profile_picture: {type: GraphQLString},
        website: {type: GraphQLString},
    },
});

export default UserType;
