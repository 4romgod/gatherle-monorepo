import type {
  EventOccurrence,
  EventSeries,
  EventMoment,
  EventMomentPage,
  CreateEventMomentInput,
} from '@gatherle/commons/types';
import {
  EventMomentState,
  EventMomentType,
  EventVisibility,
  FollowPolicy,
  FollowApprovalStatus,
  FollowTargetType,
  ParticipantStatus,
} from '@gatherle/commons/types';
import { EventMomentDAO, EventOccurrenceParticipantDAO, EventSeriesDAO, FollowDAO, UserDAO } from '@/mongodb/dao';
import { POSTING_WINDOW_HOURS_AFTER_EVENT, MAX_STATUSES_PER_WINDOW } from '@/mongodb/dao/eventMoment';
import { MEDIA_CDN_DOMAIN, MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES } from '@/constants';
import { getS3ObjectSize } from '@/clients/AWS/s3Client';
import { CustomError, ErrorTypes } from '@/utils';
import { buildMediaCdnUrl } from '@/utils/mediaUrl';
import { logger } from '@/utils/logger';
import EventOccurrenceService from './eventOccurrence';

const ALLOWED_RSVP_STATUSES: ParticipantStatus[] = [ParticipantStatus.Going, ParticipantStatus.CheckedIn];
const DEFAULT_MOMENTS_FEED_LIMIT = 12;
const MAX_MOMENTS_FEED_LIMIT = 24;
const MIN_MOMENTS_FEED_LIMIT = 1;
const MIN_MOMENTS_FEED_CANDIDATE_POOL = 48;
const MOMENTS_FEED_CURSOR_VERSION = 1;

type RankedMomentCandidate = {
  event: EventSeries | null;
  moment: EventMoment;
  score: number;
};

type MomentsFeedCursorState = {
  candidateCursor?: string;
  offset: number;
  version: number;
};

function clampFeedLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_MOMENTS_FEED_LIMIT;
  }

  return Math.max(MIN_MOMENTS_FEED_LIMIT, Math.min(MAX_MOMENTS_FEED_LIMIT, Math.floor(limit)));
}

function normalizeRefId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value && typeof value === 'object') {
    if ('eventCategoryId' in (value as Record<string, unknown>)) {
      return normalizeRefId((value as { eventCategoryId?: unknown }).eventCategoryId);
    }

    if ('_id' in (value as Record<string, unknown>)) {
      return normalizeRefId((value as { _id?: unknown })._id);
    }

    if (typeof (value as { toString?: () => string }).toString === 'function') {
      const asString = (value as { toString: () => string }).toString();
      return asString && asString !== '[object Object]' ? asString : null;
    }
  }

  return null;
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isEventPublic(event: EventSeries | null): boolean {
  if (!event) {
    return false;
  }

  return !event.visibility || event.visibility === EventVisibility.Public;
}

function scoreMomentCandidate(params: {
  acceptedFollowedUserIds: Set<string>;
  eventMomentCounts: Map<string, number>;
  event: EventSeries | null;
  moment: EventMoment;
  viewerInterests: Set<string>;
  viewerLocation?: { city?: string; country?: string } | null;
}): number {
  const { acceptedFollowedUserIds, eventMomentCounts, event, moment, viewerInterests, viewerLocation } = params;
  let score = 0;

  if (acceptedFollowedUserIds.has(moment.authorId)) {
    score += 40;
  }

  if (event) {
    const eventCategoryIds = new Set(
      (event.eventCategories ?? []).map((category) => normalizeRefId(category)).filter(Boolean),
    );
    if ([...eventCategoryIds].some((categoryId) => viewerInterests.has(categoryId as string))) {
      score += 24;
    }

    const eventCity = event.location?.address?.city?.trim().toLowerCase();
    const eventCountry = event.location?.address?.country?.trim().toLowerCase();
    const viewerCity = viewerLocation?.city?.trim().toLowerCase();
    const viewerCountry = viewerLocation?.country?.trim().toLowerCase();
    if (viewerCity && viewerCountry && eventCity === viewerCity && eventCountry === viewerCountry) {
      score += 20;
    } else if (viewerCountry && eventCountry === viewerCountry) {
      score += 8;
    }
  }

  const eventMomentum = Math.min((eventMomentCounts.get(moment.eventId) ?? 1) * 4, 18);
  score += eventMomentum;

  const hoursSinceCreated = Math.max(0, (Date.now() - moment.createdAt.getTime()) / (60 * 60 * 1000));
  score += Math.max(0, 30 - hoursSinceCreated * 1.5);

  return score;
}

