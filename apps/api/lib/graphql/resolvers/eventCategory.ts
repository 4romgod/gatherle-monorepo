import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized} from 'type-graphql';
import {CreateEventCategoryInputType, EventCategoryType, UpdateEventCategoryInputType, UserRole} from '@/graphql/types';
import {EventCategoryDAO} from '@/mongodb/dao';
import {validateMongodbId} from '@/validation';
import {QueryOptionsInput} from '../types/query';

@Resolver()
export class EventCategoryResolver {
    @Authorized([UserRole.Admin])
    @Mutation(() => EventCategoryType)
    async createEventCategory(@Arg('input', () => CreateEventCategoryInputType) input: CreateEventCategoryInputType): Promise<EventCategoryType> {
        return EventCategoryDAO.create(input);
    }

    @Authorized([UserRole.Admin])
    @Mutation(() => EventCategoryType)
    async updateEventCategory(@Arg('input', () => UpdateEventCategoryInputType) input: UpdateEventCategoryInputType): Promise<EventCategoryType> {
        return EventCategoryDAO.updateEventCategory(input);
    }

    @Authorized([UserRole.Admin])
    @Mutation(() => EventCategoryType)
    async deleteEventCategory(@Arg('id') id: string): Promise<EventCategoryType> {
        validateMongodbId(id);
        return EventCategoryDAO.deleteEventCategoryById(id);
    }

    @Query(() => EventCategoryType)
    async readEventCategoryById(@Arg('eventCategoryId') eventCategoryId: string): Promise<EventCategoryType | null> {
        return EventCategoryDAO.readEventCategoryById(eventCategoryId);
    }

    @Query(() => EventCategoryType)
    async readEventCategoryBySlug(@Arg('slug') slug: string): Promise<EventCategoryType | null> {
        return EventCategoryDAO.readEventCategoryBySlug(slug);
    }

    @Query(() => [EventCategoryType])
    async readEventCategories(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<EventCategoryType[]> {
        return EventCategoryDAO.readEventCategories(options);
    }
}
