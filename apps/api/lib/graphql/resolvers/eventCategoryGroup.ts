import 'reflect-metadata';
import { Arg, Mutation, Resolver, Authorized, Query } from 'type-graphql';
import {
  CreateEventCategoryGroupInput,
  EventCategoryGroup,
  QueryOptionsInput,
  UpdateEventCategoryGroupInput,
  UserRole,
} from '@ntlango/commons/types';
import { EventCategoryGroupDAO } from '@/mongodb/dao';
import { RESOLVER_DESCRIPTIONS } from '@/constants';

@Resolver()
export class EventCategoryGroupResolver {
  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategoryGroup, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.createEventCategoryGroup })
  async createEventCategoryGroup(@Arg('input', () => CreateEventCategoryGroupInput) input: CreateEventCategoryGroupInput): Promise<EventCategoryGroup> {
    return EventCategoryGroupDAO.create(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategoryGroup, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.updateEventCategoryGroup })
  async updateEventCategoryGroup(@Arg('input', () => UpdateEventCategoryGroupInput) input: UpdateEventCategoryGroupInput): Promise<EventCategoryGroup> {
    return EventCategoryGroupDAO.updateEventCategoryGroup(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategoryGroup, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.deleteEventCategoryGroupBySlug })
  async deleteEventCategoryGroupBySlug(@Arg('slug', () => String) slug: string): Promise<EventCategoryGroup> {
    return EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(slug);
  }

  @Query(() => EventCategoryGroup, { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.readEventCategoryGroupBySlug })
  async readEventCategoryGroupBySlug(@Arg('slug', () => String) slug: string): Promise<EventCategoryGroup | null> {
    return EventCategoryGroupDAO.readEventCategoryGroupBySlug(slug);
  }

  @Query(() => [EventCategoryGroup], { description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.readEventCategoryGroups })
  async readEventCategoryGroups(@Arg('options', () => QueryOptionsInput, { nullable: true }) options?: QueryOptionsInput): Promise<EventCategoryGroup[]> {
    return EventCategoryGroupDAO.readEventCategoryGroups(options);
  }
}