function diversifyRankedMoments(candidates: RankedMomentCandidate[]): RankedMomentCandidate[] {
  const remaining = [...candidates].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return right.moment.createdAt.getTime() - left.moment.createdAt.getTime();
  });
  const result: RankedMomentCandidate[] = [];

  while (remaining.length > 0) {
    const lastAuthorId = result.at(-1)?.moment.authorId;
    const previousAuthorId = result.at(-2)?.moment.authorId;
    const lastEventId = result.at(-1)?.moment.eventId;
    const previousEventId = result.at(-2)?.moment.eventId;

    const nextIndex = remaining.findIndex((candidate) => {
      const sameAuthorStreak =
        candidate.moment.authorId === lastAuthorId && candidate.moment.authorId === previousAuthorId;
      const sameEventStreak = candidate.moment.eventId === lastEventId && candidate.moment.eventId === previousEventId;

      return !sameAuthorStreak && !sameEventStreak;
    });

    if (nextIndex === -1) {
      result.push(...remaining);
      break;
    }

    result.push(remaining.splice(nextIndex, 1)[0]);
  }

  return result;
}

function decodeMomentsFeedCursor(cursor?: string): MomentsFeedCursorState {
  if (!cursor) {
    return { offset: 0, version: MOMENTS_FEED_CURSOR_VERSION };
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<MomentsFeedCursorState>;
    if (
      parsed &&
      parsed.version === MOMENTS_FEED_CURSOR_VERSION &&
      typeof parsed.offset === 'number' &&
      parsed.offset >= 0 &&
      Number.isFinite(parsed.offset)
    ) {
      return {
        candidateCursor: typeof parsed.candidateCursor === 'string' ? parsed.candidateCursor : undefined,
        offset: Math.floor(parsed.offset),
        version: MOMENTS_FEED_CURSOR_VERSION,
      };
    }
  } catch {
    // Fall back to treating legacy cursors as raw candidate-stream cursors.
  }

  return {
    candidateCursor: cursor,
    offset: 0,
    version: MOMENTS_FEED_CURSOR_VERSION,
  };
}

function encodeMomentsFeedCursor(state: Omit<MomentsFeedCursorState, 'version'>): string {
  return Buffer.from(
    JSON.stringify({
      ...state,
      version: MOMENTS_FEED_CURSOR_VERSION,
    }),
    'utf8',
  ).toString('base64url');
}

function getPostingWindowCloseMs(occurrence: Pick<EventOccurrence, 'startAt' | 'endAt'>): number {
  return (occurrence.endAt ?? occurrence.startAt).getTime() + POSTING_WINDOW_HOURS_AFTER_EVENT * 60 * 60 * 1000;
}

function isMissingS3ObjectError(error: unknown): boolean {
  const maybeAwsError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return maybeAwsError.name === 'NotFound' || maybeAwsError.$metadata?.httpStatusCode === 404;
}

async function verifyVideoSize(mediaKey: string): Promise<void> {
  let objectSize: number | undefined;
  try {
    objectSize = await getS3ObjectSize(mediaKey);
  } catch (error) {
    if (isMissingS3ObjectError(error)) {
      throw CustomError('Uploaded video file was not found. Please upload again.', ErrorTypes.BAD_USER_INPUT);
    }
    throw error;
  }

  if (objectSize == null) {
    throw CustomError(
      'Uploaded video file size could not be verified. Please upload again.',
      ErrorTypes.BAD_USER_INPUT,
    );
  }

  if (objectSize > MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES) {
    throw CustomError('Video must be 75 MB or smaller.', ErrorTypes.BAD_USER_INPUT);
  }
}

