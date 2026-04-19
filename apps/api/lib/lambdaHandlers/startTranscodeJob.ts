import type { EventBridgeEvent } from 'aws-lambda';
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { logger } from '@/utils/logger';

interface S3ObjectCreatedDetail {
  bucket: { name: string };
  object: { key: string; size: number };
}

const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const MEDIA_CONVERT_QUEUE_ARN = process.env.MEDIA_CONVERT_QUEUE_ARN || '';
const MEDIA_CONVERT_ROLE_ARN = process.env.MEDIA_CONVERT_ROLE_ARN || '';

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv']);

let mediaConvertClient: MediaConvertClient | undefined;

function getMediaConvertClient(): MediaConvertClient {
  if (!mediaConvertClient) {
    mediaConvertClient = new MediaConvertClient({ region: AWS_REGION });
  }
  return mediaConvertClient;
}

/**
 * Derives the HLS output destination prefix from the raw S3 object key.
 *
 * Raw key:  beta/event-moments/{eventId}/{username}/{uuid}.mp4
 * HLS dest: beta/event-moments/{eventId}/{username}/hls/
 *
 * MediaConvert then appends the source filename stem + NameModifier:
 *   {uuid}_720p.m3u8, {uuid}_720p_00001.ts, etc.
 * Placing HLS in a sibling hls/ folder (not a subfolder named after the UUID)
 * means the UUID appears only once in the final manifest path.
 *
 * The key from EventBridge is URL-encoded (spaces as +, special chars percent-encoded).
 * Only called after the video-extension check, so the key always has a slash.
 */
function hlsOutputPrefix(rawKey: string): string {
  return `${rawKey.slice(0, rawKey.lastIndexOf('/'))}/hls/`;
}

export const startTranscodeJobHandler = async (
  event: EventBridgeEvent<'Object Created', S3ObjectCreatedDetail>,
): Promise<void> => {
  const client = getMediaConvertClient();

  // EventBridge S3 Object Created events are per-object — no Records array.
  // The key is URL-encoded (spaces as +, special chars as %XX), same as direct S3 notifications.
  const rawKey = decodeURIComponent(event.detail.object.key.replace(/\+/g, ' '));

  // Only process recognised video formats — skip image uploads silently.
  const ext = rawKey.split('.').pop()?.toLowerCase() ?? '';
  if (!VIDEO_EXTENSIONS.has(ext)) {
    logger.debug('Skipping non-video key', { rawKey });
    return;
  }

  const hlsPrefix = hlsOutputPrefix(rawKey);

  logger.info('Submitting MediaConvert job', { rawKey, hlsPrefix });

  await client.send(
    new CreateJobCommand({
      Queue: MEDIA_CONVERT_QUEUE_ARN,
      Role: MEDIA_CONVERT_ROLE_ARN,
      // Pass the raw S3 key as job metadata so the completion handler can look up the moment.
      UserMetadata: { rawS3Key: rawKey },
      Settings: {
        Inputs: [
          {
            FileInput: `s3://${S3_BUCKET_NAME}/${rawKey}`,
            AudioSelectors: {
              'Audio Selector 1': {
                DefaultSelection: 'DEFAULT',
              },
            },
            VideoSelector: {},
          },
        ],
        OutputGroups: [
          {
            Name: 'HLS Group',
            OutputGroupSettings: {
              Type: 'HLS_GROUP_SETTINGS',
              HlsGroupSettings: {
                Destination: `s3://${S3_BUCKET_NAME}/${hlsPrefix}`,
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
                  Width: 1280,
                  Height: 720,
                  ScalingBehavior: 'DEFAULT',
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      Bitrate: 2500000,
                      RateControlMode: 'CBR',
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      NumberBFramesBetweenReferenceFrames: 2,
                      EntropyEncoding: 'CABAC',
                      QualityTuningLevel: 'SINGLE_PASS',
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
