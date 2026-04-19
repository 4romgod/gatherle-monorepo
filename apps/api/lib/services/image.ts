import { randomBytes } from 'crypto';
import { getPresignedUploadUrl } from '@/clients/AWS/s3Client';
import { logger } from '@/utils/logger';
import { CF_IMAGES_DOMAIN, CONTENT_TYPE_MAP, STAGE } from '@/constants';
import { CustomError, ErrorTypes } from '@/utils';
import type { ImageUploadUrl } from '@gatherle/commons/types';
import { ImageEntityType, ImageType, ParticipantStatus, Event } from '@gatherle/commons/types';
import { EventDAO, EventParticipantDAO, EventMomentDAO } from '@/mongodb/dao';
import { POSTING_WINDOW_HOURS_AFTER_EVENT, MAX_STATUSES_PER_WINDOW } from '@/mongodb/dao/eventMoment';

const ALLOWED_MOMENT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm']);
const ALLOWED_RSVP_STATUSES: ParticipantStatus[] = [ParticipantStatus.Going, ParticipantStatus.CheckedIn];

/**
 * Explicit S3 folder name for each entity type.
 * Avoids fragile string-append heuristics (e.g. `${entityType}s`).
 */
const ENTITY_FOLDER: Partial<Record<ImageEntityType, string>> = {
  [ImageEntityType.User]: 'users',
  [ImageEntityType.Organization]: 'organizations',
  [ImageEntityType.Event]: 'events',
  [ImageEntityType.Venue]: 'venues',
};

class ImageService {
  static async getImageUploadUrl(params: {
    entityType: ImageEntityType;
    imageType: ImageType;
    extension: string;
    entityId: string | null;
    userId: string;
  }): Promise<ImageUploadUrl> {
    const { entityType, imageType, entityId, userId } = params;

    if (entityType === ImageEntityType.EventMoment) {
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

    const entityFolder = ENTITY_FOLDER[entityType];
    if (!entityFolder) {
      throw CustomError(`Unsupported entity type: "${entityType}"`, ErrorTypes.BAD_USER_INPUT);
    }

    const resolvedEntityId =
      entityType === ImageEntityType.User ? userId : (entityId ?? randomBytes(8).toString('base64url'));

    const stagePrefix = STAGE.toLowerCase();
    const key =
      imageType === ImageType.Gallery
        ? `${stagePrefix}/${entityFolder}/${resolvedEntityId}/gallery/${randomBytes(8).toString('base64url')}.${cleanExt}`
        : `${stagePrefix}/${entityFolder}/${resolvedEntityId}/${imageType}.${cleanExt}`;

    if (!CF_IMAGES_DOMAIN) {
      throw new Error('CF_IMAGES_DOMAIN is required to generate stable media URLs');
    }

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900);
    const readUrl = `https://${CF_IMAGES_DOMAIN}/${key}`;

    logger.info('Generated image upload URL', {
      userId,
      entityType,
      entityId: resolvedEntityId,
      imageType,
      key,
      mediaHost: CF_IMAGES_DOMAIN,
    });

    return { uploadUrl, key, readUrl };
  }

  static async getEventMomentUploadUrl(params: {
    eventId: string;
    extension: string;
    userId: string;
    username: string;
  }): Promise<ImageUploadUrl> {
    const { eventId, userId, username } = params;

    const cleanExt = params.extension.toLowerCase().replace(/^\./, '');
    if (!ALLOWED_MOMENT_EXTENSIONS.has(cleanExt)) {
      throw CustomError(
        `Unsupported extension for moment uploads: "${cleanExt}". Allowed: ${[...ALLOWED_MOMENT_EXTENSIONS].join(', ')}`,
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

    // 3. Rate limit — same window as createEventMoment to prevent cost amplification
    //    via uploading videos without ever calling createEventMoment.
    const recentCount = await EventMomentDAO.countRecentByAuthor(eventId, userId);
    if (recentCount >= MAX_STATUSES_PER_WINDOW) {
      throw CustomError(
        `You can upload at most ${MAX_STATUSES_PER_WINDOW} moments per event in a 24-hour period`,
        ErrorTypes.BAD_USER_INPUT,
      );
    }

    // 4. Build the S3 key using the authoritative slug from the DB (never trust client-supplied slug).
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
    const key = `${stagePrefix}/event-moments/${sanitizedSlug}/${sanitizedUsername}/${shortId}.${cleanExt}`;

    if (!CF_IMAGES_DOMAIN) {
      throw new Error('CF_IMAGES_DOMAIN is required to generate stable media URLs');
    }

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900);
    const readUrl = `https://${CF_IMAGES_DOMAIN}/${key}`;

    logger.info('Generated event moment upload URL', { userId, eventId, key, mediaHost: CF_IMAGES_DOMAIN });

    return { uploadUrl, key, readUrl };
  }
}

export default ImageService;
