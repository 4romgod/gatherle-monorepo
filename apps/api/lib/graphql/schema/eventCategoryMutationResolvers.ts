import {GraphQLID, Thunk, GraphQLFieldConfigMap, GraphQLNonNull} from 'graphql';
import {CreateEventCategoryInputType, EventCategoryType, UpdateEventCategoryInputType} from '../types';
import {EventCategoryDAO} from '../../mongodb/dao';

const eventCategories: Thunk<GraphQLFieldConfigMap<any, any>> = {
    createEventCategory: {
        type: EventCategoryType,
        args: {
            input: {type: GraphQLNonNull(CreateEventCategoryInputType)},
        },
        resolve(parent, {input}, context, resolveInfo) {
            return EventCategoryDAO.create(input);
        },
    },
    updateEventCategory: {
        type: EventCategoryType,
        args: {
            id: {type: GraphQLNonNull(GraphQLID)},
            input: {type: GraphQLNonNull(UpdateEventCategoryInputType)},
        },
        resolve(parent, {id, input}, context, resolveInfo) {
            return EventCategoryDAO.updateEventCategory(id, input);
        },
    },
    deleteEvent: {
        type: EventCategoryType,
        args: {
            id: {type: GraphQLNonNull(GraphQLID)},
        },
        resolve(parent, {id}, context, resolveInfo) {
            return EventCategoryDAO.deleteEventCategory(id);
        },
    },
};

export default eventCategories;
