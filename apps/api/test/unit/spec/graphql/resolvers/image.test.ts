import 'reflect-metadata';
import { ImageResolver } from '@/graphql/resolvers/image';
import { ImageEntityType, ImageType } from '@gatherle/commons/types';
import * as s3Client from '@/clients/AWS/s3Client';
import * as authUtils from '@/utils';

jest.mock('@/clients/AWS/s3Client', () => ({
  getPresignedUploadUrl: jest.fn(),
}));

jest.mock('@/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/constants', () => ({
  AWS_REGION: 'af-south-1',
  S3_BUCKET_NAME: 'test-bucket',
  CF_IMAGES_DOMAIN: 'd111111abcdef8.cloudfront.net',
  STAGE: 'test',
  CONTENT_TYPE_MAP: {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  },
}));

const MOCK_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => MOCK_UUID),
}));

const mockUser = { userId: 'user-abc', email: 'test@example.com', username: 'testuser' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockContext = {} as any;

describe('ImageResolver', () => {
  let resolver: ImageResolver;

  beforeEach(() => {
    resolver = new ImageResolver();
    jest.clearAllMocks();
    (authUtils.getAuthenticatedUser as jest.Mock).mockReturnValue(mockUser);
    (s3Client.getPresignedUploadUrl as jest.Mock).mockResolvedValue('https://upload.example.com/signed');
  });

  describe('S3 key generation — filename determinism', () => {
    it('uses a deterministic filename for avatar images (no UUID in name)', async () => {
      const result = await resolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'jpg', null, mockContext);
      expect(result.key).toBe('test/users/user-abc/avatar.jpg');
    });

    it('uses a deterministic filename for logo images (no UUID in name)', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.Organization,
        ImageType.Logo,
        'png',
        'org-123',
        mockContext,
      );
      expect(result.key).toBe('test/organizations/org-123/logo.png');
    });

    it('uses a deterministic filename for featured images (no UUID in name)', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.Event,
        ImageType.Featured,
        'webp',
        'event-456',
        mockContext,
      );
      expect(result.key).toBe('test/events/event-456/featured.webp');
    });

    it('appends a UUID to gallery image filenames so each upload is unique', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.Event,
        ImageType.Gallery,
        'jpg',
        'event-456',
        mockContext,
      );
      expect(result.key).toBe(`test/events/event-456/gallery-${MOCK_UUID}.jpg`);
    });
  });

  describe('entityId resolution', () => {
    it('always uses the authenticated user ID for User entityType, ignoring any provided entityId', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.User,
        ImageType.Avatar,
        'jpg',
        'client-supplied-id-should-be-ignored',
        mockContext,
      );
      expect(result.key).toContain('/users/user-abc/');
    });

    it('uses the provided entityId for non-User entityTypes', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.Event,
        ImageType.Featured,
        'jpg',
        'event-xyz',
        mockContext,
      );
      expect(result.key).toContain('/events/event-xyz/');
    });

    it('falls back to a generated UUID as entityId when none is provided for non-User entityTypes', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.Event,
        ImageType.Featured,
        'jpg',
        null,
        mockContext,
      );
      // randomUUID is used for entityId since entityId arg is null
      expect(result.key).toContain(`/events/${MOCK_UUID}/`);
    });
  });

  describe('extension handling', () => {
    it('normalises extension to lowercase', async () => {
      const result = await resolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'JPG', null, mockContext);
      expect(result.key).toMatch(/avatar\.jpg$/);
    });

    it('strips a leading dot from the extension', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.User,
        ImageType.Avatar,
        '.png',
        null,
        mockContext,
      );
      expect(result.key).toMatch(/avatar\.png$/);
    });
  });

  describe('EventMoment entity type', () => {
    it('generates a unique key for MomentMedia uploads (always includes UUID)', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.EventMoment,
        ImageType.MomentMedia,
        'jpg',
        'event-moment-abc',
        mockContext,
      );

      // Key pattern: {stage}/event-moments/{slug}/{username}/{shortId}.{ext}
      expect(result.key).toMatch(/^test\/event-moments\/event-moment-abc\/testuser\/.+\.jpg$/);
    });

    it('uses the provided entityId for EventMoment (not the authenticated user id)', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.EventMoment,
        ImageType.MomentMedia,
        'mp4',
        'moment-entity-xyz',
        mockContext,
      );

      expect(result.key).toContain('/event-moments/moment-entity-xyz/');
    });
  });

  describe('video MIME type resolution', () => {
    it('resolves mp4 to video/mp4 for a presigned S3 upload', async () => {
      await resolver.getImageUploadUrl(
        ImageEntityType.EventMoment,
        ImageType.MomentMedia,
        'mp4',
        'moment-1',
        mockContext,
      );

      expect(s3Client.getPresignedUploadUrl).toHaveBeenCalledWith(expect.any(String), 'video/mp4', expect.any(Number));
    });

    it('resolves mov to video/quicktime for a presigned S3 upload', async () => {
      await resolver.getImageUploadUrl(
        ImageEntityType.EventMoment,
        ImageType.MomentMedia,
        'mov',
        'moment-1',
        mockContext,
      );

      expect(s3Client.getPresignedUploadUrl).toHaveBeenCalledWith(
        expect.any(String),
        'video/quicktime',
        expect.any(Number),
      );
    });

    it('resolves webm to video/webm for a presigned S3 upload', async () => {
      await resolver.getImageUploadUrl(
        ImageEntityType.EventMoment,
        ImageType.MomentMedia,
        'webm',
        'moment-1',
        mockContext,
      );

      expect(s3Client.getPresignedUploadUrl).toHaveBeenCalledWith(expect.any(String), 'video/webm', expect.any(Number));
    });

    it('falls back to image/jpeg for unknown extensions', async () => {
      await resolver.getImageUploadUrl(
        ImageEntityType.EventMoment,
        ImageType.MomentMedia,
        'xyz',
        'moment-1',
        mockContext,
      );

      expect(s3Client.getPresignedUploadUrl).toHaveBeenCalledWith(expect.any(String), 'image/jpeg', expect.any(Number));
    });
  });

  describe('returned URLs', () => {
    it('returns uploadUrl and stable CDN-backed readUrl', async () => {
      const result = await resolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'jpg', null, mockContext);
      expect(result.uploadUrl).toBe('https://upload.example.com/signed');
      expect(result.readUrl).toBe('https://d111111abcdef8.cloudfront.net/test/users/user-abc/avatar.jpg');
    });

    it('includes the S3 key in the readUrl', async () => {
      const result = await resolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'jpg', null, mockContext);
      expect(result.readUrl).toContain(result.key);
    });

    it('throws when CF_IMAGES_DOMAIN is not configured', async () => {
      jest.resetModules();
      jest.doMock('@/clients/AWS/s3Client', () => ({
        getPresignedUploadUrl: jest.fn().mockResolvedValue('https://upload.example.com/signed'),
      }));
      jest.doMock('@/utils', () => ({
        getAuthenticatedUser: jest.fn(() => mockUser),
      }));
      jest.doMock('@/utils/logger', () => ({
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      }));
      jest.doMock('@/constants', () => ({
        AWS_REGION: 'af-south-1',
        S3_BUCKET_NAME: 'test-bucket',
        CF_IMAGES_DOMAIN: '',
        STAGE: 'test',
        CONTENT_TYPE_MAP: {
          jpg: 'image/jpeg',
        },
      }));

      const { ImageResolver: UnconfiguredResolver } = require('@/graphql/resolvers/image');
      const unconfiguredResolver = new UnconfiguredResolver();

      await expect(
        unconfiguredResolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'jpg', null, mockContext),
      ).rejects.toThrow('CF_IMAGES_DOMAIN is required to generate stable media URLs');

      jest.resetModules();
    });
  });
});
