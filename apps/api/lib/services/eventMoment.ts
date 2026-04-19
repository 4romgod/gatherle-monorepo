import type { Event, EventMoment, EventMomentPage, CreateEventMomentInput } from '@gatherle/commons/types';
import { EventMomentType, FollowApprovalStatus, FollowTargetType, ParticipantStatus } from '@gatherle/commons/types';
import { EventMomentDAO, EventDAO, EventParticipantDAO, FollowDAO, UserDAO } from '@/mongodb/dao';
import { POSTING_WINDOW_HOURS_AFTER_EVENT, MAX_STATUSES_PER_WINDOW } from '@/mongodb/dao/eventMoment';
import { CF_IMAGES_DOMAIN } from '@/constants';
import { CustomError, ErrorTypes } from '@/utils';
import { logger } from '@/utils/logger';

const ALLOWED_RSVP_STATUSES: ParticipantStatus[] = [ParticipantStatus.Going, ParticipantStatus.CheckedIn];

class EventMomentService {
  /**
   * Create an event moment.
   * Enforces:
   *   - Event exists
   *   - Posting window is open (until 48 h after event.endDate)
   *   - Caller has an active Going or CheckedIn RSVP
   *   - Rate limit (max 5 moments per rolling 24-hour window per event)
   *   - Builds the CloudFront mediaUrl from the S3 key provided by the client
   */
  static async create(input: CreateEventMomentInput, callerId: string): Promise<EventMoment> {
    // 1. Verify event exists and check posting window.
    let event: Event;
    try {
      event = await EventDAO.readEventById(input.eventId);
    } catch {
      throw CustomError('Event not found', ErrorTypes.NOT_FOUND);
    }

    const windowCloseMs =
      (event.primarySchedule?.endAt ?? event.primarySchedule?.startAt)
        ? (event.primarySchedule.endAt ?? event.primarySchedule.startAt!).getTime() +
          POSTING_WINDOW_HOURS_AFTER_EVENT * 60 * 60 * 1000
        : null;

    if (windowCloseMs !== null && Date.now() > windowCloseMs) {
      throw CustomError('The posting window for this event has closed', ErrorTypes.BAD_USER_INPUT);
    }

    // 2. RSVP gate — caller must be Going or CheckedIn.
    const participant = await EventParticipantDAO.readByEventAndUser(input.eventId, callerId);
    if (!participant || !ALLOWED_RSVP_STATUSES.includes(participant.status)) {
      throw CustomError('You must RSVP as Going or CheckedIn to post a moment', ErrorTypes.BAD_USER_INPUT);
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
      if (!CF_IMAGES_DOMAIN) {
        throw new Error('CF_IMAGES_DOMAIN is required to generate media URLs');
      }
      mediaUrl = `https://${CF_IMAGES_DOMAIN}/${input.mediaKey}`;
    }
    if (input.thumbnailKey && CF_IMAGES_DOMAIN) {
      thumbnailUrl = `https://${CF_IMAGES_DOMAIN}/${input.thumbnailKey}`;
    }

    logger.info('[EventMomentService] Creating event moment', {
      callerId,
      eventId: input.eventId,
      type: input.type,
    });

    return EventMomentDAO.create(input, callerId, mediaUrl, thumbnailUrl);
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
    let event: Event | null = null;
    try {
      event = await EventDAO.readEventById(moment.eventId);
    } catch {
      // Event not found — caller is not an organizer.
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
    const isOwnProfile = callerId === targetUserId;

    if (!isOwnProfile) {
      let targetUser;
      try {
        targetUser = await UserDAO.readUserById(targetUserId);
      } catch {
        return [];
      }

      if (targetUser.followPolicy === 'RequireApproval') {
        const follows = await FollowDAO.readFollowingForUser(callerId);
        const isFollower = follows.some(
          (f) =>
            f.targetType === FollowTargetType.User &&
            f.targetId === targetUserId &&
            f.approvalStatus === FollowApprovalStatus.Accepted,
        );
        if (!isFollower) {
          return [];
        }
      }
    }

    return EventMomentDAO.readByAuthorAndEvent(targetUserId, eventId, isOwnProfile);
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
}

export default EventMomentService;
