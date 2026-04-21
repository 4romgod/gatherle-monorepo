import type { EventMoment as EventMomentEntity, CreateEventMomentInput } from '@gatherle/commons/types';
import { EventMomentState, EventMomentType } from '@gatherle/commons/types';
import { EventMoment } from '@/mongodb/models';
import { KnownCommonError, logDaoError } from '@/utils';

const EXPIRY_HOURS = 24;
const MAX_STATUSES_PER_ROLLING_WINDOW = 5;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
const PENDING_EVENT_MOMENT_STATES = [EventMomentState.UploadPending, EventMomentState.Transcoding];

const publishedMomentFilter = { isPublished: true };

interface CreateVideoUploadParams {
  eventId: string;
  authorId: string;
  rawS3Key: string;
  mediaUrl: string;
}

interface PublishVideoMomentParams {
  eventId: string;
  authorId: string;
  caption?: string;
  thumbnailUrl?: string;
}

class EventMomentDAO {
  /**
   * Create a new event moment. The model hook derives momentId from the Mongo _id.
   * For image moments, mediaUrl should be provided directly as a CloudFront URL.
   * Video moments should be reserved with createVideoUpload, then published with publishVideoMoment.
   */
  static async create(
    input: CreateEventMomentInput,
    authorId: string,
    mediaUrl?: string,
    thumbnailUrl?: string,
  ): Promise<EventMomentEntity> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

      const doc = await EventMoment.create({
        eventId: input.eventId,
        authorId,
        type: input.type,
        caption: input.caption,
        mediaUrl,
        thumbnailUrl,
        background: input.background,
        state: EventMomentState.Ready,
        isPublished: true,
        expiresAt,
      });

      return doc.toObject();
    } catch (error) {
      logDaoError('Error creating event moment', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Reserve a video moment before S3 upload. The row is hidden from readers until
   * createEventMoment publishes it, but S3/MediaConvert can already advance it.
   */
  static async createVideoUpload(params: CreateVideoUploadParams): Promise<EventMomentEntity> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

      const doc = await EventMoment.create({
        eventId: params.eventId,
        authorId: params.authorId,
        type: EventMomentType.Video,
        state: EventMomentState.UploadPending,
        rawS3Key: params.rawS3Key,
        mediaUrl: params.mediaUrl,
        isPublished: false,
        expiresAt,
      });

      return doc.toObject();
    } catch (error) {
      logDaoError('Error reserving video event moment upload', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Publish a reserved video moment after the client has uploaded the raw file
   * and supplied optional caption/thumbnail metadata.
   */
  static async publishVideoMoment(
    momentId: string,
    params: PublishVideoMomentParams,
  ): Promise<EventMomentEntity | null> {
    try {
      const setFields: Record<string, unknown> = { isPublished: true };
      if (params.caption !== undefined) {
        setFields.caption = params.caption;
      }
      if (params.thumbnailUrl !== undefined) {
        setFields.thumbnailUrl = params.thumbnailUrl;
      }

      const doc = await EventMoment.findOneAndUpdate(
        {
          momentId,
          eventId: params.eventId,
          authorId: params.authorId,
          type: EventMomentType.Video,
          state: { $ne: EventMomentState.Failed },
        },
        { $set: setFields },
        { new: true },
      ).exec();

      return doc ? doc.toObject() : null;
    } catch (error) {
      logDaoError('Error publishing reserved video event moment', { error });
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
    viewerUserId?: string,
  ): Promise<{ items: EventMomentEntity[]; nextCursor?: string; hasMore: boolean }> {
    try {
      const now = new Date();
      // Always include Ready moments; also include the viewer's own pending moments so
      // they see their upload after publishing while transcoding is in progress.
      const query: Record<string, unknown> = {
        eventId,
        expiresAt: { $gt: now },
        $and: [
          publishedMomentFilter,
          viewerUserId
            ? {
                $or: [
                  { state: EventMomentState.Ready },
                  { state: { $in: PENDING_EVENT_MOMENT_STATES }, authorId: viewerUserId },
                ],
              }
            : { state: EventMomentState.Ready },
        ],
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
   * Includes pending statuses when the caller is the author.
   */
  static async readByAuthorAndEvent(
    authorId: string,
    eventId: string,
    includePending: boolean,
  ): Promise<EventMomentEntity[]> {
    try {
      const now = new Date();
      const stateFilter = includePending
        ? { $in: [EventMomentState.Ready, ...PENDING_EVENT_MOMENT_STATES] }
        : EventMomentState.Ready;

      const items = await EventMoment.find({
        authorId,
        eventId,
        state: stateFilter,
        expiresAt: { $gt: now },
        ...publishedMomentFilter,
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
        ...publishedMomentFilter,
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

  /** Find a moment by the raw S3 key reserved before upload. */
  static async findByRawS3Key(rawS3Key: string): Promise<EventMomentEntity | null> {
    try {
      const doc = await EventMoment.findOne({ rawS3Key }).exec();
      return doc ? doc.toObject() : null;
    } catch (error) {
      logDaoError('Error finding event moment by raw S3 key', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Atomically claim an upload-pending video for transcoding.
   * Duplicate S3 ObjectCreated events will not submit a second job once claimed.
   */
  static async claimTranscodeStart(rawS3Key: string): Promise<EventMomentEntity | null> {
    try {
      const doc = await EventMoment.findOneAndUpdate(
        {
          rawS3Key,
          type: EventMomentType.Video,
          state: EventMomentState.UploadPending,
        },
        { $set: { state: EventMomentState.Transcoding } },
        { new: true },
      ).exec();

      return doc ? doc.toObject() : null;
    } catch (error) {
      logDaoError('Error claiming video event moment for transcoding', { error });
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
   * Update mediaUrl + durationSeconds (and optionally thumbnailUrl) after MediaConvert completes.
   * thumbnailUrl is optional — callers that already set it via the client upload can omit it.
   * Called by the MediaConvert completion Lambda.
   */
  static async markReady(
    momentId: string,
    mediaUrl: string,
    thumbnailUrl: string | undefined,
    durationSeconds: number,
  ): Promise<EventMomentEntity | null> {
    try {
      const setFields: Record<string, unknown> = { state: EventMomentState.Ready, mediaUrl, durationSeconds };
      if (thumbnailUrl !== undefined) {
        setFields.thumbnailUrl = thumbnailUrl;
      }
      const doc = await EventMoment.findOneAndUpdate({ momentId }, { $set: setFields }, { new: true }).exec();
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

export const POSTING_WINDOW_HOURS_AFTER_EVENT = 72;
export const MAX_STATUSES_PER_WINDOW = MAX_STATUSES_PER_ROLLING_WINDOW;

export default EventMomentDAO;
