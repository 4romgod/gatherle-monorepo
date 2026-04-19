const mockSend = jest.fn();

jest.mock('@aws-sdk/client-mediaconvert', () => ({
  MediaConvertClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  CreateJobCommand: jest.fn().mockImplementation((input: unknown) => ({ input, _cmd: 'CreateJob' })),
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
import { logger } from '@/utils/logger';
import { startTranscodeJobHandler } from '@/lambdaHandlers/startTranscodeJob';

type S3ObjectCreatedDetail = { bucket: { name: string }; object: { key: string; size: number } };
type S3ObjectCreatedEvent = EventBridgeEvent<'Object Created', S3ObjectCreatedDetail>;

function makeEvent(key: string): S3ObjectCreatedEvent {
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
      object: { key, size: 1000 },
    },
  };
}

describe('startTranscodeJobHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  describe('file type filtering', () => {
    it('skips non-video files and logs at debug level', async () => {
      await startTranscodeJobHandler(makeEvent('beta/event-moments/evt/thumb.jpg'));

      expect(CreateJobCommand).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Skipping unsupported transcode key',
        expect.objectContaining({ rawKey: 'beta/event-moments/evt/thumb.jpg' }),
      );
    });

    it('skips video files outside the event-moments area', async () => {
      await startTranscodeJobHandler(makeEvent('beta/gallery/event-456/gallery-uuid.mp4'));

      expect(CreateJobCommand).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
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
                    Destination: expect.stringContaining('event-moments/evt/hls/'),
                  }),
                }),
              }),
            ],
          }),
        }),
      );
    });

    it('stores the raw S3 key in UserMetadata for the completion handler', () => {
      expect(CreateJobCommand).toHaveBeenCalledWith(expect.objectContaining({ UserMetadata: { rawS3Key: key } }));
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
          UserMetadata: { rawS3Key: 'beta/event-moments/evt/my video file.mp4' },
        }),
      );
    });

    it('decodes percent-encoded characters', async () => {
      await startTranscodeJobHandler(makeEvent('beta/event-moments/evt/my%20clip.mp4'));

      expect(CreateJobCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          UserMetadata: { rawS3Key: 'beta/event-moments/evt/my clip.mp4' },
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
});
