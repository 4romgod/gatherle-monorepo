const mockSend = jest.fn();

jest.mock('@aws-sdk/client-mediaconvert', () => ({
  MediaConvertClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  CreateJobCommand: jest.fn().mockImplementation((input: unknown) => ({ input, _cmd: 'CreateJob' })),
}));

jest.mock('@/clients/AWS/s3Client', () => ({
  deleteFromS3: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/clients', () => ({
  MongoDbClient: { connectToDatabase: jest.fn().mockResolvedValue(undefined) },
  getConfigValue: jest.fn().mockResolvedValue('mongodb://test'),
}));

jest.mock('@/constants', () => ({
  SECRET_KEYS: { MONGO_DB_URL: 'MONGO_DB_URL' },
  EVENT_MOMENTS_S3_PREFIX: 'event-moments',
  EVENT_MOMENT_VIDEO_EXTENSIONS: new Set(['mp4', 'mov', 'webm', 'avi', 'mkv']),
  MAX_EVENT_MOMENT_VIDEO_SIZE_BYTES: 75 * 1024 * 1024,
}));

jest.mock('@/mongodb/dao', () => ({
  EventMomentDAO: {
    findByRawS3Key: jest.fn().mockResolvedValue(null),
    claimTranscodeStart: jest.fn().mockResolvedValue({ momentId: 'moment-claim' }),
    markFailed: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Set required env vars before the module is loaded so getRequiredEnvVar() does not throw.
process.env.MEDIA_CONVERT_QUEUE_ARN =
  process.env.MEDIA_CONVERT_QUEUE_ARN || 'arn:aws:mediaconvert:eu-west-1:123456789012:queues/test-queue';
process.env.MEDIA_CONVERT_ROLE_ARN = process.env.MEDIA_CONVERT_ROLE_ARN || 'arn:aws:iam::123456789012:role/test-role';

import type { EventBridgeEvent } from 'aws-lambda';
import { CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { deleteFromS3 } from '@/clients/AWS/s3Client';
import { EventMomentDAO } from '@/mongodb/dao';
import { logger } from '@/utils/logger';
import { startTranscodeJobHandler } from '@/lambdaHandlers/startTranscodeJob';

type S3ObjectCreatedDetail = { bucket: { name: string }; object: { key: string; size: number } };
type S3ObjectCreatedEvent = EventBridgeEvent<'Object Created', S3ObjectCreatedDetail>;

function makeEvent(key: string, size = 1000): S3ObjectCreatedEvent {
  return {
    version: '0',
    id: 'test-event-id',
    source: 'aws.s3',
    account: '123456789012',
    time: '2024-01-01T00:00:00Z',
    region: 'eu-west-1',
    resources: [],
    'detail-type': 'Object Created',
    detail: {
      bucket: { name: 'test-bucket' },
      object: { key, size },
    },
  };
}

describe('startTranscodeJobHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
    (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValue(null);
    (EventMomentDAO.claimTranscodeStart as jest.Mock).mockResolvedValue({ momentId: 'moment-claim' });
    (EventMomentDAO.markFailed as jest.Mock).mockResolvedValue(undefined);
    (deleteFromS3 as jest.Mock).mockResolvedValue(undefined);
  });

  describe('file type filtering', () => {
    it('skips non-video files and logs at warn level', async () => {
      await startTranscodeJobHandler(makeEvent('beta/event-moments/evt/thumb.jpg'));

      expect(CreateJobCommand).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Skipping unsupported transcode key',
        expect.objectContaining({ rawKey: 'beta/event-moments/evt/thumb.jpg' }),
      );
    });

    it('skips video files outside the event-moments area', async () => {
      await startTranscodeJobHandler(makeEvent('beta/gallery/event-456/gallery-uuid.mp4'));

      expect(CreateJobCommand).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Skipping unsupported transcode key',
        expect.objectContaining({ rawKey: 'beta/gallery/event-456/gallery-uuid.mp4' }),
      );
    });

    it.each(['mp4', 'mov', 'webm', 'avi', 'mkv'])('submits a job for .%s files', async (ext) => {
      await startTranscodeJobHandler(makeEvent(`beta/event-moments/evt/clip.${ext}`));

      expect(CreateJobCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe('CreateJob command shape', () => {
    const key = 'beta/event-moments/evt/momentmedia-uuid.mp4';

    beforeEach(async () => {
      await startTranscodeJobHandler(makeEvent(key));
    });

    it('sets FileInput to the S3 URI of the raw upload', () => {
      expect(CreateJobCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Settings: expect.objectContaining({
            Inputs: [expect.objectContaining({ FileInput: expect.stringContaining('momentmedia-uuid.mp4') })],
          }),
        }),
      );
    });

    it('sets HLS Destination to the key base with /hls/ suffix', () => {
      expect(CreateJobCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Settings: expect.objectContaining({
            OutputGroups: [
              expect.objectContaining({
                OutputGroupSettings: expect.objectContaining({
                  HlsGroupSettings: expect.objectContaining({
                    Destination: expect.stringContaining('event-moments/evt/momentmedia-uuid/hls/'),
                  }),
                }),
              }),
            ],
          }),
        }),
      );
    });

    it('stores the raw S3 key and momentId in UserMetadata for the completion handler', () => {
      expect(CreateJobCommand).toHaveBeenCalledWith(
        expect.objectContaining({ UserMetadata: { rawS3Key: key, momentId: 'moment-claim' } }),
      );
    });

    it('logs info before and after submitting', () => {
      expect(logger.info).toHaveBeenCalledWith('Submitting MediaConvert job', expect.objectContaining({ rawKey: key }));
      expect(logger.info).toHaveBeenCalledWith('MediaConvert job submitted', expect.objectContaining({ rawKey: key }));
    });
  });

  describe('URL-encoded key handling', () => {
    it('decodes + as space before passing the key to MediaConvert', async () => {
      await startTranscodeJobHandler(makeEvent('beta/event-moments/evt/my+video+file.mp4'));

      expect(CreateJobCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          UserMetadata: { rawS3Key: 'beta/event-moments/evt/my video file.mp4', momentId: 'moment-claim' },
        }),
      );
    });

    it('decodes percent-encoded characters', async () => {
      await startTranscodeJobHandler(makeEvent('beta/event-moments/evt/my%20clip.mp4'));

      expect(CreateJobCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          UserMetadata: { rawS3Key: 'beta/event-moments/evt/my clip.mp4', momentId: 'moment-claim' },
        }),
      );
    });
  });

  describe('multiple records', () => {
    it('submits a job for each video record and skips non-video records', async () => {
      await startTranscodeJobHandler(makeEvent('beta/event-moments/evt/clip.mp4'));
      await startTranscodeJobHandler(makeEvent('beta/event-moments/evt/clip.mov'));
      // non-video invocation is skipped
      await startTranscodeJobHandler(makeEvent('c/thumb.jpg'));

      expect(CreateJobCommand).toHaveBeenCalledTimes(2);
    });

    it('does nothing when the key is a non-video file', async () => {
      await startTranscodeJobHandler(makeEvent('a/photo.jpg'));

      expect(CreateJobCommand).not.toHaveBeenCalled();
    });
  });

  describe('transcode claim handling', () => {
    it('claims the upload by raw S3 key before submitting MediaConvert', async () => {
      const key = 'beta/event-moments/evt/clip.mp4';

      await startTranscodeJobHandler(makeEvent(key));

      expect(EventMomentDAO.claimTranscodeStart).toHaveBeenCalledWith(key);
      expect(CreateJobCommand).toHaveBeenCalledTimes(1);
    });

    it('skips MediaConvert when no UploadPending moment can be claimed', async () => {
      const key = 'beta/event-moments/evt/clip.mp4';
      (EventMomentDAO.claimTranscodeStart as jest.Mock).mockResolvedValueOnce(null);

      await startTranscodeJobHandler(makeEvent(key));

      expect(CreateJobCommand).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'No upload-pending video moment found for transcode key',
        expect.objectContaining({ rawKey: key }),
      );
    });

    it('marks the moment Failed and deletes the raw upload when MediaConvert submission fails', async () => {
      const submitError = new Error('MediaConvert down');
      mockSend.mockRejectedValueOnce(submitError);
      const key = 'beta/event-moments/evt/clip.mp4';

      await expect(startTranscodeJobHandler(makeEvent(key))).resolves.toBeUndefined();

      expect(EventMomentDAO.markFailed).toHaveBeenCalledWith('moment-claim');
      expect(deleteFromS3).toHaveBeenCalledWith(key);
      expect(logger.error).toHaveBeenCalledWith(
        'MediaConvert job submission failed - marking video moment Failed',
        expect.objectContaining({ momentId: 'moment-claim', rawKey: key, err: submitError }),
      );
    });

    it('rethrows when marking Failed after MediaConvert submission failure hits a DB error', async () => {
      const submitError = new Error('MediaConvert down');
      const dbError = new Error('DB unavailable');
      const key = 'beta/event-moments/evt/clip.mp4';
      mockSend.mockRejectedValueOnce(submitError);
      (EventMomentDAO.markFailed as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(startTranscodeJobHandler(makeEvent(key))).rejects.toThrow('DB unavailable');

      expect(deleteFromS3).toHaveBeenCalledWith(key);
    });
  });

  describe('client singleton', () => {
    it('reuses the same client across multiple invocations', async () => {
      // Reset modules to get a fresh mediaConvertClient = undefined, then confirm the
      // constructor is only called once even after two handler invocations.
      jest.resetModules();
      const { MediaConvertClient } = await import('@aws-sdk/client-mediaconvert');
      const { startTranscodeJobHandler: freshHandler } = await import('@/lambdaHandlers/startTranscodeJob');

      await freshHandler(makeEvent('beta/event-moments/evt/a.mp4'));
      await freshHandler(makeEvent('beta/event-moments/evt/b.mp4'));

      expect(MediaConvertClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('size limit enforcement', () => {
    const OVER_LIMIT = 75 * 1024 * 1024 + 1;
    const AT_LIMIT = 75 * 1024 * 1024;
    const validKey = 'beta/event-moments/evt/clip.mp4';

    it('skips the MediaConvert job when the file exceeds 75 MB', async () => {
      await startTranscodeJobHandler(makeEvent(validKey, OVER_LIMIT));

      expect(CreateJobCommand).not.toHaveBeenCalled();
    });

    it('deletes the raw upload when the file exceeds 75 MB', async () => {
      await startTranscodeJobHandler(makeEvent(validKey, OVER_LIMIT));

      expect(deleteFromS3).toHaveBeenCalledWith(validKey);
    });

    it('logs a warning when rejecting an oversized upload', async () => {
      await startTranscodeJobHandler(makeEvent(validKey, OVER_LIMIT));

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rejecting video upload before transcode'),
        expect.objectContaining({ rawKey: validKey, fileSize: OVER_LIMIT }),
      );
    });

    it('marks a matching reserved moment as Failed when the file exceeds 75 MB', async () => {
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockResolvedValueOnce({ momentId: 'moment-over' });

      await startTranscodeJobHandler(makeEvent(validKey, OVER_LIMIT));

      expect(EventMomentDAO.findByRawS3Key).toHaveBeenCalledWith(validKey);
      expect(EventMomentDAO.markFailed).toHaveBeenCalledWith('moment-over');
    });

    it('rejects and deletes a video when S3 does not provide a verifiable size', async () => {
      await startTranscodeJobHandler(makeEvent(validKey, Number.NaN));

      expect(CreateJobCommand).not.toHaveBeenCalled();
      expect(deleteFromS3).toHaveBeenCalledWith(validKey);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rejecting video upload before transcode'),
        expect.objectContaining({ reason: 'unverified-size' }),
      );
    });

    it('submits the job when the file is exactly at the 75 MB limit', async () => {
      await startTranscodeJobHandler(makeEvent(validKey, AT_LIMIT));

      expect(CreateJobCommand).toHaveBeenCalledTimes(1);
    });

    it('submits the job when the file is well under the 75 MB limit', async () => {
      await startTranscodeJobHandler(makeEvent(validKey, 1000));

      expect(CreateJobCommand).toHaveBeenCalledTimes(1);
    });

    it('does not throw when deleteFromS3 fails for an oversized file', async () => {
      (deleteFromS3 as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(startTranscodeJobHandler(makeEvent(validKey, OVER_LIMIT))).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete oversized raw upload'),
        expect.objectContaining({ rawKey: validKey }),
      );
    });

    it('still deletes the raw file and rethrows when marking the moment Failed hits a DB error', async () => {
      const dbError = new Error('DB unavailable');
      (EventMomentDAO.findByRawS3Key as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(startTranscodeJobHandler(makeEvent(validKey, OVER_LIMIT))).rejects.toThrow('DB unavailable');
      expect(deleteFromS3).toHaveBeenCalledWith(validKey);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to mark rejected video moment as Failed'),
        expect.objectContaining({ rawKey: validKey, err: dbError }),
      );
    });
  });
});
