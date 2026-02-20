import 'reflect-metadata';
import { Arg, Mutation, Resolver, Query, Authorized, FieldResolver, Root, Ctx, Int } from 'type-graphql';
import {
  CreateEventCategoryInput,
  EventCategory,
  UpdateEventCategoryInput,
  UserRole,
  QueryOptionsInput,
} from '@gatherle/commons/types';
import { EventCategoryDAO } from '@/mongodb/dao';
import { CreateEventCategorySchema, UpdateEventCategorySchema, validateInput, validateMongodbId } from '@/validation';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import type { ServerContext } from '@/graphql';

@Resolver(() => EventCategory)
export class EventCategoryResolver {
  @FieldResolver(() => Int, { nullable: true })
  async interestedUsersCount(@Root() eventCategory: EventCategory, @Ctx() context: ServerContext): Promise<number> {
    if (!eventCategory.eventCategoryId) {
      return 0;
    }
    return context.loaders.eventCategoryInterestCount.load(eventCategory.eventCategoryId);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategory, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.createEventCategory })
  async createEventCategory(
    @Arg('input', () => CreateEventCategoryInput) input: CreateEventCategoryInput,
  ): Promise<EventCategory> {
    validateInput<CreateEventCategoryInput>(CreateEventCategorySchema, input);
    return EventCategoryDAO.create(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategory, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.updateEventCategory })
  async updateEventCategory(
    @Arg('input', () => UpdateEventCategoryInput) input: UpdateEventCategoryInput,
  ): Promise<EventCategory> {
    validateInput<UpdateEventCategoryInput>(UpdateEventCategorySchema, input);
    return EventCategoryDAO.updateEventCategory(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategory, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.deleteEventCategoryById })
  async deleteEventCategoryById(@Arg('eventCategoryId', () => String) eventCategoryId: string): Promise<EventCategory> {
    validateMongodbId(eventCategoryId);
    return EventCategoryDAO.deleteEventCategoryById(eventCategoryId);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategory, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.deleteEventCategoryBySlug })
  async deleteEventCategoryBySlug(@Arg('slug', () => String) slug: string): Promise<EventCategory> {
    return EventCategoryDAO.deleteEventCategoryBySlug(slug);
  }

  @Query(() => EventCategory, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.readEventCategoryById })
  async readEventCategoryById(
    @Arg('eventCategoryId', () => String) eventCategoryId: string,
  ): Promise<EventCategory | null> {
    validateMongodbId(eventCategoryId);
    return EventCategoryDAO.readEventCategoryById(eventCategoryId);
  }

  @Query(() => EventCategory, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.readEventCategoryBySlug })
  async readEventCategoryBySlug(@Arg('slug', () => String) slug: string): Promise<EventCategory | null> {
    return EventCategoryDAO.readEventCategoryBySlug(slug);
  }

  @Query(() => [EventCategory], { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY.readEventCategories })
  async readEventCategories(
    @Arg('options', () => QueryOptionsInput, { nullable: true }) options?: QueryOptionsInput,
  ): Promise<EventCategory[]> {
    return EventCategoryDAO.readEventCategories(options);
  }
}
