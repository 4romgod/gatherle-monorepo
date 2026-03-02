import { FeedReason, FollowApprovalStatus, FollowTargetType } from '@gatherle/commons/types';
import { EventDAO, EventParticipantDAO, FollowDAO, UserDAO, UserFeedDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

const SCORE_WEIGHTS = {
  CATEGORY_MATCH: 30,
  FRIEND_ATTENDING_PER: 25,
  FRIEND_ATTENDING_MAX: 50,
  FOLLOWED_ORG: 20,
  NETWORK_SAVED_PER: 10,
  NETWORK_SAVED_MAX: 20,
  TIME_URGENCY_7D: 15,
  TIME_URGENCY_14D: 10,
  TIME_URGENCY_30D: 5,
  POPULARITY_HIGH: 10,
  POPULARITY_LOW: 5,
  FRESHNESS: 5,
} as const;

const FEED_TTL_DAYS = 7;
const FEED_STALE_AFTER_HOURS = 24;
const MAX_CANDIDATE_EVENTS = 500;

function daysBetween(earlier: Date, later: Date): number {
  return (later.getTime() - earlier.getTime()) / (1_000 * 60 * 60 * 24);
}

function hoursSince(past: Date): number {
  return (Date.now() - past.getTime()) / (1_000 * 60 * 60);
}

class RecommendationService {
  async computeFeedForUser(userId: string): Promise<void> {
    try {
      logger.debug('[RecommendationService] Computing feed', { userId });

      const user = await UserDAO.readUserById(userId);
      // user.interests stores Ref<EventCategory>[] which at runtime are string IDs
      const userInterests = new Set<string>((user.interests as unknown as string[]) ?? []);
      const mutedOrgIds = new Set(user.mutedOrgIds ?? []);
      const mutedUserIds = new Set(user.mutedUserIds ?? []);

      const activeParticipations = await EventParticipantDAO.readByUser(userId);
      const rsvpdEventIds = new Set(activeParticipations.map((p) => p.eventId));

      const following = await FollowDAO.readFollowingForUser(userId);

      const followedUserIds = following
        .filter(
          (f) =>
            f.targetType === FollowTargetType.User &&
            f.approvalStatus === FollowApprovalStatus.Accepted &&
            !mutedUserIds.has(f.targetId),
        )
        .map((f) => f.targetId);

      const followedOrgIds = new Set(
        following
          .filter(
            (f) => f.targetType === FollowTargetType.Organization && f.approvalStatus === FollowApprovalStatus.Accepted,
          )
          .map((f) => f.targetId),
      );

      const savedEventIds = new Set(
        following
          .filter((f) => f.targetType === FollowTargetType.Event && f.approvalStatus === FollowApprovalStatus.Accepted)
          .map((f) => f.targetId),
      );

      const candidateEvents = await EventDAO.readUpcomingPublished(MAX_CANDIDATE_EVENTS);

      const friendRsvpCountByEventId = new Map<string, number>();
      const friendSaveCountByEventId = new Map<string, number>();

      if (followedUserIds.length > 0) {
        const [friendParticipations, friendSaves] = await Promise.all([
          EventParticipantDAO.readByUserIds(followedUserIds),
          FollowDAO.readSavedEventsByUserIds(followedUserIds),
        ]);

        for (const participation of friendParticipations) {
          friendRsvpCountByEventId.set(
            participation.eventId,
            (friendRsvpCountByEventId.get(participation.eventId) ?? 0) + 1,
          );
        }

        for (const save of friendSaves) {
          friendSaveCountByEventId.set(save.targetId, (friendSaveCountByEventId.get(save.targetId) ?? 0) + 1);
        }
      }

      const now = new Date();
      const scoredItems: Array<{ eventId: string; score: number; reasons: FeedReason[] }> = [];

      for (const event of candidateEvents) {
        if (rsvpdEventIds.has(event.eventId)) continue;
        if (event.orgId && mutedOrgIds.has(event.orgId)) continue;
        if (savedEventIds.has(event.eventId)) continue;

        let score = 0;
        const reasons: FeedReason[] = [];

        // eventCategories are stored as string refs (category IDs) at runtime
        const eventCategoryIds: string[] = (event.eventCategories as unknown as string[]) ?? [];
        if (eventCategoryIds.some((id) => userInterests.has(id))) {
          score += SCORE_WEIGHTS.CATEGORY_MATCH;
          reasons.push(FeedReason.CategoryMatch);
        }

        const friendCount = friendRsvpCountByEventId.get(event.eventId) ?? 0;
        if (friendCount > 0) {
          score += Math.min(friendCount * SCORE_WEIGHTS.FRIEND_ATTENDING_PER, SCORE_WEIGHTS.FRIEND_ATTENDING_MAX);
          reasons.push(FeedReason.FriendAttending);
        }

        if (event.orgId && followedOrgIds.has(event.orgId)) {
          score += SCORE_WEIGHTS.FOLLOWED_ORG;
          reasons.push(FeedReason.FollowedOrgHosting);
        }

        const savedCount = friendSaveCountByEventId.get(event.eventId) ?? 0;
        if (savedCount > 0) {
          score += Math.min(savedCount * SCORE_WEIGHTS.NETWORK_SAVED_PER, SCORE_WEIGHTS.NETWORK_SAVED_MAX);
          reasons.push(FeedReason.NetworkSaved);
        }

        const startAt = event.primarySchedule?.startAt;
        if (startAt) {
          const daysUntil = daysBetween(now, new Date(startAt));
          if (daysUntil >= 0 && daysUntil <= 7) {
            score += SCORE_WEIGHTS.TIME_URGENCY_7D;
            reasons.push(FeedReason.TimeUrgency);
          } else if (daysUntil <= 14) {
            score += SCORE_WEIGHTS.TIME_URGENCY_14D;
            reasons.push(FeedReason.TimeUrgency);
          } else if (daysUntil <= 30) {
            score += SCORE_WEIGHTS.TIME_URGENCY_30D;
            reasons.push(FeedReason.TimeUrgency);
          }
        }

        const popularity = (event.rsvpCount ?? 0) + (event.savedByCount ?? 0);
        if (popularity >= 20) {
          score += SCORE_WEIGHTS.POPULARITY_HIGH;
          reasons.push(FeedReason.Popularity);
        } else if (popularity >= 5) {
          score += SCORE_WEIGHTS.POPULARITY_LOW;
          reasons.push(FeedReason.Popularity);
        }

        const createdAt = (event as unknown as { createdAt?: Date }).createdAt;
        if (createdAt && daysBetween(new Date(createdAt), now) <= 7) {
          score += SCORE_WEIGHTS.FRESHNESS;
          reasons.push(FeedReason.Freshness);
        }

        scoredItems.push({ eventId: event.eventId, score, reasons });
      }

      await UserFeedDAO.clearFeedForUser(userId);

      const itemsToStore = scoredItems.filter((item) => item.score > 0);

      if (itemsToStore.length > 0) {
        const expiresAt = new Date(now.getTime() + FEED_TTL_DAYS * 24 * 60 * 60 * 1_000);
        await UserFeedDAO.bulkUpsertFeedItems(
          itemsToStore.map((item) => ({
            ...item,
            userId,
            computedAt: now,
            expiresAt,
          })),
        );
      }

      logger.debug('[RecommendationService] Feed computed', {
        userId,
        candidateCount: candidateEvents.length,
        scoredCount: scoredItems.length,
        surfacedCount: itemsToStore.length,
      });
    } catch (error) {
      logger.error('[RecommendationService] Failed to compute feed', { userId, error });
    }
  }

  isFeedStale(items: { computedAt: Date }[]): boolean {
    if (items.length === 0) return true;
    const oldestComputedAt = items.reduce(
      (oldest, item) => (item.computedAt < oldest ? item.computedAt : oldest),
      items[0].computedAt,
    );
    return hoursSince(new Date(oldestComputedAt)) >= FEED_STALE_AFTER_HOURS;
  }

  async onRsvpUpdated(userId: string): Promise<void> {
    void this.computeFeedForUser(userId);
  }

  async onUserFollowed(followerUserId: string): Promise<void> {
    void this.computeFeedForUser(followerUserId);
  }

  /**
   * Called when an event transitions to Published lifecycle status.
   *
   * We intentionally do NOT eagerly recompute feeds here. A single publish
   * could affect thousands of user feeds (everyone whose interests, followed
   * orgs, or social graph overlaps the event), making a synchronous fan-out
   * prohibitively expensive at scale.
   *
   * Instead we rely on the lazy-staleness strategy in `readRecommendedFeed`:
   * the next time a user reads their feed, `isFeedStale()` detects that it is
   * >24 h old and triggers a background recompute, which will naturally include
   * the newly published event via `EventDAO.readUpcomingPublished()`.
   *
   * If sub-24 h propagation becomes a product requirement, consider one of:
   *   1. Shortening `FEED_STALE_AFTER_HOURS` (simplest, no new infrastructure).
   *   2. Targeted invalidation — `UserFeedDAO.clearFeedForUser()` for users
   *      who follow the hosting org or match the event's categories, so their
   *      next read triggers an immediate recompute.
   *   3. Async fan-out via a job queue (SQS / BullMQ) for full recomputation
   *      of affected users in the background.
   */
  async onEventPublished(eventId: string): Promise<void> {
    logger.debug('[RecommendationService] Event published — feeds will refresh lazily', { eventId });
  }
}

export default new RecommendationService();
