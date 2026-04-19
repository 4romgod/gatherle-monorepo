import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_REGION, MEDIA_CDN_DOMAIN, S3_BUCKET_NAME } from '@/constants';
import { logger } from '@/utils/logger';

let s3Client: S3Client;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: AWS_REGION });
    logger.debug('S3Client initialized', { region: AWS_REGION });
  }
  return s3Client;
}

function getConfiguredMediaHostname(): string | null {
  if (!MEDIA_CDN_DOMAIN) {
    return null;
  }

  try {
    const candidate = MEDIA_CDN_DOMAIN.startsWith('http') ? MEDIA_CDN_DOMAIN : `https://${MEDIA_CDN_DOMAIN}`;
    return new URL(candidate).hostname;
  } catch {
    return null;
  }
}

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  try {
    await getS3Client().send(command);
    const url = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    logger.info('File uploaded to S3', { key, bucket: S3_BUCKET_NAME });
    return url;
  } catch (error) {
    logger.error('Error uploading to S3:', { error });
    throw error;
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  try {
    await getS3Client().send(command);
    logger.info('File deleted from S3', { key, bucket: S3_BUCKET_NAME });
  } catch (error) {
    logger.error('Error deleting from S3:', { error });
    throw error;
  }
}

export async function getS3ObjectSize(key: string): Promise<number | undefined> {
  if (!S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new HeadObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await getS3Client().send(command);
    return response.ContentLength;
  } catch (error) {
    logger.error('Error reading S3 object metadata:', { key, error });
    throw error;
  }
}

/**
 * Delete all S3 objects whose key starts with the given prefix.
 * Uses ListObjectsV2 + DeleteObjects (batch) to handle any number of objects.
 * Returns the total number of deleted objects.
 */
export async function deleteS3Prefix(prefix: string): Promise<number> {
  if (!S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listResp = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects =
      listResp.Contents?.map((obj) => obj.Key)
        .filter((key): key is string => key != null)
        .map((Key) => ({ Key })) ?? [];

    if (objects.length > 0) {
      await getS3Client().send(
        new DeleteObjectsCommand({
          Bucket: S3_BUCKET_NAME,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
      totalDeleted += objects.length;
    }

    continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined;
  } while (continuationToken);

  logger.info('Deleted S3 prefix', { prefix, bucket: S3_BUCKET_NAME, totalDeleted });
  return totalDeleted;
}

/**
 * Generate a pre-signed URL for reading an object from S3
 * Useful for private media files that need temporary access
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(getS3Client(), command, { expiresIn });
    logger.debug('Generated pre-signed URL', { key, expiresIn });
    return url;
  } catch (error) {
    logger.error('Error generating pre-signed URL:', { error });
    throw error;
  }
}

/**
 * Generate a pre-signed URL for uploading directly to S3 from client
 * This allows clients to upload files without going through the API server
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  if (!S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(getS3Client(), command, { expiresIn });
    logger.debug('Generated pre-signed upload URL', { key, contentType, expiresIn });
    return url;
  } catch (error) {
    logger.error('Error generating pre-signed upload URL:', { error });
    throw error;
  }
}

/**
 * Extract the S3 key (path) from a public object URL in this bucket.
 */
export function getKeyFromPublicUrl(publicUrl: string): string | null {
  if (!S3_BUCKET_NAME) {
    return null;
  }

  try {
    const parsed = new URL(publicUrl);
    const hostname = parsed.hostname;
    const pathname = parsed.pathname.replace(/^\/+/, '');
    const mediaHostname = getConfiguredMediaHostname();

    const regionalHost = `${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`;
    const globalHost = `${S3_BUCKET_NAME}.s3.amazonaws.com`;
    const regionalAltHost = `s3.${AWS_REGION}.amazonaws.com`;

    if (mediaHostname && hostname === mediaHostname) {
      return pathname;
    }

    if (hostname === regionalHost || hostname === globalHost) {
      return pathname;
    }

    if (hostname === regionalAltHost && pathname.startsWith(`${S3_BUCKET_NAME}/`)) {
      return pathname.slice(S3_BUCKET_NAME.length + 1);
    }

    return null;
  } catch {
    return null;
  }
}