class EventMomentService {
  private static async canViewProtectedUserMoments(targetUserId: string, callerId?: string): Promise<boolean> {
    const isOwnProfile = Boolean(callerId) && callerId === targetUserId;

    if (isOwnProfile) {
      return true;
    }

    let targetUser;
    try {
      targetUser = await UserDAO.readUserById(targetUserId);
    } catch {
      return false;
    }

    if (targetUser.followPolicy !== 'RequireApproval') {
      return true;
    }

    if (!callerId) {
      return false;
    }

    const follows = await FollowDAO.readFollowingForUser(callerId);
    return follows.some(
      (f) =>
        f.targetType === FollowTargetType.User &&
        f.targetId === targetUserId &&
        f.approvalStatus === FollowApprovalStatus.Accepted,
    );
  }
  /**
   * Create an event moment.
   * Enforces:
   *   - EventSeries exists
   *   - Posting window is open (until 48 h after event.endDate)
   *   - Caller has an active Going or CheckedIn RSVP
   *   - Rate limit (max 5 moments per rolling 24-hour window per event)
   *   - Builds the CloudFront mediaUrl from the S3 key provided by the client
   */
  static async create(input: CreateEventMomentInput, callerId: string): Promise<EventMoment> {
    // 1. Verify event exists and check posting window.
    let event: EventSeries;
    try {
      event = await EventSeriesDAO.readEventById(input.eventId);
    } catch {
      throw CustomError('EventSeries not found', ErrorTypes.NOT_FOUND);
    }

    if (EventOccurrenceService.isRecurringSeries(event)) {
      if (!input.occurrenceId) {
        throw CustomError(
          'Posting event moments for recurring event series requires occurrence targeting.',
          ErrorTypes.BAD_REQUEST,
        );
      }
    }

    // 2. Resolve the targeted occurrence, enforce posting window, and apply RSVP gate.
    const occurrence = await EventOccurrenceService.readOccurrenceForSeries(input.eventId, input.occurrenceId);
    if (!occurrence) {
      throw CustomError('Event occurrence not found for this event.', ErrorTypes.NOT_FOUND);
    }

    if (Date.now() > getPostingWindowCloseMs(occurrence)) {
      throw CustomError('The posting window for this event has closed', ErrorTypes.BAD_USER_INPUT);
    }

    const participant = await EventOccurrenceParticipantDAO.readByOccurrenceAndUser(occurrence.occurrenceId, callerId);
    if (!participant || !ALLOWED_RSVP_STATUSES.includes(participant.status)) {
      throw CustomError('You must RSVP as Going or CheckedIn to post a moment', ErrorTypes.BAD_USER_INPUT);
    }

    // Video moments are reserved when getEventMomentUploadUrl is issued. This call
    // only publishes that reserved row with user-supplied metadata.
    if (input.type === EventMomentType.Video) {
      return EventMomentService.publishReservedVideoMoment(input, callerId, occurrence.occurrenceId);
    }

    // 3. Rate limit.
    const recentCount = await EventMomentDAO.countRecentByAuthor(input.eventId, callerId);
    if (recentCount >= MAX_STATUSES_PER_WINDOW) {
      throw CustomError(
        `You can post at most ${MAX_STATUSES_PER_WINDOW} moments per event in a 24-hour period`,
        ErrorTypes.BAD_USER_INPUT,
      );
    }

    // 4. Build mediaUrl and thumbnailUrl from the S3 keys supplied by the client.
    let mediaUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    if (input.type !== EventMomentType.Text && input.mediaKey) {
      if (!MEDIA_CDN_DOMAIN) {
        throw new Error('MEDIA_CDN_DOMAIN is required to generate media URLs');
      }

      mediaUrl = buildMediaCdnUrl(MEDIA_CDN_DOMAIN, input.mediaKey);
    }
    if (input.thumbnailKey && MEDIA_CDN_DOMAIN) {
      thumbnailUrl = buildMediaCdnUrl(MEDIA_CDN_DOMAIN, input.thumbnailKey);
    }

    const moment = await EventMomentDAO.create(input, callerId, mediaUrl, thumbnailUrl, occurrence.occurrenceId);

    logger.info('[EventMomentService] Created event moment', {
      momentId: moment.momentId,
      callerId,
      eventId: input.eventId,
      type: input.type,
      rawS3Key: input.mediaKey,
    });

    return moment;
  }

