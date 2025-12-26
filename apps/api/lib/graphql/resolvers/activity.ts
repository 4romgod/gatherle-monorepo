import 'reflect-metadata';
import {Arg, Ctx, Int, Mutation, Query, Resolver} from 'type-graphql';
import {CreateActivityInput, FollowTargetType, Activity} from '@ntlango/commons/types';
import {CreateActivityInputSchema} from '@/validation/zod';
import {validateInput} from '@/validation';
import {ActivityDAO, FollowDAO} from '@/mongodb/dao';
import {ServerContext} from '@/graphql';
import {requireAuthenticatedUser} from './utils/requireAuthenticatedUser';
import {RESOLVER_DESCRIPTIONS} from '@/constants';

@Resolver(() => Activity)
export class ActivityResolver {
  @Mutation(() => Activity, {description: RESOLVER_DESCRIPTIONS.ACTIVITY.logActivity})
  async logActivity(@Arg('input', () => CreateActivityInput) input: CreateActivityInput, @Ctx() context: ServerContext): Promise<Activity> {
    validateInput(CreateActivityInputSchema, input);
    const user = await requireAuthenticatedUser(context);
    return ActivityDAO.create({...input, actorId: user.userId});
  }

  @Query(() => [Activity], {description: RESOLVER_DESCRIPTIONS.ACTIVITY.readActivitiesByActor})
  async readActivitiesByActor(
    @Arg('actorId', () => String) actorId: string,
    @Ctx() context: ServerContext,
    @Arg('limit', () => Int, {nullable: true}) limit?: number,
  ): Promise<Activity[]> {
    const viewer = await requireAuthenticatedUser(context);
    const activities = await ActivityDAO.readByActor(actorId, limit ?? 25);

    // If the requesting user is the actor, they can see all of their own activities.
    if (viewer.userId === actorId) {
      return activities;
    }

    const follows = await FollowDAO.readFollowingForUser(viewer.userId);
    const isFollower = follows.some(
      (follow) =>
        follow.targetType === FollowTargetType.User &&
        follow.targetId === actorId,
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

  @Query(() => [Activity], {description: RESOLVER_DESCRIPTIONS.ACTIVITY.readFeed})
  async readFeed(@Ctx() context: ServerContext, @Arg('limit', () => Int, {nullable: true}) limit?: number): Promise<Activity[]> {
    const user = await requireAuthenticatedUser(context);
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
