import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized} from 'type-graphql';
import {EventDAO} from '@/mongodb/dao';
import {CreateEventInputType, EventType, UpdateEventInputType, UserRole} from '@/graphql/types';
import {ERROR_MESSAGES, validateInput, validateMongodbId} from '@/validation';
import {CreateEventInputTypeSchema} from '@/validation/zod';
import {QueryOptionsInput} from '../types/query';
import {RESOLVER_DESCRIPTIONS} from '@/constants';

@Resolver()
export class EventResolver {
    @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
    @Mutation(() => EventType, {description: RESOLVER_DESCRIPTIONS.EVENT.createEvent})
    async createEvent(@Arg('input', () => CreateEventInputType) input: CreateEventInputType): Promise<EventType> {
        validateInput<CreateEventInputType>(CreateEventInputTypeSchema, input);
        return EventDAO.create(input);
    }

    @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
    @Mutation(() => EventType, {description: RESOLVER_DESCRIPTIONS.EVENT.updateEvent})
    async updateEvent(@Arg('input', () => UpdateEventInputType) input: UpdateEventInputType): Promise<EventType> {
        validateMongodbId(input.id, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', input.id));
        return EventDAO.updateEvent(input);
    }

    @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
    @Mutation(() => EventType, {description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventById})
    async deleteEventById(@Arg('eventId') eventId: string): Promise<EventType> {
        validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
        return EventDAO.deleteEventById(eventId);
    }

    @Query(() => EventType, {description: RESOLVER_DESCRIPTIONS.EVENT.readEventById})
    async readEventById(@Arg('eventId') eventId: string): Promise<EventType | null> {
        validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
        return EventDAO.readEventById(eventId);
    }

    @Query(() => EventType, {description: RESOLVER_DESCRIPTIONS.EVENT.readEventBySlug})
    async readEventBySlug(@Arg('slug') slug: string): Promise<EventType | null> {
        return EventDAO.readEventBySlug(slug);
    }

    @Query(() => [EventType], {description: RESOLVER_DESCRIPTIONS.EVENT.readEvents})
    async readEvents(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<EventType[]> {
        return EventDAO.readEvents(options);
    }
}