  private static async publishReservedVideoMoment(
    input: CreateEventMomentInput,
    callerId: string,
    occurrenceId: string,
  ): Promise<EventMoment> {
    if (!input.momentId) {
      throw CustomError('Use getEventMomentUploadUrl before creating a video moment.', ErrorTypes.BAD_USER_INPUT);
    }

    if (!input.mediaKey) {
      throw CustomError('mediaKey is required for video moments.', ErrorTypes.BAD_USER_INPUT);
    }

    if (!MEDIA_CDN_DOMAIN) {
      throw new Error('MEDIA_CDN_DOMAIN is required to generate media URLs');
    }

    const reservedMoment = await EventMomentDAO.readById(input.momentId);

    if (!reservedMoment) {
      throw CustomError('Video upload reservation not found. Please upload again.', ErrorTypes.BAD_USER_INPUT);
    }

    if (
      reservedMoment.eventId !== input.eventId ||
      reservedMoment.authorId !== callerId ||
      reservedMoment.type !== EventMomentType.Video
    ) {
      throw CustomError('Video upload reservation does not match this moment.', ErrorTypes.UNAUTHORIZED);
    }

    if (reservedMoment.occurrenceId !== occurrenceId) {
      throw CustomError('Video upload reservation does not match the targeted occurrence.', ErrorTypes.BAD_USER_INPUT);
    }

    if (!reservedMoment.rawS3Key) {
      throw CustomError(
        'Video upload reservation is missing its S3 key. Please upload again.',
        ErrorTypes.BAD_USER_INPUT,
      );
    }

    if (input.mediaKey !== reservedMoment.rawS3Key) {
      throw CustomError('Video upload reservation does not match the uploaded file.', ErrorTypes.BAD_USER_INPUT);
    }

    if (reservedMoment.state === EventMomentState.Failed) {
      throw CustomError('Uploaded video failed processing. Please upload again.', ErrorTypes.BAD_USER_INPUT);
    }

    const rawS3Key = reservedMoment.rawS3Key;

    if (reservedMoment.state !== EventMomentState.Ready) {
      await verifyVideoSize(rawS3Key);
    }

    const thumbnailUrl = input.thumbnailKey ? buildMediaCdnUrl(MEDIA_CDN_DOMAIN, input.thumbnailKey) : undefined;
    const moment = await EventMomentDAO.publishVideoMoment(reservedMoment.momentId, {
      eventId: input.eventId,
      authorId: callerId,
      caption: input.caption,
      thumbnailUrl,
    });

    if (!moment) {
      throw CustomError(
        'Video upload reservation could not be published. Please upload again.',
        ErrorTypes.BAD_USER_INPUT,
      );
    }

    logger.info('[EventMomentService] Published reserved video event moment', {
      momentId: moment.momentId,
      callerId,
      eventId: input.eventId,
      rawS3Key,
    });

    return moment;
  }

  /**
   * Delete an event moment.
   * Only the moment's author or an event organizer may delete.
   */
  static async delete(momentId: string, callerId: string): Promise<boolean> {
    const moment = await EventMomentDAO.readById(momentId);
    if (!moment) {
      throw CustomError('Moment not found', ErrorTypes.NOT_FOUND);
    }

    if (moment.authorId === callerId) {
      return EventMomentDAO.delete(momentId);
    }

    // Allow event organizers to remove moments from their event.
    let event: EventSeries | null = null;
    try {
      event = await EventSeriesDAO.readEventById(moment.eventId);
    } catch {
      // EventSeries not found — caller is not an organizer.
    }

    const isOrganizer = event?.organizers?.some((o) => {
      const user = o.user;
      if (typeof user === 'string') return user === callerId;
      if (user && typeof user === 'object' && 'userId' in user) return (user as { userId: string }).userId === callerId;
      if (user && typeof user === 'object') return user.toString() === callerId; // ObjectId fallback
      return false;
    });

    if (!isOrganizer) {
      throw CustomError('You are not authorized to delete this moment', ErrorTypes.UNAUTHORIZED);
    }

    return EventMomentDAO.delete(momentId);
  }

