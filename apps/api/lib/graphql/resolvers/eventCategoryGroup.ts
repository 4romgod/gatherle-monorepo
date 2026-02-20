import 'reflect-metadata';
import { Arg, Mutation, Resolver, Authorized, Query, FieldResolver, Root, Ctx } from 'type-graphql';
import {
  CreateEventCategoryGroupInput,
  EventCategoryGroup,
  QueryOptionsInput,
  UpdateEventCategoryGroupInput,
  UserRole,
  EventCategory,
} from '@gatherle/commons/types';
import { EventCategoryGroupDAO } from '@/mongodb/dao';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import type { ServerContext } from '@/graphql';

@Resolver(() => EventCategoryGroup)
export class EventCategoryGroupResolver {
  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategoryGroup, {
    description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.createEventCategoryGroup,
  })
  async createEventCategoryGroup(
    @Arg('input', () => CreateEventCategoryGroupInput) input: CreateEventCategoryGroupInput,
  ): Promise<EventCategoryGroup> {
    return EventCategoryGroupDAO.create(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategoryGroup, {
    description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.updateEventCategoryGroup,
  })
  async updateEventCategoryGroup(
    @Arg('input', () => UpdateEventCategoryGroupInput) input: UpdateEventCategoryGroupInput,
  ): Promise<EventCategoryGroup> {
    return EventCategoryGroupDAO.updateEventCategoryGroup(input);
  }

  @Authorized([UserRole.Admin])
  @Mutation(() => EventCategoryGroup, {
    description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.deleteEventCategoryGroupBySlug,
  })
  async deleteEventCategoryGroupBySlug(@Arg('slug', () => String) slug: string): Promise<EventCategoryGroup> {
    return EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(slug);
  }

  @Query(() => EventCategoryGroup, {
    description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.readEventCategoryGroupBySlug,
  })
  async readEventCategoryGroupBySlug(@Arg('slug', () => String) slug: string): Promise<EventCategoryGroup | null> {
    return EventCategoryGroupDAO.readEventCategoryGroupBySlug(slug);
  }

  @Query(() => [EventCategoryGroup], {
    description: RESOLVER_DESCRIPTIONS.EVENT_CATEGORY_GROUP.readEventCategoryGroups,
  })
  async readEventCategoryGroups(
    @Arg('options', () => QueryOptionsInput, { nullable: true }) options?: QueryOptionsInput,
  ): Promise<EventCategoryGroup[]> {
    return EventCategoryGroupDAO.readEventCategoryGroups(options);
  }

  @FieldResolver(() => [EventCategory], { nullable: true })
  async eventCategories(@Root() group: EventCategoryGroup, @Ctx() context: ServerContext): Promise<EventCategory[]> {
    if (!group.eventCategories || group.eventCategories.length === 0) {
      return [];
    }

    // Check if already populated
    const first = group.eventCategories[0];
    if (typeof first === 'object' && first !== null && 'eventCategoryId' in first) {
      return group.eventCategories as EventCategory[];
    }

    // Batch-load via DataLoader
    const categoryIds = group.eventCategories.map((ref) =>
      typeof ref === 'string' ? ref : (ref as any)._id?.toString() || ref.toString(),
    );
    const categories = await Promise.all(categoryIds.map((id) => context.loaders.eventCategory.load(id)));
    return categories.filter((c): c is EventCategory => c !== null);
  }
}
