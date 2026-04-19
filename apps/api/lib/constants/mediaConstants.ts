import { MediaEntityType } from '@gatherle/commons/types';

export const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

export const EVENT_MOMENT_MEDIA_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm']);
export const EVENT_MOMENT_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv']);

export const MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES = 75 * 1024 * 1024;
export const MAX_EVENT_MOMENT_VIDEO_DURATION_MS = 30 * 1000;

export const MEDIA_UPLOAD_URL_EXPIRES_IN_SECONDS = 900;
export const EVENT_MOMENTS_S3_PREFIX = 'event-moments';

/**
 * Explicit S3 folder name for each media entity type.
 * Avoids fragile string-append heuristics (e.g. `${entityType}s`).
 */
export const MEDIA_ENTITY_FOLDER: Partial<Record<MediaEntityType, string>> = {
  [MediaEntityType.User]: 'users',
  [MediaEntityType.Organization]: 'organizations',
  [MediaEntityType.Event]: 'events',
  [MediaEntityType.Venue]: 'venues',
};
