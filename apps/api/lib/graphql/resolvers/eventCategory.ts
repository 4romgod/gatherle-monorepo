import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query} from 'type-graphql';
import {CreateEventCategoryInputType, EventCategoryType, UpdateEventCategoryInputType} from '../types';
import {EventCategoryDAO} from '../../mongodb/dao';

@Resolver()
export class EventCategoryResolver {
    @Mutation(() => EventCategoryType)
    async createEventCategory(@Arg('input', () => CreateEventCategoryInputType) input: CreateEventCategoryInputType): Promise<EventCategoryType> {
        return EventCategoryDAO.create(input);
    }

    @Mutation(() => EventCategoryType)
    async updateEventCategory(@Arg('input', () => UpdateEventCategoryInputType) input: UpdateEventCategoryInputType): Promise<EventCategoryType> {
        return EventCategoryDAO.updateEventCategory(input);
    }

    @Mutation(() => EventCategoryType)
    async deleteEvent(@Arg('id') id: string): Promise<EventCategoryType> {
        return EventCategoryDAO.deleteEventCategory(id);
    }

    @Query(() => EventCategoryType)
    async readEventCategoryById(@Arg('id') id: string): Promise<EventCategoryType | null> {
        return EventCategoryDAO.readEventCategoryById(id);
    }

    @Query(() => [EventCategoryType])
    async readEventCategories(): Promise<EventCategoryType[]> {
        return EventCategoryDAO.readEventCategories();
    }
}
