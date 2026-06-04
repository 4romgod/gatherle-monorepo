import {
  FeedReason,
  FollowApprovalStatus,
  FollowTargetType,
  type EventOccurrence,
  type User,
} from '@gatherle/commons/server/types';
import { GraphQLError } from 'graphql';
import {
  EventOccurrenceDAO,
  EventOccurrenceParticipantDAO,
  EventSeriesDAO,
  FollowDAO,
  UserDAO,
  UserFeedDAO,
} from '@/mongodb/dao';
import { CustomError, ErrorTypes } from '@/utils';
import { logger } from '@/utils/logger';
import EventOccurrenceService from './eventOccurrence';
import { getScheduleAnchorStartAt } from '@/utils/eventSchedule';
import { ERROR_MESSAGES } from '@/validation';

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
const COLD_START_FALLBACK_LIMIT = 20;

const isNotFoundError = (error: unknown): boolean =>
  error instanceof GraphQLError && error.extensions?.code === ErrorTypes.NOT_FOUND.errorCode;

function daysBetween(earlier: Date, later: Date): number {
  return (later.getTime() - earlier.getTime()) / (1_000 * 60 * 60 * 24);
}

function hoursSince(past: Date): number {
  return (Date.now() - past.getTime()) / (1_000 * 60 * 60);
}

