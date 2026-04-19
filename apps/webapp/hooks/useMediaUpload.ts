'use client';

import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { GetMediaUploadUrlDocument } from '@/data/graphql/query';
import type { MediaEntityType, MediaType } from '@/data/graphql/types/graphql';
import { getAuthHeader, getFileExtension, logger } from '@/lib/utils';

interface UseMediaUploadOptions {
  entityType: MediaEntityType;
  mediaType: MediaType;
  /** Required for Organization, Event, Venue. Omit for User — resolved server-side from JWT. */
  entityId?: string;
}

interface UseMediaUploadResult {
  /**
   * Upload a file to S3. Resolves to the media URL that should be persisted on success.
   * Also sets `preview` to an immediate local FileReader data URL.
   */
  upload: (file: File) => Promise<string>;
  uploading: boolean;
  error: string | null;
  /** Local FileReader data URL — shown immediately; cleared once the real URL is available. */
  preview: string | null;
  reset: () => void;
}

/**
 * Shared hook for S3 media uploads across the webapp.
 * Handles FileReader preview, the upload URL query, and the S3 PUT in one place.
 *
 * @example
 * const { upload, uploading, error, preview, reset } = useMediaUpload({
 *   entityType: MediaEntityType.Organization,
 *   mediaType: MediaType.Logo,
 *   entityId: org.orgId,
 * });
 */
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
// TODO: investigate the right max file size for media uploads — 15 MB is a temporary ceiling
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export function useMediaUpload(options: UseMediaUploadOptions): UseMediaUploadResult {
  const { entityType, mediaType, entityId } = options;
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    context: { headers: getAuthHeader(token) },
  });

  const upload = async (file: File): Promise<string> => {
    // Client-side validation — keeps all callers consistent without a network round-trip
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      const message = 'Unsupported file type. Please select a JPG, PNG, WebP, or GIF image.';
      setError(message);
      throw new Error(message);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const message = `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 15 MB.`;
      setError(message);
      throw new Error(message);
    }

    // Await the FileReader before any async network work so onloadend can never
    // fire after setPreview(null) and re-populate a stale preview.
    const localPreview = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file for preview'));
      reader.readAsDataURL(file);
    });
    setPreview(localPreview);

    setUploading(true);
    setError(null);

    try {
      const extension = getFileExtension(file);
      if (!extension) {
        throw new Error('Unable to determine file type for upload. Please select a supported image file.');
      }

      const { data, error: queryError } = await getUploadUrl({
        variables: {
          entityType,
          mediaType,
          extension,
          ...(entityId !== undefined ? { entityId } : {}),
        },
      });

      if (queryError) throw new Error(queryError.message || 'Failed to get upload URL');
      if (!data?.getMediaUploadUrl) throw new Error('Failed to get upload URL');

      const { uploadUrl, readUrl } = data.getMediaUploadUrl;

      logger.info('Uploading media to S3', { entityType, mediaType, fileSize: file.size });

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        logger.error('S3 upload failed', { status: uploadResponse.status, errorText });
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      setPreview(null);
      return readUrl;
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Upload failed';
      // Only expose safe, user-facing validation messages. Server/infra errors are logged
      // internally and replaced with a generic message so internal details never reach the UI.
      const isUserFacingError =
        rawMessage.startsWith('Unsupported file type') ||
        rawMessage.startsWith('File is too large') ||
        rawMessage.startsWith('Unable to determine file type') ||
        rawMessage.startsWith('Upload failed:');
      const userMessage = isUserFacingError ? rawMessage : 'Media upload failed. Please try again.';
      logger.error('useMediaUpload error', { entityType, mediaType, error: rawMessage });
      setError(userMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setUploading(false);
    setError(null);
    setPreview(null);
  };

  return { upload, uploading, error, preview, reset };
}
