import 'reflect-metadata';
import { ImageResolver } from '@/graphql/resolvers/image';
import { ImageEntityType, ImageType } from '@gatherle/commons/types';
import * as s3Client from '@/clients/AWS/s3Client';
import * as authUtils from '@/utils';

jest.mock('@/clients/AWS/s3Client', () => ({
  getPresignedUploadUrl: jest.fn(),
  getPresignedUrl: jest.fn(),
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
  STAGE: 'test',
  CONTENT_TYPE_MAP: {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  },
}));

const MOCK_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => MOCK_UUID),
}));

const mockUser = { userId: 'user-abc', email: 'test@example.com' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockContext = {} as any;

describe('ImageResolver', () => {
  let resolver: ImageResolver;

  beforeEach(() => {
    resolver = new ImageResolver();
    jest.clearAllMocks();
    (authUtils.getAuthenticatedUser as jest.Mock).mockReturnValue(mockUser);
    (s3Client.getPresignedUploadUrl as jest.Mock).mockResolvedValue('https://upload.example.com/signed');
    (s3Client.getPresignedUrl as jest.Mock).mockResolvedValue('https://read.example.com/signed');
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

  describe('returned URLs', () => {
    it('returns uploadUrl, readUrl, and publicUrl', async () => {
      const result = await resolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'jpg', null, mockContext);
      expect(result.uploadUrl).toBe('https://upload.example.com/signed');
      expect(result.readUrl).toBe('https://read.example.com/signed');
      expect(result.publicUrl).toContain('test-bucket');
    });

    it('includes the S3 key in the publicUrl', async () => {
      const result = await resolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'jpg', null, mockContext);
      expect(result.publicUrl).toContain(result.key);
    });
  });
});
