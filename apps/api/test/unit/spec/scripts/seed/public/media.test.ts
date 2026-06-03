jest.mock('@/constants', () => ({
  STAGE: 'Beta',
  MEDIA_CDN_DOMAIN: 'cdn.example.com',
  MEDIA_ENTITY_FOLDER: {
    event: 'events',
    organization: 'organizations',
  },
  CONTENT_TYPE_MAP: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  },
}));

jest.mock('@/clients/AWS/s3Client', () => ({
  getS3ObjectSize: jest.fn(),
  uploadToS3: jest.fn(),
}));

import { getS3ObjectSize, uploadToS3 } from '@/clients/AWS/s3Client';
import {
  buildImportedEventFeaturedImageKey,
  buildImportedOrganizationLogoKey,
  mirrorImportedEventFeaturedImage,
  mirrorImportedOrganizationLogo,
  resolveImportedImageExtension,
} from '@/scripts/seed/public/media';

describe('seed public media mirroring', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('resolveImportedImageExtension', () => {
    it('prefers the response content type when supported', () => {
      expect(resolveImportedImageExtension('https://source.test/image', 'image/png; charset=utf-8')).toBe('png');
    });

    it('falls back to the source URL extension when the content type is missing', () => {
      expect(resolveImportedImageExtension('https://source.test/image/banner.webp')).toBe('webp');
    });

    it('returns null for unsupported image types', () => {
      expect(resolveImportedImageExtension('https://source.test/image', 'image/avif')).toBeNull();
    });
  });

  describe('buildImportedEventFeaturedImageKey', () => {
    it('builds a deterministic key for an imported event image', () => {
      expect(
        buildImportedEventFeaturedImageKey({
          sourcePlatform: 'Howler',
          externalId: 'EVT_123',
          sourceUrl: 'https://source.test/banner.jpg',
          contentType: 'image/jpeg',
        }),
      ).toBe('beta/events/imported-howler-evt-123/featured.jpg');
    });
  });

  describe('buildImportedOrganizationLogoKey', () => {
    it('builds a deterministic key for an imported organization logo', () => {
      expect(
        buildImportedOrganizationLogoKey({
          organizationKey: 'Kunye Together',
          sourceUrl: 'https://source.test/logo.png',
          contentType: 'image/png',
        }),
      ).toBe('beta/organizations/imported-kunye-together/logo.png');
    });
  });

  describe('mirrorImportedEventFeaturedImage', () => {
    it('reuses the existing CDN object when the deterministic S3 key is already populated', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '1024',
        }),
        arrayBuffer: jest.fn(),
      } as unknown as Response);
      (getS3ObjectSize as jest.Mock).mockResolvedValue(1024);

      const result = await mirrorImportedEventFeaturedImage({
        sourcePlatform: 'Howler',
        externalId: 'EVT_123',
        imageUrl: 'https://source.test/banner.jpg',
      });

      expect(result).toBe('https://cdn.example.com/beta/events/imported-howler-evt-123/featured.jpg');
      expect(getS3ObjectSize).toHaveBeenCalledWith('beta/events/imported-howler-evt-123/featured.jpg', {
        suppressNotFoundLog: true,
      });
      expect(uploadToS3).not.toHaveBeenCalled();
    });

    it('downloads and uploads the source image when the S3 object is missing', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'image/png',
          'content-length': '4',
        }),
        arrayBuffer: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3, 4]).buffer),
      } as unknown as Response);
      (getS3ObjectSize as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await mirrorImportedEventFeaturedImage({
        sourcePlatform: 'Howler',
        externalId: 'EVT_123',
        imageUrl: 'https://source.test/banner',
      });

      expect(uploadToS3).toHaveBeenCalledWith(
        'beta/events/imported-howler-evt-123/featured.png',
        Buffer.from([1, 2, 3, 4]),
        'image/png',
      );
      expect(getS3ObjectSize).toHaveBeenCalledWith('beta/events/imported-howler-evt-123/featured.png', {
        suppressNotFoundLog: true,
      });
      expect(result).toBe('https://cdn.example.com/beta/events/imported-howler-evt-123/featured.png');
    });

    it('omits the media when the remote image is unsupported', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'image/avif',
        }),
        arrayBuffer: jest.fn(),
      } as unknown as Response);

      const result = await mirrorImportedEventFeaturedImage({
        sourcePlatform: 'Howler',
        externalId: 'EVT_123',
        imageUrl: 'https://source.test/banner',
      });

      expect(result).toBeUndefined();
      expect(uploadToS3).not.toHaveBeenCalled();
    });
  });

  describe('mirrorImportedOrganizationLogo', () => {
    it('downloads and uploads the source logo using the organization key path', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '4',
        }),
        arrayBuffer: jest.fn().mockResolvedValue(Uint8Array.from([9, 8, 7, 6]).buffer),
      } as unknown as Response);
      (getS3ObjectSize as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await mirrorImportedOrganizationLogo({
        organizationKey: 'Kunye Together',
        imageUrl: 'https://source.test/logo.jpg',
      });

      expect(uploadToS3).toHaveBeenCalledWith(
        'beta/organizations/imported-kunye-together/logo.jpg',
        Buffer.from([9, 8, 7, 6]),
        'image/jpeg',
      );
      expect(getS3ObjectSize).toHaveBeenCalledWith('beta/organizations/imported-kunye-together/logo.jpg', {
        suppressNotFoundLog: true,
      });
      expect(result).toBe('https://cdn.example.com/beta/organizations/imported-kunye-together/logo.jpg');
    });
  });
});
