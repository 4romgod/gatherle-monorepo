import {GraphQLID, GraphQLList, GraphQLString, Thunk, GraphQLFieldConfigMap, GraphQLNonNull} from 'graphql';
import {EventCategoryType} from '../types';
import {EventCategoryDAO} from '../../mongodb/dao';

const users: Thunk<GraphQLFieldConfigMap<any, any>> = {
    readEventCategoryById: {
        type: EventCategoryType,
        args: {
            id: {type: GraphQLNonNull(GraphQLID)},
        },
        resolve(parent, {id}, context, resolveInfo) {
            return EventCategoryDAO.readEventCategoryById(id);
        },
    },
    readEventCategories: {
        type: GraphQLNonNull(GraphQLList(GraphQLNonNull(EventCategoryType))),
        resolve(parent, args, context, resolveInfo) {
            return EventCategoryDAO.readEventCategories();
        },
    },
};

export default users;
