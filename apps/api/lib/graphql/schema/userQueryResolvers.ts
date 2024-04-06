import {GraphQLID, GraphQLList, GraphQLString, Thunk, GraphQLFieldConfigMap} from 'graphql';
import {EventType, UserType} from '../types';
import {UserDAO} from '../../mongodb/dao';

const users: Thunk<GraphQLFieldConfigMap<any, any>> = {
    readUserById: {
        type: UserType,
        args: {
            id: {type: GraphQLID},
        },
        resolve(parent, args, context, resolveInfo) {
            return UserDAO.readUserById(args.id);
        },
    },
    readUsers: {
        type: new GraphQLList(UserType),
        resolve(parent, args, context, resolveInfo) {
            return UserDAO.readUsers();
        },
    },
    queryUsers: {
        args: {
            gender: {type: GraphQLString},
            // Write the other filters
        },
        type: new GraphQLList(UserType),
        resolve(parent, args, context, resolveInfo) {
            return UserDAO.readUsers({gender: args.gender});
        },
    },
};

export default users;
