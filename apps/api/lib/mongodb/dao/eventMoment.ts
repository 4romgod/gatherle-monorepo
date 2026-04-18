import type { EventMoment as EventMomentEntity, CreateEventMomentInput } from '@gatherle/commons/types';
import { EventMomentState, EventMomentType } from '@gatherle/commons/types';
import { EventMoment } from '@/mongodb/models';
import { KnownCommonError, logDaoError } from '@/utils';
import { randomUUID } from 'crypto';

const EXPIRY_HOURS = 24;
const MAX_STATUSES_PER_ROLLING_WINDOW = 5;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

class EventMomentDAO {
  /**
   * Create a new event moment. The momentId and expiresAt are generated here.
   * For image/video, mediaUrl should be provided directly (CloudFront URL or HTTP Live Streaming URL).
   * Video moments start in Processing state when mediaUrl is absent.
   */
  static async create(
    input: CreateEventMomentInput,
    authorId: string,
    mediaUrl?: string,
    thumbnailUrl?: string,
  ): Promise<EventMomentEntity> {
    try {
      const momentId = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

      // Video moments start Processing until MediaConvert writes back the HLS URL.
      const state =
        input.type === EventMomentType.Video && !mediaUrl ? EventMomentState.Processing : EventMomentState.Ready;

      const doc = await EventMoment.create({
        momentId,
        eventId: input.eventId,
        authorId,
        type: input.type,
        caption: input.caption,
        mediaUrl,
        thumbnailUrl,
        background: input.background,
        state,
        expiresAt,
      });

      return doc.toObject();
    } catch (error) {
      logDaoError('Error creating event moment', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Count how many statuses the user has posted for this event in the last 24 hours.
   * Used for rate-limit enforcement.
   */
  static async countRecentByAuthor(eventId: string, authorId: string): Promise<number> {
    try {
      const since = new Date(Date.now() - ROLLING_WINDOW_MS);
      return await EventMoment.countDocuments({
        eventId,
        authorId,
        createdAt: { $gt: since },
      }).exec();
    } catch (error) {
      logDaoError('Error counting recent moments by author', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Read all non-expired, Ready statuses for an event (event page ring).
   * No follow filtering — all attendees' statuses are shown on the event page.
   */
  static async readByEvent(
    eventId: string,
    cursor?: string,
    limit = 30,
  ): Promise<{ items: EventMomentEntity[]; nextCursor?: string; hasMore: boolean }> {
    try {
      const now = new Date();
      const query: Record<string, unknown> = {
        eventId,
        state: EventMomentState.Ready,
        expiresAt: { $gt: now },
      };

      if (cursor) {
        query['createdAt'] = { $lt: new Date(cursor) };
      }

      const items = await EventMoment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .exec();

      const hasMore = items.length > limit;
      const page = items.slice(0, limit).map((s) => s.toObject());
      const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : undefined;

      return { items: page, nextCursor, hasMore };
    } catch (error) {
      logDaoError('Error reading moments by event', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Read a single user's statuses for a specific event (profile/search view).
   * Includes Processing statuses when the caller is the author.
   */
  static async readByAuthorAndEvent(
    authorId: string,
    eventId: string,
    includeProcessing: boolean,
  ): Promise<EventMomentEntity[]> {
    try {
      const now = new Date();
      const stateFilter = includeProcessing
        ? { $in: [EventMomentState.Ready, EventMomentState.Processing] }
        : EventMomentState.Ready;

      const items = await EventMoment.find({
        authorId,
        eventId,
        state: stateFilter,
        expiresAt: { $gt: now },
      })
        .sort({ createdAt: -1 })
        .exec();

      return items.map((s) => s.toObject());
    } catch (error) {
      logDaoError('Error reading moments by author and event', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Read statuses across all events from a set of followed author IDs (personal feed).
   */
  static async readFollowedStatuses(
    followerAuthorIds: string[],
    cursor?: string,
    limit = 30,
  ): Promise<{ items: EventMomentEntity[]; nextCursor?: string; hasMore: boolean }> {
    try {
      const now = new Date();
      const query: Record<string, unknown> = {
        authorId: { $in: followerAuthorIds },
        state: EventMomentState.Ready,
        expiresAt: { $gt: now },
      };

      if (cursor) {
        query['createdAt'] = { $lt: new Date(cursor) };
      }

      const items = await EventMoment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .exec();

      const hasMore = items.length > limit;
      const page = items.slice(0, limit).map((s) => s.toObject());
      const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : undefined;

      return { items: page, nextCursor, hasMore };
    } catch (error) {
      logDaoError('Error reading followed moments', { error });
      throw KnownCommonError(error);
    }
  }

  /** Find a single status by ID. */
  static async readById(momentId: string): Promise<EventMomentEntity | null> {
    try {
      const doc = await EventMoment.findOne({ momentId }).exec();
      return doc ? doc.toObject() : null;
    } catch (error) {
      logDaoError('Error reading moment by id', { error });
      throw KnownCommonError(error);
    }
  }

  /** Hard-delete a status. Authorization must be checked in the resolver. */
  static async delete(momentId: string): Promise<boolean> {
    try {
      const result = await EventMoment.deleteOne({ momentId }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      logDaoError('Error deleting event moment', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Update mediaUrl + thumbnailUrl + durationSeconds after MediaConvert completes.
   * Called by the MediaConvert completion Lambda.
   */
  static async markReady(
    momentId: string,
    mediaUrl: string,
    thumbnailUrl: string,
    durationSeconds: number,
  ): Promise<EventMomentEntity | null> {
    try {
      const doc = await EventMoment.findOneAndUpdate(
        { momentId },
        { $set: { state: EventMomentState.Ready, mediaUrl, thumbnailUrl, durationSeconds } },
        { new: true },
      ).exec();
      return doc ? doc.toObject() : null;
    } catch (error) {
      logDaoError('Error marking event moment ready', { error });
      throw KnownCommonError(error);
    }
  }

  /** Mark a status as Failed after a MediaConvert error. */
  static async markFailed(momentId: string): Promise<void> {
    try {
      await EventMoment.updateOne({ momentId }, { $set: { state: EventMomentState.Failed } }).exec();
    } catch (error) {
      logDaoError('Error marking event moment failed', { error });
      throw KnownCommonError(error);
    }
  }
}

export const POSTING_WINDOW_HOURS_AFTER_EVENT = 48;
export const MAX_STATUSES_PER_WINDOW = MAX_STATUSES_PER_ROLLING_WINDOW;

export default EventMomentDAO;
