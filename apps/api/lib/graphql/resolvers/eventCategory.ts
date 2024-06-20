import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized} from 'type-graphql';
import {CreateEventCategoryInputType, EventCategoryType, UpdateEventCategoryInputType, UserRole} from '@/graphql/types';
import {EventCategoryDAO} from '@/mongodb/dao';
import {CreateEventCategoryTypeSchema, UpdateEventCategoryTypeSchema, validateInput, validateMongodbId} from '@/validation';
import {QueryOptionsInput} from '../types/query';
import {RESOLVER_DESCRIPTIONS} from '@/constants';

@Resolver()
export class EventCategoryResolver {
    @Authorized([UserRole.Admin])
    @Mutation(() => EventCategoryType, {description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.createEventCategory})
    async createEventCategory(@Arg('input', () => CreateEventCategoryInputType) input: CreateEventCategoryInputType): Promise<EventCategoryType> {
        validateInput<CreateEventCategoryInputType>(CreateEventCategoryTypeSchema, input);
        return EventCategoryDAO.create(input);
    }

    @Authorized([UserRole.Admin])
    @Mutation(() => EventCategoryType, {description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.updateEventCategory})
    async updateEventCategory(@Arg('input', () => UpdateEventCategoryInputType) input: UpdateEventCategoryInputType): Promise<EventCategoryType> {
        validateInput<UpdateEventCategoryInputType>(UpdateEventCategoryTypeSchema, input);
        return EventCategoryDAO.updateEventCategory(input);
    }

    @Authorized([UserRole.Admin])
    @Mutation(() => EventCategoryType, {description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.deleteEventCategoryById})
    async deleteEventCategoryById(@Arg('eventCategoryId') eventCategoryId: string): Promise<EventCategoryType> {
        validateMongodbId(eventCategoryId);
        return EventCategoryDAO.deleteEventCategoryById(eventCategoryId);
    }

    @Authorized([UserRole.Admin])
    @Mutation(() => EventCategoryType, {description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.deleteEventCategoryBySlug})
    async deleteEventCategoryBySlug(@Arg('slug') slug: string): Promise<EventCategoryType> {
        return EventCategoryDAO.deleteEventCategoryBySlug(slug);
    }

    @Query(() => EventCategoryType, {description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.readEventCategoryById})
    async readEventCategoryById(@Arg('eventCategoryId') eventCategoryId: string): Promise<EventCategoryType | null> {
        validateMongodbId(eventCategoryId);
        return EventCategoryDAO.readEventCategoryById(eventCategoryId);
    }

    @Query(() => EventCategoryType, {description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.readEventCategoryBySlug})
    async readEventCategoryBySlug(@Arg('slug') slug: string): Promise<EventCategoryType | null> {
        return EventCategoryDAO.readEventCategoryBySlug(slug);
    }

    @Query(() => [EventCategoryType], {description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.readEventCategories})
    async readEventCategories(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<EventCategoryType[]> {
        return EventCategoryDAO.readEventCategories(options);
    }
}
