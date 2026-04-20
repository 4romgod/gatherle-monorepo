import 'reflect-metadata';
import type { EventBridgeEvent } from 'aws-lambda';
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { MongoDbClient, getConfigValue } from '@/clients';
import { deleteFromS3 } from '@/clients/AWS/s3Client';
import {
  MEDIA_CDN_DOMAIN,
  SECRET_KEYS,
  EVENT_MOMENTS_S3_PREFIX,
  EVENT_MOMENT_VIDEO_EXTENSIONS,
  MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES,
} from '@/constants';
import { EventMomentDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';

interface S3ObjectCreatedDetail {
  bucket: { name: string };
  object: { key: string; size: number };
}

function getRequiredEnvVar(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    const message = `Missing required environment variable: ${name}`;
    logger.error(message, { envVar: name });
    throw new Error(message);
  }
  return value;
}

const AWS_REGION = getRequiredEnvVar('AWS_REGION');
const MEDIA_CONVERT_QUEUE_ARN = getRequiredEnvVar('MEDIA_CONVERT_QUEUE_ARN');
const MEDIA_CONVERT_ROLE_ARN = getRequiredEnvVar('MEDIA_CONVERT_ROLE_ARN');

let mediaConvertClient: MediaConvertClient | undefined;
let isDbConnected = false;

function getMediaConvertClient(): MediaConvertClient {
  if (!mediaConvertClient) {
    mediaConvertClient = new MediaConvertClient({ region: AWS_REGION });
  }
  return mediaConvertClient;
}

function isEventMomentKey(rawKey: string): boolean {
  return rawKey.startsWith(`${EVENT_MOMENTS_S3_PREFIX}/`) || rawKey.includes(`/${EVENT_MOMENTS_S3_PREFIX}/`);
}

async function ensureDbConnected(): Promise<void> {
  if (!isDbConnected) {
    const mongoUrl = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
    await MongoDbClient.connectToDatabase(mongoUrl);
    isDbConnected = true;
  }
}

async function markUploadedMomentFailed(rawKey: string): Promise<void> {
  if (!MEDIA_CDN_DOMAIN) {
    logger.warn('Skipping oversized moment failure update because MEDIA_CDN_DOMAIN is not configured', { rawKey });
    return;
  }

  await ensureDbConnected();

  const rawMediaUrl = `https://${MEDIA_CDN_DOMAIN}/${rawKey}`;
  const moment = await EventMomentDAO.findByMediaUrl(rawMediaUrl);
  if (!moment) {
    logger.warn('No existing moment found for rejected video upload', { rawMediaUrl });
    return;
  }

  await EventMomentDAO.markFailed(moment.momentId);
  logger.info('Marked rejected video moment as Failed', { momentId: moment.momentId, rawKey });
}

function keyWithoutExtension(rawKey: string): string {
  const lastSlashIndex = rawKey.lastIndexOf('/');
  const lastDotIndex = rawKey.lastIndexOf('.');
  if (lastDotIndex > lastSlashIndex) {
    return rawKey.slice(0, lastDotIndex);
  }
  return rawKey;
}

/**
 * Derives the HLS output destination prefix from the raw S3 object key.
 *
 * Raw key:  beta/event-moments/{event-slug}/{username}/{shortId}.mp4
 * HLS dest: beta/event-moments/{event-slug}/{username}/{shortId}/hls/
 *
 * MediaConvert then appends the source filename stem + NameModifier:
 *   {uuid}_720p.m3u8, {uuid}_720p_00001.ts, etc.
 * Keeping each upload's HLS output under its own prefix lets cleanup remove
 * rejected outputs without deleting other moments for the same event/user.
 *
 * The key from EventBridge is URL-encoded (spaces as +, special chars percent-encoded).
 * Only called after the video-extension check, so the key always has a slash.
 */
function hlsOutputPrefix(rawKey: string): string {
  return `${keyWithoutExtension(rawKey)}/hls/`;
}

export const startTranscodeJobHandler = async (
  event: EventBridgeEvent<'Object Created', S3ObjectCreatedDetail>,
): Promise<void> => {
  // The key is URL-encoded (spaces as +, special chars as %XX), same as direct S3 notifications.
  const rawKey = decodeURIComponent(event.detail.object.key.replace(/\+/g, ' '));
  const bucketName = event.detail.bucket.name;

  const ext = rawKey.split('.').pop()?.toLowerCase() ?? '';
  if (!EVENT_MOMENT_VIDEO_EXTENSIONS.has(ext) || !isEventMomentKey(rawKey)) {
    logger.warn('Skipping unsupported transcode key', { rawKey });
    return;
  }

  const fileSize = event.detail.object.size;
  const hasVerifiedSize = Number.isFinite(fileSize) && fileSize >= 0;
  if (!hasVerifiedSize || fileSize > MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES) {
    logger.warn('Rejecting video upload before transcode and deleting raw file', {
      rawKey,
      fileSize,
      reason: hasVerifiedSize ? 'over-size-limit' : 'unverified-size',
      maxBytes: MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES,
    });
    let failureUpdateError: unknown;
    try {
      await markUploadedMomentFailed(rawKey);
    } catch (err) {
      failureUpdateError = err;
      logger.error('Failed to mark rejected video moment as Failed', { rawKey, err });
    }
    try {
      await deleteFromS3(rawKey);
    } catch (err) {
      logger.warn('Failed to delete oversized raw upload — not critical', { rawKey, err });
    }
    if (failureUpdateError) {
      throw failureUpdateError;
    }
    return;
  }

  const client = getMediaConvertClient();
  const hlsPrefix = hlsOutputPrefix(rawKey);

  logger.info('Submitting MediaConvert job', { rawKey, hlsPrefix, bucketName });

  await client.send(
    new CreateJobCommand({
      Queue: MEDIA_CONVERT_QUEUE_ARN,
      Role: MEDIA_CONVERT_ROLE_ARN,
      UserMetadata: { rawS3Key: rawKey },
      Settings: {
        Inputs: [
          {
            FileInput: `s3://${bucketName}/${rawKey}`,
            AudioSelectors: {
              'Audio Selector 1': {
                DefaultSelection: 'DEFAULT',
              },
            },
            VideoSelector: {
              Rotate: 'AUTO',
            },
          },
        ],
        OutputGroups: [
          {
            Name: 'HLS Group',
            OutputGroupSettings: {
              Type: 'HLS_GROUP_SETTINGS',
              HlsGroupSettings: {
                Destination: `s3://${bucketName}/${hlsPrefix}`,
                SegmentLength: 2,
                MinSegmentLength: 0,
                ManifestDurationFormat: 'INTEGER',
                OutputSelection: 'MANIFESTS_AND_SEGMENTS',
              },
            },
            Outputs: [
              {
                NameModifier: '_720p',
                VideoDescription: {
                  // No Width/Height — MediaConvert preserves the source dimensions and
                  // orientation (portrait stays portrait, landscape stays landscape).
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      RateControlMode: 'QVBR',
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                      },
                      MaxBitrate: 5000000,
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      NumberBFramesBetweenReferenceFrames: 2,
                      EntropyEncoding: 'CABAC',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      FlickerAdaptiveQuantization: 'ENABLED',
                      AdaptiveQuantization: 'HIGH',
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        Bitrate: 128000,
                        CodingMode: 'CODING_MODE_2_0',
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {},
                },
              },
            ],
          },
        ],
      },
    }),
  );

  logger.info('MediaConvert job submitted', { rawKey });
};
