import 'reflect-metadata';
import type { EventBridgeEvent } from 'aws-lambda';
import { MongoDbClient, getConfigValue } from '@/clients';
import { SECRET_KEYS, MAX_EVENT_MOMENT_VIDEO_DURATION_MS } from '@/constants';
import { EventMomentDAO } from '@/mongodb/dao';
import { deleteFromS3, deleteS3Prefix } from '@/clients/AWS/s3Client';
import { logger } from '@/utils/logger';
import { buildMediaCdnUrl } from '@/utils/mediaUrl';

const MEDIA_CDN_DOMAIN = process.env.MEDIA_CDN_DOMAIN || '';

let isDbConnected = false;

async function ensureDbConnected(): Promise<void> {
  if (!isDbConnected) {
    const mongoUrl = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
    await MongoDbClient.connectToDatabase(mongoUrl);
    isDbConnected = true;
  }
}

/**
 * Shape of a MediaConvert Job State Change event detail.
 * Only the fields we actually use are typed here.
 */
interface MediaConvertEventDetail {
  status: 'COMPLETE' | 'ERROR' | string;
  userMetadata?: Record<string, string>;
  outputGroupDetails?: Array<{
    type?: string;
    outputDetails?: Array<{
      outputFilePaths?: string[];
      durationInMs?: number;
    }>;
  }>;
  errorMessage?: string;
}

/**
 * Extracts the S3 key from an S3 URI: s3://bucket-name/some/key → some/key
 */
function s3UriToKey(s3Uri: string): string {
  const withoutScheme = s3Uri.replace(/^s3:\/\/[^/]+\//, '');
  return withoutScheme;
}

async function cleanupRejectedVideoArtifacts(momentId: string, rawS3Key: string, hlsKey: string): Promise<void> {
  const hlsPrefixSeparatorIndex = hlsKey.lastIndexOf('/');
  const cleanupTasks: Array<{ target: string; run: () => Promise<unknown> }> = [];

  if (hlsPrefixSeparatorIndex >= 0) {
    const hlsPrefix = hlsKey.slice(0, hlsPrefixSeparatorIndex + 1);
    cleanupTasks.push({ target: 'HLS prefix', run: () => deleteS3Prefix(hlsPrefix) });
  } else {
    logger.warn('Skipping HLS prefix cleanup because manifest key has no path separator', {
      momentId,
      hlsKey,
    });
  }

  cleanupTasks.push({ target: 'raw upload', run: () => deleteFromS3(rawS3Key) });

  const results = await Promise.allSettled(cleanupTasks.map((task) => task.run()));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn('Failed to clean up rejected video artifact - not critical', {
        momentId,
        target: cleanupTasks[index].target,
        err: result.reason,
      });
    }
  });
}

export const onTranscodeEventHandler = async (
  event: EventBridgeEvent<'MediaConvert Job State Change', MediaConvertEventDetail>,
): Promise<void> => {
  const detail = event.detail;
  const rawS3Key = detail.userMetadata?.rawS3Key;
  const metadataMomentId = detail.userMetadata?.momentId;

  if (!rawS3Key) {
    logger.error('No rawS3Key in userMetadata — cannot identify moment', { metadataMomentId, detail });
    return;
  }

  if (!MEDIA_CDN_DOMAIN) {
    throw new Error('MEDIA_CDN_DOMAIN env var is required');
  }

  await ensureDbConnected();

  const moment = await EventMomentDAO.findByRawS3Key(rawS3Key);
  if (!moment) {
    const message = 'No moment found for rawS3Key - retrying transcode completion later';
    logger.error(message, { rawS3Key, metadataMomentId });
    throw new Error(`${message}: ${rawS3Key}`);
  }

  const { momentId } = moment;
  logger.info('Processing transcode event', { momentId, rawS3Key, status: detail.status });

  if (detail.status === 'COMPLETE') {
    // Find the HLS output group and extract the manifest path + duration.
    const hlsGroup = detail.outputGroupDetails?.find(
      (g) => g.type === 'HLS_GROUP' || (g.outputDetails && g.outputDetails.length > 0),
    );

    const outputDetail = hlsGroup?.outputDetails?.[0];
    const manifestS3Uri = outputDetail?.outputFilePaths?.find((p) => p.endsWith('.m3u8'));
    const durationMs = outputDetail?.durationInMs;

    if (!manifestS3Uri) {
      logger.error('No HLS manifest found in MediaConvert output', { momentId, rawS3Key });
      await EventMomentDAO.markFailed(momentId);
      return;
    }

    const hlsKey = s3UriToKey(manifestS3Uri);
    const hlsUrl = buildMediaCdnUrl(MEDIA_CDN_DOMAIN, hlsKey);
    const hasValidDuration = typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 0;

    if (!hasValidDuration) {
      logger.error('No valid duration found in MediaConvert output - marking moment Failed and cleaning up', {
        momentId,
        rawS3Key,
      });
      await EventMomentDAO.markFailed(momentId);
      await cleanupRejectedVideoArtifacts(momentId, rawS3Key, hlsKey);
      return;
    }

    const durationSeconds = Math.round(durationMs / 1000);

    // Enforce the 30-second duration limit server-side.
    if (durationMs > MAX_EVENT_MOMENT_VIDEO_DURATION_MS) {
      logger.warn('Video exceeds maximum duration — marking moment Failed and cleaning up', {
        momentId,
        rawS3Key,
        durationSeconds,
        maxSeconds: MAX_EVENT_MOMENT_VIDEO_DURATION_MS / 1000,
      });
      await EventMomentDAO.markFailed(momentId);
      await cleanupRejectedVideoArtifacts(momentId, rawS3Key, hlsKey);
      return;
    }

    logger.info('Marking moment as Ready', { momentId, rawS3Key, hlsUrl, durationSeconds });

    // thumbnailUrl is already set on the moment from the client upload — do not overwrite it.
    await EventMomentDAO.markReady(momentId, hlsUrl, undefined, durationSeconds);

    // Delete the original raw upload — the HLS rendition(s) are the canonical source.
    // Use a non-throwing delete so a storage failure doesn't roll back the Ready state.
    try {
      await deleteFromS3(rawS3Key);
      logger.info('Deleted original upload after transcoding', { momentId, rawS3Key });
    } catch (err) {
      logger.warn('Failed to delete original upload — not critical', { momentId, rawS3Key, err });
    }
  } else if (detail.status === 'ERROR') {
    logger.error('MediaConvert job failed', { momentId, rawS3Key, errorMessage: detail.errorMessage ?? 'unknown' });
    await EventMomentDAO.markFailed(momentId);
  } else {
    logger.info('Ignoring non-terminal MediaConvert status', { momentId, status: detail.status });
  }
};
