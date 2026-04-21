import { randomBytes } from 'crypto';
import { getPresignedUploadUrl } from '@/clients/AWS/s3Client';
import { logger } from '@/utils/logger';
import {
  STAGE,
  MEDIA_CDN_DOMAIN,
  CONTENT_TYPE_MAP,
  EVENT_MOMENT_MEDIA_EXTENSIONS,
  EVENT_MOMENT_VIDEO_EXTENSIONS,
  EVENT_MOMENTS_S3_PREFIX,
  MEDIA_ENTITY_FOLDER,
  MEDIA_UPLOAD_URL_EXPIRES_IN_SECONDS,
} from '@/constants';
import { CustomError, ErrorTypes } from '@/utils';
import type { Event, MediaUploadUrl } from '@gatherle/commons/types';
import { EventMomentType, MediaEntityType, MediaType, ParticipantStatus } from '@gatherle/commons/types';
import { EventDAO, EventParticipantDAO, EventMomentDAO } from '@/mongodb/dao';
import { POSTING_WINDOW_HOURS_AFTER_EVENT, MAX_STATUSES_PER_WINDOW } from '@/mongodb/dao/eventMoment';

const ALLOWED_RSVP_STATUSES: ParticipantStatus[] = [ParticipantStatus.Going, ParticipantStatus.CheckedIn];

class MediaService {
  static async getMediaUploadUrl(params: {
    entityType: MediaEntityType;
    mediaType: MediaType;
    extension: string;
    entityId: string | null;
    userId: string;
  }): Promise<MediaUploadUrl> {
    const { entityType, mediaType, entityId, userId } = params;

    if (entityType === MediaEntityType.EventMoment) {
      throw CustomError(
        'Use the getEventMomentUploadUrl mutation for event moment uploads.',
        ErrorTypes.BAD_USER_INPUT,
      );
    }

    const cleanExt = params.extension.toLowerCase().replace(/^\./, '');
    const contentType = CONTENT_TYPE_MAP[cleanExt];
    if (!contentType) {
      throw CustomError(
        `Unsupported file extension: "${cleanExt}". Allowed: ${Object.keys(CONTENT_TYPE_MAP).join(', ')}`,
        ErrorTypes.BAD_USER_INPUT,
      );
    }

    const entityFolder = MEDIA_ENTITY_FOLDER[entityType];
    if (!entityFolder) {
      throw CustomError(`Unsupported entity type: "${entityType}"`, ErrorTypes.BAD_USER_INPUT);
    }

    const resolvedEntityId =
      entityType === MediaEntityType.User ? userId : (entityId ?? randomBytes(8).toString('base64url'));

    const stagePrefix = STAGE.toLowerCase();
    const key =
      mediaType === MediaType.Gallery
        ? `${stagePrefix}/${entityFolder}/${resolvedEntityId}/gallery/${randomBytes(8).toString('base64url')}.${cleanExt}`
        : `${stagePrefix}/${entityFolder}/${resolvedEntityId}/${mediaType}.${cleanExt}`;

    if (!MEDIA_CDN_DOMAIN) {
      throw new Error('MEDIA_CDN_DOMAIN is required to generate stable media URLs');
    }

    const uploadUrl = await getPresignedUploadUrl(key, contentType, MEDIA_UPLOAD_URL_EXPIRES_IN_SECONDS);
    const readUrl = `https://${MEDIA_CDN_DOMAIN}/${key}`;

    logger.info('Generated media upload URL', {
      userId,
      entityType,
      entityId: resolvedEntityId,
      mediaType,
      key,
      mediaHost: MEDIA_CDN_DOMAIN,
    });

    return { uploadUrl, key, readUrl };
  }

  static async getEventMomentUploadUrl(params: {
    eventId: string;
    extension: string;
    userId: string;
    username: string;
  }): Promise<MediaUploadUrl> {
    const { eventId, userId, username } = params;

    const cleanExt = params.extension.toLowerCase().replace(/^\./, '');
    if (!EVENT_MOMENT_MEDIA_EXTENSIONS.has(cleanExt)) {
      throw CustomError(
        `Unsupported extension for moment uploads: "${cleanExt}". Allowed: ${[...EVENT_MOMENT_MEDIA_EXTENSIONS].join(', ')}`,
        ErrorTypes.BAD_USER_INPUT,
      );
    }
    const contentType = CONTENT_TYPE_MAP[cleanExt]!;

    // 1. Verify the event exists and the posting window is still open.
    let event: Event;
    try {
      event = await EventDAO.readEventById(eventId);
    } catch {
      throw CustomError('Event not found', ErrorTypes.NOT_FOUND);
    }

    const windowCloseMs =
      (event.primarySchedule?.endAt ?? event.primarySchedule?.startAt)
        ? ((event.primarySchedule.endAt ?? event.primarySchedule.startAt) as Date).getTime() +
          POSTING_WINDOW_HOURS_AFTER_EVENT * 60 * 60 * 1000
        : null;

    if (windowCloseMs !== null && Date.now() > windowCloseMs) {
      throw CustomError('The posting window for this event has closed', ErrorTypes.BAD_USER_INPUT);
    }

    // 2. Caller must have an active Going or CheckedIn RSVP.
    const participant = await EventParticipantDAO.readByEventAndUser(eventId, userId);
    if (!participant || !ALLOWED_RSVP_STATUSES.includes(participant.status)) {
      throw CustomError('You must RSVP as Going or CheckedIn to upload a moment', ErrorTypes.UNAUTHORIZED);
    }

    // 3. Build the S3 key using the authoritative slug from the DB (never trust client-supplied slug).
    const sanitizedSlug =
      event.slug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || eventId;

    const sanitizedUsername = username
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const shortId = randomBytes(8).toString('base64url');
    const stagePrefix = STAGE.toLowerCase();
    const key = `${stagePrefix}/${EVENT_MOMENTS_S3_PREFIX}/${sanitizedSlug}/${sanitizedUsername}/${shortId}.${cleanExt}`;
    const isVideoUpload = EVENT_MOMENT_VIDEO_EXTENSIONS.has(cleanExt);

    if (!MEDIA_CDN_DOMAIN) {
      throw new Error('MEDIA_CDN_DOMAIN is required to generate stable media URLs');
    }

    if (isVideoUpload) {
      const recentCount = await EventMomentDAO.countRecentByAuthor(eventId, userId);
      if (recentCount >= MAX_STATUSES_PER_WINDOW) {
        throw CustomError(
          `You can upload at most ${MAX_STATUSES_PER_WINDOW} moments per event in a 24-hour period`,
          ErrorTypes.BAD_USER_INPUT,
        );
      }
    }

    const uploadUrl = await getPresignedUploadUrl(key, contentType, MEDIA_UPLOAD_URL_EXPIRES_IN_SECONDS);
    const readUrl = `https://${MEDIA_CDN_DOMAIN}/${key}`;
    let momentId: string | undefined;

    if (isVideoUpload) {
      const moment = await EventMomentDAO.createVideoUpload({
        eventId,
        authorId: userId,
        rawS3Key: key,
        mediaUrl: readUrl,
      });
      momentId = moment.momentId;
    }

    logger.info('Generated event moment upload URL', {
      userId,
      eventId,
      key,
      mediaHost: MEDIA_CDN_DOMAIN,
      type: isVideoUpload ? EventMomentType.Video : EventMomentType.Image,
      momentId,
    });

    return { uploadUrl, key, readUrl, momentId };
  }
}

export default MediaService;
