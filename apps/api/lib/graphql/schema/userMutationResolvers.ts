import {GraphQLNonNull, Thunk, GraphQLFieldConfigMap, GraphQLString, GraphQLID} from 'graphql';
import {UserType, CreateUserInputType, UpdateUserInputType} from '../types';
import {UserDAO} from '../../mongodb/dao';

const users: Thunk<GraphQLFieldConfigMap<any, any>> = {
    createUser: {
        type: UserType,
        args: {
            input: {type: GraphQLNonNull(CreateUserInputType)},
        },
        resolve(parent, args, context, resolveInfo) {
            return UserDAO.create(args.input);
        },
    },
    updateUser: {
        type: UserType,
        args: {
            id: {type: GraphQLNonNull(GraphQLID)},
            input: {type: GraphQLNonNull(UpdateUserInputType)},
        },
        resolve(parent, args, context, resolveInfo) {
            return UserDAO.updateUser(args.id, args.input);
        },
    },
    deleteUser: {
        type: UserType,
        args: {
            id: {type: GraphQLNonNull(GraphQLID)},
        },
        resolve(parent, args, context, resolveInfo) {
            return UserDAO.deleteUser(args.id);
        },
    },
};

export default users;
