import 'reflect-metadata';
import {Arg, Ctx, ID, Mutation, Query, Resolver} from 'type-graphql';
import {CreateFollowInput, Follow, FollowTargetType} from '@ntlango/commons/types';
import {CreateFollowInputSchema} from '@/validation/zod';
import {validateInput} from '@/validation';
import {FollowDAO} from '@/mongodb/dao';
import {ServerContext} from '@/graphql';
import {requireAuthenticatedUser} from './utils/requireAuthenticatedUser';
import {RESOLVER_DESCRIPTIONS} from '@/constants';

@Resolver(() => Follow)
export class FollowResolver {
  @Mutation(() => Follow, {description: RESOLVER_DESCRIPTIONS.FOLLOW.follow})
  async follow(@Arg('input', () => CreateFollowInput) input: CreateFollowInput, @Ctx() context: ServerContext): Promise<Follow> {
    validateInput(CreateFollowInputSchema, input);
    const user = await requireAuthenticatedUser(context);
    return FollowDAO.upsert({...input, followerUserId: user.userId});
  }

  @Mutation(() => Boolean, {description: RESOLVER_DESCRIPTIONS.FOLLOW.unfollow})
  async unfollow(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Arg('targetId', () => ID) targetId: string,
    @Ctx() context: ServerContext,
  ): Promise<boolean> {
    const user = await requireAuthenticatedUser(context);
    return FollowDAO.remove({followerUserId: user.userId, targetType, targetId});
  }

  @Query(() => [Follow], {description: RESOLVER_DESCRIPTIONS.FOLLOW.readFollowing})
  async readFollowing(@Ctx() context: ServerContext): Promise<Follow[]> {
    const user = await requireAuthenticatedUser(context);
    return FollowDAO.readFollowingForUser(user.userId);
  }

  @Query(() => [Follow], {description: RESOLVER_DESCRIPTIONS.FOLLOW.readFollowers})
  async readFollowers(
    @Arg('targetType', () => FollowTargetType) targetType: FollowTargetType,
    @Arg('targetId', () => ID) targetId: string,
  ): Promise<Follow[]> {
    return FollowDAO.readFollowers(targetType, targetId);
  }
}
