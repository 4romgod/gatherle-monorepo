import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_REGION, S3_BUCKET_NAME } from '@/constants';
import { logger } from '@/utils/logger';

let s3Client: S3Client;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: AWS_REGION });
    logger.debug('S3Client initialized', { region: AWS_REGION });
  }
  return s3Client;
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
  } catch (err) {
    logger.error('Error uploading to S3:', err);
    throw err;
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
  } catch (err) {
    logger.error('Error deleting from S3:', err);
    throw err;
  }
}

/**
 * Generate a pre-signed URL for reading an object from S3
 * Useful for private images that need temporary access
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
  } catch (err) {
    logger.error('Error generating pre-signed URL:', err);
    throw err;
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
  } catch (err) {
    logger.error('Error generating pre-signed upload URL:', err);
    throw err;
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

    const regionalHost = `${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`;
    const globalHost = `${S3_BUCKET_NAME}.s3.amazonaws.com`;
    const regionalAltHost = `s3.${AWS_REGION}.amazonaws.com`;

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
