jest.mock('reflect-metadata', () => ({}));

jest.mock('@/clients', () => ({
  MongoDbClient: { connectToDatabase: jest.fn().mockResolvedValue(undefined) },
  getConfigValue: jest.fn().mockResolvedValue('mongodb://test'),
}));

jest.mock('@/constants', () => ({
  SECRET_KEYS: { MONGO_DB_URL: 'MONGO_DB_URL' },
  MAX_EVENT_MOMENT_VIDEO_DURATION_MS: 30 * 1000,
}));

jest.mock('@/mongodb/dao', () => ({
  EventMomentDAO: {
    findByRawS3Key: jest.fn().mockResolvedValue(null),
    markReady: jest.fn().mockResolvedValue(null),
    markFailed: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/clients/AWS/s3Client', () => ({
  deleteFromS3: jest.fn().mockResolvedValue(undefined),
  deleteS3Prefix: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import type { EventBridgeEvent } from 'aws-lambda';

interface MediaConvertEventDetail {
  status: string;
  userMetadata?: Record<string, string>;
  outputGroupDetails?: Array<{
    type?: string;
    outputDetails?: Array<{ outputFilePaths?: string[]; durationInMs?: number }>;
  }>;
  errorMessage?: string;
}

function makeEvent(
  status: string,
  overrides: Partial<MediaConvertEventDetail> = {},
): EventBridgeEvent<'MediaConvert Job State Change', MediaConvertEventDetail> {
  return {
    version: '0',
    id: 'test-id',
    source: 'aws.mediaconvert',
    account: '123456789012',
    time: '2024-01-01T00:00:00Z',
    region: 'eu-west-1',
    resources: [],
    'detail-type': 'MediaConvert Job State Change',
    detail: {
      status,
      userMetadata: { rawS3Key: 'beta/event-moments/evt/clip.mp4' },
      outputGroupDetails: [
        {
          type: 'HLS_GROUP',
          outputDetails: [
            {
              outputFilePaths: ['s3://bucket/beta/event-moments/evt/clip/hls/index.m3u8'],
              durationInMs: 15000,
            },
          ],
        },
      ],
      ...overrides,
    },
  };
}

async function loadAll() {
  const { onTranscodeEventHandler } = await import('@/lambdaHandlers/onTranscodeEvent');
  const { EventMomentDAO } = await import('@/mongodb/dao');
  const { MongoDbClient, getConfigValue } = await import('@/clients');
  const { logger } = await import('@/utils/logger');
  const { deleteFromS3, deleteS3Prefix } = await import('@/clients/AWS/s3Client');
  return {
    handler: onTranscodeEventHandler,
    EventMomentDAO,
    MongoDbClient,
    getConfigValue,
    logger,
    deleteFromS3,
    deleteS3Prefix,
  };
}

describe('onTranscodeEventHandler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.MEDIA_CDN_DOMAIN = 'cdn.example.com';
  });

  afterEach(() => {
    delete process.env.MEDIA_CDN_DOMAIN;
  });

  describe('input validation', () => {
    it('logs an error and returns early when rawS3Key is missing from userMetadata', async () => {
      const { handler, EventMomentDAO, logger } = await loadAll();

      await handler(makeEvent('COMPLETE', { userMetadata: {} }));

      expect(EventMomentDAO.findByRawS3Key).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'No rawS3Key in userMetadata — cannot identify moment',
        expect.anything(),
      );
    });

    it('throws when MEDIA_CDN_DOMAIN is not set', async () => {
      delete process.env.MEDIA_CDN_DOMAIN;
      const { handler } = await loadAll();

      await expect(handler(makeEvent('COMPLETE'))).rejects.toThrow('MEDIA_CDN_DOMAIN env var is required');
    });

    it('throws when no moment matches the raw S3 key so EventBridge can retry', async () => {
      const { handler, EventMomentDAO, logger } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue(null);

      await expect(handler(makeEvent('COMPLETE'))).rejects.toThrow('No moment found for rawS3Key');

      expect(EventMomentDAO.markReady).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'No moment found for rawS3Key - retrying transcode completion later',
        expect.objectContaining({ rawS3Key: 'beta/event-moments/evt/clip.mp4' }),
      );
    });

    it('looks up the moment by rawS3Key', async () => {
      const { handler, EventMomentDAO } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-by-key' });

      await handler(makeEvent('COMPLETE'));

      expect(EventMomentDAO.findByRawS3Key).toHaveBeenCalledWith('beta/event-moments/evt/clip.mp4');
      expect(EventMomentDAO.markReady).toHaveBeenCalledWith(
        'moment-by-key',
        'https://cdn.example.com/beta/event-moments/evt/clip/hls/index.m3u8',
        undefined,
        15,
      );
    });
  });

  describe('database connection', () => {
    it('connects to MongoDB on the first invocation', async () => {
      const { handler, EventMomentDAO, MongoDbClient, getConfigValue } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-1' });

      await handler(makeEvent('COMPLETE'));

      expect(getConfigValue).toHaveBeenCalledWith('MONGO_DB_URL');
      expect(MongoDbClient.connectToDatabase).toHaveBeenCalledWith('mongodb://test');
    });

    it('does not reconnect on subsequent invocations', async () => {
      const { handler, EventMomentDAO, MongoDbClient } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-1' });

      await handler(makeEvent('COMPLETE'));
      await handler(makeEvent('COMPLETE'));

      expect(MongoDbClient.connectToDatabase).toHaveBeenCalledTimes(1);
    });
  });

  describe('COMPLETE status', () => {
    it('calls markReady with the HLS URL and rounded duration in seconds', async () => {
      const { handler, EventMomentDAO } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(makeEvent('COMPLETE'));

      expect(EventMomentDAO.markReady).toHaveBeenCalledWith(
        'moment-1',
        'https://cdn.example.com/beta/event-moments/evt/clip/hls/index.m3u8',
        undefined,
        15,
      );
    });

    it('deletes the original raw upload from S3 after marking the moment as Ready', async () => {
      const { handler, EventMomentDAO, deleteFromS3 } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(makeEvent('COMPLETE'));

      expect(deleteFromS3).toHaveBeenCalledWith('beta/event-moments/evt/clip.mp4');
    });

    it('does not delete the original file when the delete call fails (non-throwing)', async () => {
      const { handler, EventMomentDAO, deleteFromS3, logger } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });
      (deleteFromS3 as jest.Mock).mockRejectedValueOnce(new Error('Access denied'));

      // Should not throw even though deleteFromS3 rejects
      await expect(handler(makeEvent('COMPLETE'))).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to delete original upload \u2014 not critical',
        expect.objectContaining({ rawS3Key: 'beta/event-moments/evt/clip.mp4' }),
      );
    });

    it('finds the HLS group by outputDetails when type is not HLS_GROUP', async () => {
      const { handler, EventMomentDAO } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(
        makeEvent('COMPLETE', {
          outputGroupDetails: [
            {
              // no type field — matched via outputDetails fallback
              outputDetails: [
                {
                  outputFilePaths: ['s3://bucket/beta/hls/index.m3u8'],
                  durationInMs: 5000,
                },
              ],
            },
          ],
        }),
      );

      expect(EventMomentDAO.markReady).toHaveBeenCalledWith(
        'moment-1',
        expect.stringContaining('index.m3u8'),
        undefined,
        5,
      );
    });

    it('calls markFailed and logs an error when no .m3u8 manifest is found in the output', async () => {
      const { handler, EventMomentDAO, logger } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(
        makeEvent('COMPLETE', {
          outputGroupDetails: [
            {
              type: 'HLS_GROUP',
              outputDetails: [{ outputFilePaths: ['s3://bucket/hls/segment.ts'] }],
            },
          ],
        }),
      );

      expect(EventMomentDAO.markFailed).toHaveBeenCalledWith('moment-1');
      expect(logger.error).toHaveBeenCalledWith(
        'No HLS manifest found in MediaConvert output',
        expect.objectContaining({ momentId: 'moment-1' }),
      );
    });

    it('calls markFailed when outputGroupDetails is absent', async () => {
      const { handler, EventMomentDAO } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(makeEvent('COMPLETE', { outputGroupDetails: undefined }));

      expect(EventMomentDAO.markFailed).toHaveBeenCalledWith('moment-1');
    });

    it('marks Failed and cleans up when durationInMs is absent', async () => {
      const { handler, EventMomentDAO, deleteFromS3, deleteS3Prefix, logger } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(
        makeEvent('COMPLETE', {
          outputGroupDetails: [
            {
              type: 'HLS_GROUP',
              outputDetails: [
                {
                  outputFilePaths: ['s3://bucket/beta/event-moments/evt/clip/hls/index.m3u8'],
                  // no durationInMs
                },
              ],
            },
          ],
        }),
      );

      expect(EventMomentDAO.markFailed).toHaveBeenCalledWith('moment-1');
      expect(EventMomentDAO.markReady).not.toHaveBeenCalled();
      expect(deleteS3Prefix).toHaveBeenCalledWith('beta/event-moments/evt/clip/hls/');
      expect(deleteFromS3).toHaveBeenCalledWith('beta/event-moments/evt/clip.mp4');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('No valid duration found in MediaConvert output'),
        expect.objectContaining({ momentId: 'moment-1' }),
      );
    });

    describe('duration limit enforcement', () => {
      function makeOverDurationEvent(durationInMs: number) {
        return makeEvent('COMPLETE', {
          outputGroupDetails: [
            {
              type: 'HLS_GROUP',
              outputDetails: [
                {
                  outputFilePaths: ['s3://bucket/beta/event-moments/evt/clip/hls/index.m3u8'],
                  durationInMs,
                },
              ],
            },
          ],
        });
      }

      it('marks the moment Failed when duration exceeds 30 seconds', async () => {
        const { handler, EventMomentDAO } = await loadAll();
        (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-over' });

        await handler(makeOverDurationEvent(30001));

        expect(EventMomentDAO.markFailed).toHaveBeenCalledWith('m-over');
        expect(EventMomentDAO.markReady).not.toHaveBeenCalled();
      });

      it('logs a warning when the video exceeds the duration limit', async () => {
        const { handler, EventMomentDAO, logger } = await loadAll();
        (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-over' });

        await handler(makeOverDurationEvent(60000));

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Video exceeds maximum duration'),
          expect.objectContaining({ momentId: 'm-over', durationSeconds: 60 }),
        );
      });

      it('deletes the HLS prefix and raw upload when over the duration limit', async () => {
        const { handler, EventMomentDAO, deleteFromS3, deleteS3Prefix } = await loadAll();
        (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-over' });

        await handler(makeOverDurationEvent(31000));

        expect(deleteS3Prefix).toHaveBeenCalledWith('beta/event-moments/evt/clip/hls/');
        expect(deleteFromS3).toHaveBeenCalledWith('beta/event-moments/evt/clip.mp4');
      });

      it('allows a video of exactly 30 seconds through (at the limit)', async () => {
        const { handler, EventMomentDAO } = await loadAll();
        (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-exact' });

        await handler(makeOverDurationEvent(30000));

        expect(EventMomentDAO.markReady).toHaveBeenCalledWith('m-exact', expect.any(String), undefined, 30);
        expect(EventMomentDAO.markFailed).not.toHaveBeenCalled();
      });

      it('allows a video under 30 seconds through', async () => {
        const { handler, EventMomentDAO } = await loadAll();
        (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-short' });

        await handler(makeEvent('COMPLETE')); // default 15000ms in makeEvent

        expect(EventMomentDAO.markReady).toHaveBeenCalled();
        expect(EventMomentDAO.markFailed).not.toHaveBeenCalled();
      });

      it('does not throw when cleanup fails after over-limit detection', async () => {
        const { handler, EventMomentDAO, deleteFromS3, deleteS3Prefix, logger } = await loadAll();
        (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'm-over' });
        (deleteS3Prefix as jest.Mock).mockRejectedValueOnce(new Error('S3 error'));

        await expect(handler(makeOverDurationEvent(60000))).resolves.toBeUndefined();
        expect(deleteFromS3).toHaveBeenCalledWith('beta/event-moments/evt/clip.mp4');
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to clean up rejected video artifact'),
          expect.objectContaining({ momentId: 'm-over', target: 'HLS prefix' }),
        );
      });
    });
  });

  describe('ERROR status', () => {
    it('calls markFailed and logs an error with the MediaConvert error message', async () => {
      const { handler, EventMomentDAO, logger } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(makeEvent('ERROR', { errorMessage: 'Unsupported codec' }));

      expect(EventMomentDAO.markFailed).toHaveBeenCalledWith('moment-1');
      expect(logger.error).toHaveBeenCalledWith(
        'MediaConvert job failed',
        expect.objectContaining({ momentId: 'moment-1', errorMessage: 'Unsupported codec' }),
      );
    });

    it('does not delete the original S3 file on ERROR', async () => {
      const { handler, EventMomentDAO, deleteFromS3 } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(makeEvent('ERROR', { errorMessage: 'Unsupported codec' }));

      expect(deleteFromS3).not.toHaveBeenCalled();
    });

    it('falls back to "unknown" when errorMessage is absent', async () => {
      const { handler, EventMomentDAO, logger } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(makeEvent('ERROR', { errorMessage: undefined }));

      expect(logger.error).toHaveBeenCalledWith(
        'MediaConvert job failed',
        expect.objectContaining({ errorMessage: 'unknown' }),
      );
    });
  });

  describe('other statuses', () => {
    it('logs info and takes no DAO action for non-terminal statuses', async () => {
      const { handler, EventMomentDAO, logger } = await loadAll();
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue({ momentId: 'moment-1' });

      await handler(makeEvent('PROGRESSING'));

      expect(EventMomentDAO.markReady).not.toHaveBeenCalled();
      expect(EventMomentDAO.markFailed).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Ignoring non-terminal MediaConvert status',
        expect.objectContaining({ momentId: 'moment-1', status: 'PROGRESSING' }),
      );
    });
  });
});
