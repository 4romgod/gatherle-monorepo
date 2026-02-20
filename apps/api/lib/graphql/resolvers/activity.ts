import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root } from 'type-graphql';
import {
  CreateActivityInput,
  FollowTargetType,
  Activity,
  UserRole,
  User,
  Event,
  Organization,
  ActivityObjectType,
} from '@gatherle/commons/types';
import { CreateActivityInputSchema } from '@/validation/zod';
import { validateInput } from '@/validation';
import { ActivityDAO, FollowDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { getAuthenticatedUser } from '@/utils';

@Resolver(() => Activity)
export class ActivityResolver {
  @FieldResolver(() => User, { nullable: true, description: 'The user who performed the action' })
  async actor(@Root() activity: Activity, @Ctx() context: ServerContext): Promise<User | null> {
    if (!activity.actorId) return null;
    try {
      return await context.loaders.user.load(activity.actorId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => User, { nullable: true, description: 'The target user if objectType is User' })
  async objectUser(@Root() activity: Activity, @Ctx() context: ServerContext): Promise<User | null> {
    if (activity.objectType !== ActivityObjectType.User) return null;
    try {
      return await context.loaders.user.load(activity.objectId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => Event, { nullable: true, description: 'The target event if objectType is Event' })
  async objectEvent(@Root() activity: Activity, @Ctx() context: ServerContext): Promise<Event | null> {
    if (activity.objectType !== ActivityObjectType.Event) return null;
    try {
      return await context.loaders.event.load(activity.objectId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => Organization, {
    nullable: true,
    description: 'The target organization if objectType is Organization',
  })
  async objectOrganization(@Root() activity: Activity, @Ctx() context: ServerContext): Promise<Organization | null> {
    if (activity.objectType !== ActivityObjectType.Organization) return null;
    try {
      return await context.loaders.organization.load(activity.objectId);
    } catch {
      return null;
    }
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Activity, { description: RESOLVER_DESCRIPTIONS.ACTIVITY.logActivity })
  async logActivity(
    @Arg('input', () => CreateActivityInput) input: CreateActivityInput,
    @Ctx() context: ServerContext,
  ): Promise<Activity> {
    validateInput(CreateActivityInputSchema, input);
    const user = getAuthenticatedUser(context);
    return ActivityDAO.create({ ...input, actorId: user.userId });
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Activity], { description: RESOLVER_DESCRIPTIONS.ACTIVITY.readActivitiesByActor })
  async readActivitiesByActor(
    @Arg('actorId', () => String) actorId: string,
    @Ctx() context: ServerContext,
    @Arg('limit', () => Int, { nullable: true }) limit?: number,
  ): Promise<Activity[]> {
    const viewer = getAuthenticatedUser(context);
    const activities = await ActivityDAO.readByActor(actorId, limit ?? 25);

    // If the requesting user is the actor, they can see all of their own activities.
    if (viewer.userId === actorId) {
      return activities;
    }

    const follows = await FollowDAO.readFollowingForUser(viewer.userId);
    const isFollower = follows.some(
      (follow) => follow.targetType === FollowTargetType.User && follow.targetId === actorId,
    );

    return activities.filter((activity: any) => {
      const visibility = activity.visibility || 'PUBLIC';

      if (visibility === 'PRIVATE') {
        return false;
      }

      if (visibility === 'FOLLOWERS') {
        return isFollower;
      }

      // Default: treat as public.
      return true;
    });
  }

  // TODO
  /** The readFeed query performs two sequential database queries (follows then activities) which could impact performance.
   * Consider optimizing this with a single aggregation pipeline that joins follows and activities,
   * or implement caching for frequently accessed feeds. Additionally, if a user follows many people,
   * the $in query could become slow - consider adding pagination at the follow level or implementing
   * a more sophisticated feed generation strategy.
   */
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [Activity], { description: RESOLVER_DESCRIPTIONS.ACTIVITY.readFeed })
  async readFeed(
    @Ctx() context: ServerContext,
    @Arg('limit', () => Int, { nullable: true }) limit?: number,
  ): Promise<Activity[]> {
    const user = getAuthenticatedUser(context);
    const follows = await FollowDAO.readFollowingForUser(user.userId);
    const actorIds = Array.from(
      new Set(
        follows
          .filter((follow) => follow.targetType === FollowTargetType.User)
          .map((follow) => follow.targetId)
          .concat(user.userId),
      ),
    );
    return ActivityDAO.readByActorIds(actorIds, limit ?? 25);
  }
}
