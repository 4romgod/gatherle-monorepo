import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => ({ ...input, _cmd: 'PutObject' })),
  DeleteObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => ({
    ...input,
    _cmd: 'DeleteObject',
  })),
  GetObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => ({
    ...input,
    _cmd: 'GetObject',
  })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('@/constants', () => ({
  AWS_REGION: 'us-east-1',
  S3_BUCKET_NAME: 'test-bucket',
  MEDIA_CDN_DOMAIN: 'd111111abcdef8.cloudfront.net',
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  getPresignedUploadUrl,
  getKeyFromPublicUrl,
} from '@/clients/AWS/s3Client';

const mockGetSignedUrl = getSignedUrl as jest.Mock;

describe('s3Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadToS3', () => {
    it('sends PutObjectCommand and returns the public URL', async () => {
      mockSend.mockResolvedValue({});

      const result = await uploadToS3('media/test.jpg', Buffer.from('data'), 'image/jpeg');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'media/test.jpg',
        Body: Buffer.from('data'),
        ContentType: 'image/jpeg',
      });
      expect(mockSend).toHaveBeenCalled();
      expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/media/test.jpg');
    });

    it('re-throws when client send fails', async () => {
      mockSend.mockRejectedValue(new Error('network error'));

      await expect(uploadToS3('key', Buffer.from('x'), 'text/plain')).rejects.toThrow('network error');
    });
  });

  describe('deleteFromS3', () => {
    it('sends DeleteObjectCommand', async () => {
      mockSend.mockResolvedValue({});

      await deleteFromS3('media/test.jpg');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'media/test.jpg',
      });
      expect(mockSend).toHaveBeenCalled();
    });

    it('re-throws when client send fails', async () => {
      mockSend.mockRejectedValue(new Error('delete error'));

      await expect(deleteFromS3('key')).rejects.toThrow('delete error');
    });
  });

  describe('getPresignedUrl', () => {
    it('calls getSignedUrl with GetObjectCommand and default expiresIn of 3600', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com/key?token=abc');

      const url = await getPresignedUrl('media/test.jpg');

      expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'test-bucket', Key: 'media/test.jpg' });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 3600 });
      expect(url).toBe('https://signed-url.example.com/key?token=abc');
    });

    it('passes a custom expiresIn value', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com/key?token=abc');

      await getPresignedUrl('media/test.jpg', 7200);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 7200 });
    });

    it('re-throws when getSignedUrl fails', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('signing error'));

      await expect(getPresignedUrl('key')).rejects.toThrow('signing error');
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('calls getSignedUrl with PutObjectCommand and default expiresIn of 3600', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-upload.example.com/key?token=xyz');

      const url = await getPresignedUploadUrl('uploads/file.pdf', 'application/pdf');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'uploads/file.pdf',
        ContentType: 'application/pdf',
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 3600 });
      expect(url).toBe('https://signed-upload.example.com/key?token=xyz');
    });

    it('passes a custom expiresIn value', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-upload.example.com/key?token=xyz');

      await getPresignedUploadUrl('uploads/file.pdf', 'application/pdf', 1800);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 1800 });
    });

    it('re-throws when getSignedUrl fails', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('upload signing error'));

      await expect(getPresignedUploadUrl('key', 'text/plain')).rejects.toThrow('upload signing error');
    });
  });

  describe('getKeyFromPublicUrl', () => {
    it('extracts key from the configured CloudFront URL', () => {
      expect(getKeyFromPublicUrl('https://d111111abcdef8.cloudfront.net/media/photo.jpg')).toBe('media/photo.jpg');
    });

    it('extracts key from regional URL (bucket.s3.region.amazonaws.com)', () => {
      expect(getKeyFromPublicUrl('https://test-bucket.s3.us-east-1.amazonaws.com/media/photo.jpg')).toBe(
        'media/photo.jpg',
      );
    });

    it('extracts key from global URL (bucket.s3.amazonaws.com)', () => {
      expect(getKeyFromPublicUrl('https://test-bucket.s3.amazonaws.com/media/photo.jpg')).toBe('media/photo.jpg');
    });

    it('extracts key from regional-alt URL (s3.region.amazonaws.com/bucket/key)', () => {
      expect(getKeyFromPublicUrl('https://s3.us-east-1.amazonaws.com/test-bucket/media/photo.jpg')).toBe(
        'media/photo.jpg',
      );
    });

    it('returns null for an unrecognised hostname', () => {
      expect(getKeyFromPublicUrl('https://example.com/media/photo.jpg')).toBeNull();
    });

    it('returns null for an invalid URL string', () => {
      expect(getKeyFromPublicUrl('not-a-valid-url')).toBeNull();
    });
  });

  describe('when S3_BUCKET_NAME is not configured', () => {
    let unconfiguredModule: any;

    beforeAll(() => {
      jest.resetModules();
      jest.doMock('@/constants', () => ({ AWS_REGION: 'us-east-1', S3_BUCKET_NAME: '', MEDIA_CDN_DOMAIN: '' }));
      jest.doMock('@aws-sdk/client-s3', () => ({
        S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
        PutObjectCommand: jest.fn(),
        DeleteObjectCommand: jest.fn(),
        GetObjectCommand: jest.fn(),
      }));
      jest.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));
      jest.doMock('@/utils/logger', () => ({
        logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
      }));
      unconfiguredModule = require('@/clients/AWS/s3Client');
    });

    afterAll(() => {
      jest.resetModules();
    });

    it('uploadToS3 throws "S3_BUCKET_NAME is not configured"', async () => {
      await expect(unconfiguredModule.uploadToS3('k', Buffer.from(''), 'text/plain')).rejects.toThrow(
        'S3_BUCKET_NAME is not configured',
      );
    });

    it('deleteFromS3 throws "S3_BUCKET_NAME is not configured"', async () => {
      await expect(unconfiguredModule.deleteFromS3('k')).rejects.toThrow('S3_BUCKET_NAME is not configured');
    });

    it('getPresignedUrl throws "S3_BUCKET_NAME is not configured"', async () => {
      await expect(unconfiguredModule.getPresignedUrl('k')).rejects.toThrow('S3_BUCKET_NAME is not configured');
    });

    it('getPresignedUploadUrl throws "S3_BUCKET_NAME is not configured"', async () => {
      await expect(unconfiguredModule.getPresignedUploadUrl('k', 'text/plain')).rejects.toThrow(
        'S3_BUCKET_NAME is not configured',
      );
    });

    it('getKeyFromPublicUrl returns null', () => {
      expect(
        unconfiguredModule.getKeyFromPublicUrl('https://test-bucket.s3.us-east-1.amazonaws.com/media/photo.jpg'),
      ).toBeNull();
    });
  });
});