  /**
   * Read all active moments for an event (event-page ring view).
   * No follow filter — all attendees' moments are visible on the event page.
   */
  static async readByEvent(
    eventId: string,
    cursor?: string,
    limit?: number,
    viewerUserId?: string,
  ): Promise<EventMomentPage> {
    return EventMomentDAO.readByEvent(eventId, cursor, limit, viewerUserId);
  }

  /**
   * Read a specific user's moments for a specific event (profile / search view).
   * Respects the target user's follow policy:
   *   - Public profile → any authenticated caller can view
   *   - Private profile (RequireApproval) → only accepted followers can view; returns [] silently otherwise
   */
  static async readUserMoments(targetUserId: string, eventId: string, callerId: string): Promise<EventMoment[]> {
    const canView = await EventMomentService.canViewProtectedUserMoments(targetUserId, callerId);
    if (!canView) {
      return [];
    }

    return EventMomentDAO.readByAuthorAndEvent(targetUserId, eventId, callerId === targetUserId);
  }

  /**
   * Read a specific user's active moments across all events (profile story view).
   * Respects the target user's follow policy in the same way as readUserMoments.
   */
  static async readUserMomentsFeed(
    targetUserId: string,
    callerId?: string,
    cursor?: string,
    limit?: number,
  ): Promise<EventMomentPage> {
    const canView = await EventMomentService.canViewProtectedUserMoments(targetUserId, callerId);
    if (!canView) {
      return { items: [], hasMore: false };
    }

    return EventMomentDAO.readByAuthor(targetUserId, callerId === targetUserId, cursor, limit);
  }

