import 'reflect-metadata';
import {Arg, Mutation, Resolver, Query, Authorized} from 'type-graphql';
import {CreateEventInput, Event, UpdateEventInput, UserRole, QueryOptionsInput} from '@ntlango/commons/types';
import {ERROR_MESSAGES, validateInput, validateMongodbId} from '@/validation';
import {CreateEventInputSchema, UpdateEventInputSchema} from '@/validation/zod';
import {RESOLVER_DESCRIPTIONS} from '@/constants';
import {EventDAO} from '@/mongodb/dao';

@Resolver(() => Event)
export class EventResolver {
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.createEvent})
  async createEvent(@Arg('input', () => CreateEventInput) input: CreateEventInput): Promise<Event> {
    validateInput<CreateEventInput>(CreateEventInputSchema, input);
    return EventDAO.create(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.updateEvent})
  async updateEvent(@Arg('input', () => UpdateEventInput) input: UpdateEventInput): Promise<Event> {
    validateInput<UpdateEventInput>(UpdateEventInputSchema, input);
    return EventDAO.updateEvent(input);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventById})
  async deleteEventById(@Arg('eventId', () => String) eventId: string): Promise<Event> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
    return EventDAO.deleteEventById(eventId);
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.deleteEventBySlug})
  async deleteEventBySlug(@Arg('slug', () => String) slug: string): Promise<Event> {
    return EventDAO.deleteEventBySlug(slug);
  }

  @Query(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.readEventById})
  async readEventById(@Arg('eventId', () => String) eventId: string): Promise<Event | null> {
    validateMongodbId(eventId, ERROR_MESSAGES.NOT_FOUND('Event', 'ID', eventId));
    return EventDAO.readEventById(eventId);
  }

  @Query(() => Event, {description: RESOLVER_DESCRIPTIONS.EVENT.readEventBySlug})
  async readEventBySlug(@Arg('slug', () => String) slug: string): Promise<Event | null> {
    return EventDAO.readEventBySlug(slug);
  }

  @Query(() => [Event], {description: RESOLVER_DESCRIPTIONS.EVENT.readEvents})
  async readEvents(@Arg('options', () => QueryOptionsInput, {nullable: true}) options?: QueryOptionsInput): Promise<Event[]> {
    return EventDAO.readEvents(options);
  }
}
