import 'reflect-metadata';
import { Arg, Authorized, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Event, FeedReason, UserFeedItem, UserRole } from '@gatherle/commons/types';
import { UserFeedDAO } from '@/mongodb/dao';
import type { ServerContext } from '@/graphql';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { getAuthenticatedUser } from '@/utils';
import { logger } from '@/utils/logger';
import RecommendationService from '@/services/recommendation';

const MAX_FEED_LIMIT = 50;

@Resolver(() => UserFeedItem)
export class FeedResolver {
  @FieldResolver(() => Event, { nullable: true })
  async event(@Root() feedItem: UserFeedItem, @Ctx() context: ServerContext): Promise<Event | null> {
    try {
      return await context.loaders.event.load(feedItem.eventId);
    } catch {
      return null;
    }
  }

  @FieldResolver(() => [FeedReason])
  reasons(@Root() feedItem: UserFeedItem): FeedReason[] {
    return (feedItem.reasons as unknown as FeedReason[]) ?? [];
  }

  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Query(() => [UserFeedItem], { description: RESOLVER_DESCRIPTIONS.FEED.readRecommendedFeed })
  async readRecommendedFeed(
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('skip', () => Int, { nullable: true, defaultValue: 0 }) skip: number,
    @Ctx() context: ServerContext,
  ): Promise<UserFeedItem[]> {
    const user = getAuthenticatedUser(context);

    const safeLimit = Math.min(Math.max(limit, 0), MAX_FEED_LIMIT);
    const safeSkip = Math.max(skip, 0);

    const existing = await UserFeedDAO.readFeedForUser(user.userId, safeLimit, safeSkip);

    if (existing.length === 0) {
      await RecommendationService.computeFeedForUser(user.userId);
      return UserFeedDAO.readFeedForUser(user.userId, safeLimit, safeSkip);
    }

    if (RecommendationService.isFeedStale(existing)) {
      RecommendationService.computeFeedForUser(user.userId).catch((err) => {
        logger.warn('[FeedResolver] Background feed refresh failed', { error: err });
      });
    }

    return existing;
  }

  /**
   * Explicitly trigger a full recomputation of the authenticated user's feed.
   * Useful for a "Refresh" button in the UI.
   */
  @Authorized([UserRole.Admin, UserRole.Host, UserRole.User])
  @Mutation(() => Boolean, { description: RESOLVER_DESCRIPTIONS.FEED.refreshFeed })
  async refreshFeed(@Ctx() context: ServerContext): Promise<boolean> {
    const user = getAuthenticatedUser(context);
    await RecommendationService.computeFeedForUser(user.userId);
    return true;
  }
}