  /**
   * Read a single moment by id for deep links / reply-to-moment navigation.
   * Published ready moments are readable whenever the author's follow policy allows it.
   * Authors may also view their own pending / failed moments.
   */
  static async readMomentById(momentId: string, callerId?: string): Promise<EventMoment | null> {
    const moment = await EventMomentDAO.readById(momentId);

    if (!moment || moment.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    const canView = await EventMomentService.canViewProtectedUserMoments(moment.authorId, callerId);
    if (!canView) {
      return null;
    }

    if (moment.authorId === callerId) {
      return moment;
    }

    return moment.state === EventMomentState.Ready && moment.isPublished ? moment : null;
  }

  /**
   * Read moments from users the caller follows (personal cross-event feed).
   */
  static async readFollowedMoments(callerId: string, cursor?: string, limit?: number): Promise<EventMomentPage> {
    const follows = await FollowDAO.readFollowingForUser(callerId);
    const followedUserIds = follows.filter((f) => f.targetType === FollowTargetType.User).map((f) => f.targetId);

    if (followedUserIds.length === 0) {
      return { items: [], hasMore: false };
    }

    return EventMomentDAO.readFollowedStatuses(followedUserIds, cursor, limit);
  }

  /**
   * Read a discovery feed of active moments across public events.
   * Guests get a freshness/momentum feed; signed-in viewers get additional
   * personalization from follows, interests, and locality.
   */
  static async readMomentsFeed(callerId?: string, cursor?: string, limit?: number): Promise<EventMomentPage> {
    const pageSize = clampFeedLimit(limit);
    const candidatePoolSize = Math.max(MIN_MOMENTS_FEED_CANDIDATE_POOL, pageSize * 6);
    const initialCursorState = decodeMomentsFeedCursor(cursor);

    const [follows, viewer] = await Promise.all([
      callerId ? FollowDAO.readFollowingForUser(callerId) : Promise.resolve([]),
      callerId ? UserDAO.readUserById(callerId).catch(() => null) : Promise.resolve(null),
    ]);

    const acceptedFollowedUserIds = new Set(
      follows
        .filter(
          (follow) =>
            follow.targetType === FollowTargetType.User && follow.approvalStatus === FollowApprovalStatus.Accepted,
        )
        .map((follow) => follow.targetId),
    );

    let candidateCursor = initialCursorState.candidateCursor;
    let remainingOffset = initialCursorState.offset;

    while (true) {
      const candidatePage = await EventMomentDAO.readFeedCandidates(candidateCursor, candidatePoolSize);
      const candidates = candidatePage.items;

      if (candidates.length === 0) {
        return { items: [], hasMore: false };
      }

      const [authors, events] = await Promise.all([
        UserDAO.readUsersByIds([...new Set(candidates.map((moment) => moment.authorId))]).catch(() => []),
        EventSeriesDAO.readEventsByIds([...new Set(candidates.map((moment) => moment.eventId))]).catch(() => []),
      ]);

      const authorsById = new Map<string, Awaited<ReturnType<typeof UserDAO.readUserById>> | null>(
        authors.map((author): readonly [string, Awaited<ReturnType<typeof UserDAO.readUserById>> | null] => [
          author.userId,
          author,
        ]),
      );
      const eventsById = new Map<string, Awaited<ReturnType<typeof EventSeriesDAO.readEventById>> | null>(
        events.map((event): readonly [string, Awaited<ReturnType<typeof EventSeriesDAO.readEventById>> | null] => [
          event.eventId,
          event,
        ]),
      );
      const viewerInterests = new Set<string>(
        (viewer?.interests ?? []).map((interest) => normalizeRefId(interest)).filter(isNonEmptyString),
      );
      const eventMomentCounts = new Map<string, number>();

      for (const moment of candidates) {
        eventMomentCounts.set(moment.eventId, (eventMomentCounts.get(moment.eventId) ?? 0) + 1);
      }

      const ranked = candidates
        .filter((moment) => {
          const author = authorsById.get(moment.authorId);
          const event = eventsById.get(moment.eventId) ?? null;
          const isTrustedAuthor =
            Boolean(callerId) && (author?.userId === callerId || acceptedFollowedUserIds.has(author?.userId ?? ''));

          if (!author || !event) {
            return false;
          }

          if (author.followPolicy === FollowPolicy.RequireApproval) {
            return Boolean(isTrustedAuthor);
          }

          if (isEventPublic(event)) {
            return true;
          }

          return Boolean(isTrustedAuthor);
        })
        .map((moment) => ({
          moment,
          event: eventsById.get(moment.eventId) ?? null,
          score: scoreMomentCandidate({
            acceptedFollowedUserIds,
            event: eventsById.get(moment.eventId) ?? null,
            eventMomentCounts,
            moment,
            viewerInterests,
            viewerLocation: viewer?.location,
          }),
        }));

      const diversified = diversifyRankedMoments(ranked);

      if (diversified.length === 0) {
        if (candidatePage.hasMore && candidatePage.nextCursor) {
          candidateCursor = candidatePage.nextCursor;
          remainingOffset = 0;
          continue;
        }

        return { items: [], hasMore: false };
      }

      if (remainingOffset >= diversified.length) {
        if (candidatePage.hasMore && candidatePage.nextCursor) {
          remainingOffset -= diversified.length;
          candidateCursor = candidatePage.nextCursor;
          continue;
        }

        return { items: [], hasMore: false };
      }

      const pagedItems = diversified
        .slice(remainingOffset, remainingOffset + pageSize)
        .map((candidate) => candidate.moment);
      const hasMoreInWindow = remainingOffset + pageSize < diversified.length;
      const nextCursor = hasMoreInWindow
        ? encodeMomentsFeedCursor({
            candidateCursor,
            offset: remainingOffset + pageSize,
          })
        : candidatePage.hasMore && candidatePage.nextCursor
          ? encodeMomentsFeedCursor({
              candidateCursor: candidatePage.nextCursor,
              offset: 0,
            })
          : undefined;

      return {
        items: pagedItems,
        nextCursor,
        hasMore: Boolean(nextCursor),
      };
    }
  }
}

export default EventMomentService;