class RecommendationService {
  async assertFeedUserExists(userId: string): Promise<User> {
    try {
      return await UserDAO.readUserById(userId);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
      }

      throw error;
    }
  }

  async computeFeedForUser(userId: string, preloadedUser?: User): Promise<void> {
    try {
      logger.debug('[RecommendationService] Computing feed', { userId });

      // Parallelise all four independent queries to reduce round-trip latency.
      const [user, activeOccurrenceParticipations, following, candidateEvents] = await Promise.all([
        preloadedUser ? Promise.resolve(preloadedUser) : UserDAO.readUserById(userId),
        EventOccurrenceParticipantDAO.readByUser(userId),
        FollowDAO.readFollowingForUser(userId),
        EventSeriesDAO.readUpcomingPublished(MAX_CANDIDATE_EVENTS),
      ]);

      const activeOccurrences = await EventOccurrenceDAO.readByOccurrenceIds(
        activeOccurrenceParticipations.map((participation) => participation.occurrenceId),
      );
      const activeOccurrenceEventSeriesById = new Map(
        activeOccurrences.map((occurrence) => [occurrence.occurrenceId, occurrence.eventSeriesId]),
      );

      // user.interests stores Ref<EventCategory>[] which at runtime are string IDs
      const userInterests = new Set<string>((user.interests as unknown as string[]) ?? []);
      const mutedOrgIds = new Set(user.mutedOrgIds ?? []);
      const mutedUserIds = new Set(user.mutedUserIds ?? []);
      const rsvpdEventIds = new Set(
        activeOccurrenceParticipations
          .map((participation) => activeOccurrenceEventSeriesById.get(participation.occurrenceId))
          .filter((eventSeriesId): eventSeriesId is string => Boolean(eventSeriesId)),
      );

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
          .filter(
            (f) => f.targetType === FollowTargetType.EventSeries && f.approvalStatus === FollowApprovalStatus.Accepted,
          )
          .map((f) => f.targetId),
      );

      const friendRsvpCountByEventId = new Map<string, number>();
      const friendSaveCountByEventId = new Map<string, number>();

      if (followedUserIds.length > 0) {
        const [friendOccurrenceParticipations, friendSaves] = await Promise.all([
          EventOccurrenceParticipantDAO.readByUserIds(followedUserIds),
          FollowDAO.readSavedEventsByUserIds(followedUserIds),
        ]);

        const friendOccurrences = await EventOccurrenceDAO.readByOccurrenceIds(
          friendOccurrenceParticipations.map((participation) => participation.occurrenceId),
        );
        const occurrenceEventSeriesById = new Map(
          friendOccurrences.map((occurrence) => [occurrence.occurrenceId, occurrence.eventSeriesId]),
        );
        const seenFriendSeriesPairs = new Set<string>();

        for (const participation of friendOccurrenceParticipations) {
          const eventSeriesId = occurrenceEventSeriesById.get(participation.occurrenceId);
          if (!eventSeriesId) {
            continue;
          }

          const pairKey = `${participation.userId}#${eventSeriesId}`;
          if (seenFriendSeriesPairs.has(pairKey)) {
            continue;
          }

          seenFriendSeriesPairs.add(pairKey);
          friendRsvpCountByEventId.set(eventSeriesId, (friendRsvpCountByEventId.get(eventSeriesId) ?? 0) + 1);
        }

        for (const save of friendSaves) {
          friendSaveCountByEventId.set(save.targetId, (friendSaveCountByEventId.get(save.targetId) ?? 0) + 1);
        }
      }

      const now = new Date();
      const representativeOccurrencesByEventId: Map<string, EventOccurrence | null> =
        candidateEvents.length > 0
          ? await EventOccurrenceService.readRepresentativeOccurrencesForSeriesIds(
              candidateEvents.map((event) => event.eventId),
              now,
            )
          : new Map<string, EventOccurrence | null>();
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

        const startAt =
          representativeOccurrencesByEventId.get(event.eventId)?.startAt ??
          (event.primarySchedule ? getScheduleAnchorStartAt(event.primarySchedule) : undefined);
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
      const expiresAt = new Date(now.getTime() + FEED_TTL_DAYS * 24 * 60 * 60 * 1_000);
      let fallbackCount = 0;

      if (itemsToStore.length > 0) {
        await UserFeedDAO.bulkUpsertFeedItems(
          itemsToStore.map((item) => ({
            ...item,
            userId,
            computedAt: now,
            expiresAt,
          })),
        );
      } else {
        // Cold-start: no personalisation signals fired (new user or no activity yet).
        // Fall back to the most popular already-fetched candidate events so the feed is
        // never empty without triggering an additional heavy trending query.
        const fallbackItems = [...candidateEvents]
          .filter(
            (event) =>
              !rsvpdEventIds.has(event.eventId) &&
              !savedEventIds.has(event.eventId) &&
              (!event.orgId || !mutedOrgIds.has(event.orgId)),
          )
          .sort((left, right) => {
            const leftPopularity = (left.rsvpCount ?? 0) + (left.savedByCount ?? 0);
            const rightPopularity = (right.rsvpCount ?? 0) + (right.savedByCount ?? 0);
            return rightPopularity - leftPopularity;
          })
          .slice(0, COLD_START_FALLBACK_LIMIT)
          .map((event) => {
            const popularity = (event.rsvpCount ?? 0) + (event.savedByCount ?? 0);
            const score =
              popularity >= 20 ? SCORE_WEIGHTS.POPULARITY_HIGH : popularity >= 5 ? SCORE_WEIGHTS.POPULARITY_LOW : 1;
            return {
              userId,
              eventId: event.eventId,
              score,
              reasons: [FeedReason.Popularity] as FeedReason[],
              computedAt: now,
              expiresAt,
            };
          });

        if (fallbackItems.length > 0) {
          await UserFeedDAO.bulkUpsertFeedItems(fallbackItems);
        }
        fallbackCount = fallbackItems.length;
      }

      logger.debug('[RecommendationService] Feed computed', {
        userId,
        candidateCount: candidateEvents.length,
        scoredCount: scoredItems.length,
        surfacedCount: itemsToStore.length,
        fallbackCount,
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        logger.warn('[RecommendationService] Skipping feed compute because user no longer exists', { userId });
        return;
      }

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
   * the newly published event via `EventSeriesDAO.readUpcomingPublished()`.
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
    logger.debug('[RecommendationService] EventSeries published — feeds will refresh lazily', { eventId });
  }
}

export default new RecommendationService();
