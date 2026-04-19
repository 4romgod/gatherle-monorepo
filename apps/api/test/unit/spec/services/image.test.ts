jest.mock('@/clients/AWS/s3Client', () => ({
  getPresignedUploadUrl: jest.fn(),
}));

jest.mock('@/utils', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomError: jest.fn((message: string, type: string) => {
    const err: any = new Error(message);
    err.extensions = { code: type };
    return err;
  }),
  ErrorTypes: {
    BAD_USER_INPUT: 'BAD_USER_INPUT',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/constants', () => ({
  CF_IMAGES_DOMAIN: 'd111111abcdef8.cloudfront.net',
  STAGE: 'test',
  CONTENT_TYPE_MAP: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  },
  HttpStatusCode: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHENTICATED: 401,
    UNAUTHORIZED: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
  REGEXT_MONGO_DB_ERROR: /\{ (.*?): (.*?) \}/,
}));

jest.mock('@/mongodb/dao', () => ({
  EventDAO: { readEventById: jest.fn() },
  EventParticipantDAO: { readByEventAndUser: jest.fn() },
  EventMomentDAO: { countRecentByAuthor: jest.fn() },
}));

jest.mock('@/mongodb/dao/eventMoment', () => ({
  POSTING_WINDOW_HOURS_AFTER_EVENT: 24,
  MAX_STATUSES_PER_WINDOW: 10,
}));

import * as s3Client from '@/clients/AWS/s3Client';
import * as DaoModule from '@/mongodb/dao';
import { ImageService } from '@/services';
import { ImageEntityType, ImageType, ParticipantStatus } from '@gatherle/commons/types';

const mockEvent = {
  _id: 'event-id-123',
  slug: 'summer-bbq',
  primarySchedule: {
    startAt: new Date('2099-01-01T00:00:00Z'),
    endAt: new Date('2099-01-01T02:00:00Z'),
  },
};

const mockParticipant = { status: ParticipantStatus.Going };

const baseImageParams = {
  entityType: ImageEntityType.Event,
  imageType: ImageType.Featured,
  extension: 'jpg',
  entityId: 'event-456',
  userId: 'user-abc',
};

const baseMomentParams = {
  eventId: 'event-id-123',
  extension: 'mp4',
  userId: 'user-abc',
  username: 'testuser',
};

describe('ImageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (s3Client.getPresignedUploadUrl as jest.Mock).mockResolvedValue('https://upload.example.com/signed');
    (DaoModule.EventDAO.readEventById as jest.Mock).mockResolvedValue(mockEvent);
    (DaoModule.EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(mockParticipant);
    (DaoModule.EventMomentDAO.countRecentByAuthor as jest.Mock).mockResolvedValue(0);
  });

  describe('getImageUploadUrl', () => {
    describe('S3 key generation', () => {
      it('builds a deterministic key for avatar images', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          entityType: ImageEntityType.User,
          imageType: ImageType.Avatar,
          entityId: null,
          userId: 'user-abc',
        });
        expect(result.key).toBe('test/users/user-abc/avatar.jpg');
      });

      it('builds a deterministic key for logo images', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          entityType: ImageEntityType.Organization,
          imageType: ImageType.Logo,
          extension: 'png',
          entityId: 'org-123',
        });
        expect(result.key).toBe('test/organizations/org-123/logo.png');
      });

      it('builds a deterministic key for featured images', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          imageType: ImageType.Featured,
          extension: 'webp',
        });
        expect(result.key).toBe('test/events/event-456/featured.webp');
      });

      it('puts gallery images into a gallery/ subfolder with a unique short ID', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          imageType: ImageType.Gallery,
        });
        expect(result.key).toMatch(/^test\/events\/event-456\/gallery\/[A-Za-z0-9_-]+\.jpg$/);
      });
    });

    describe('entityId resolution', () => {
      it('always uses userId for User entityType, ignoring any provided entityId', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          entityType: ImageEntityType.User,
          imageType: ImageType.Avatar,
          entityId: 'should-be-ignored',
          userId: 'user-abc',
        });
        expect(result.key).toContain('/users/user-abc/');
      });

      it('uses the provided entityId for non-User entityTypes', async () => {
        const result = await ImageService.getImageUploadUrl({ ...baseImageParams, entityId: 'event-xyz' });
        expect(result.key).toContain('/events/event-xyz/');
      });

      it('generates a short ID as entityId when null is provided for non-User entityTypes', async () => {
        const result = await ImageService.getImageUploadUrl({ ...baseImageParams, entityId: null });
        expect(result.key).toMatch(/^test\/events\/[A-Za-z0-9_-]+\/featured\.jpg$/);
      });
    });

    describe('extension handling', () => {
      it('normalises extension to lowercase', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          entityType: ImageEntityType.User,
          imageType: ImageType.Avatar,
          extension: 'JPG',
          entityId: null,
        });
        expect(result.key).toMatch(/avatar\.jpg$/);
      });

      it('strips a leading dot from the extension', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          entityType: ImageEntityType.User,
          imageType: ImageType.Avatar,
          extension: '.png',
          entityId: null,
        });
        expect(result.key).toMatch(/avatar\.png$/);
      });

      it('throws BAD_USER_INPUT for an unsupported extension', async () => {
        await expect(ImageService.getImageUploadUrl({ ...baseImageParams, extension: 'xyz' })).rejects.toThrow(
          'Unsupported file extension',
        );
      });
    });

    describe('EventMoment rejection', () => {
      it('rejects EventMoment entityType — callers must use getEventMomentUploadUrl', async () => {
        await expect(
          ImageService.getImageUploadUrl({
            ...baseImageParams,
            entityType: ImageEntityType.EventMoment,
          }),
        ).rejects.toThrow('Use the getEventMomentUploadUrl mutation');
      });
    });

    describe('MIME type resolution', () => {
      it('resolves mp4 to video/mp4', async () => {
        await ImageService.getImageUploadUrl({ ...baseImageParams, extension: 'mp4' });
        expect(s3Client.getPresignedUploadUrl).toHaveBeenCalledWith(
          expect.any(String),
          'video/mp4',
          expect.any(Number),
        );
      });

      it('resolves mov to video/quicktime', async () => {
        await ImageService.getImageUploadUrl({ ...baseImageParams, extension: 'mov' });
        expect(s3Client.getPresignedUploadUrl).toHaveBeenCalledWith(
          expect.any(String),
          'video/quicktime',
          expect.any(Number),
        );
      });

      it('resolves webm to video/webm', async () => {
        await ImageService.getImageUploadUrl({ ...baseImageParams, extension: 'webm' });
        expect(s3Client.getPresignedUploadUrl).toHaveBeenCalledWith(
          expect.any(String),
          'video/webm',
          expect.any(Number),
        );
      });
    });

    describe('returned URLs', () => {
      it('returns uploadUrl and stable CDN-backed readUrl', async () => {
        const result = await ImageService.getImageUploadUrl({
          ...baseImageParams,
          entityType: ImageEntityType.User,
          imageType: ImageType.Avatar,
          entityId: null,
          userId: 'user-abc',
        });
        expect(result.uploadUrl).toBe('https://upload.example.com/signed');
        expect(result.readUrl).toBe('https://d111111abcdef8.cloudfront.net/test/users/user-abc/avatar.jpg');
      });

      it('includes the S3 key in the readUrl', async () => {
        const result = await ImageService.getImageUploadUrl({ ...baseImageParams });
        expect(result.readUrl).toContain(result.key);
      });

      it('throws when CF_IMAGES_DOMAIN is not configured', async () => {
        jest.resetModules();
        jest.doMock('@/clients/AWS/s3Client', () => ({
          getPresignedUploadUrl: jest.fn().mockResolvedValue('https://upload.example.com/signed'),
        }));
        jest.doMock('@/utils', () => ({
          CustomError: jest.fn((msg: string) => new Error(msg)),
          ErrorTypes: { BAD_USER_INPUT: 'BAD_USER_INPUT', NOT_FOUND: 'NOT_FOUND', UNAUTHORIZED: 'UNAUTHORIZED' },
        }));
        jest.doMock('@/utils/logger', () => ({
          logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        }));
        jest.doMock('@/constants', () => ({
          CF_IMAGES_DOMAIN: '',
          STAGE: 'test',
          CONTENT_TYPE_MAP: { jpg: 'image/jpeg' },
          HttpStatusCode: {
            OK: 200,
            CREATED: 201,
            BAD_REQUEST: 400,
            UNAUTHENTICATED: 401,
            UNAUTHORIZED: 403,
            NOT_FOUND: 404,
            CONFLICT: 409,
            INTERNAL_SERVER_ERROR: 500,
          },
          REGEXT_MONGO_DB_ERROR: /\{ (.*?): (.*?) \}/,
        }));
        jest.doMock('@/mongodb/dao', () => ({
          EventDAO: { readEventById: jest.fn() },
          EventParticipantDAO: { readByEventAndUser: jest.fn() },
          EventMomentDAO: { countRecentByAuthor: jest.fn() },
        }));
        jest.doMock('@/mongodb/dao/eventMoment', () => ({
          POSTING_WINDOW_HOURS_AFTER_EVENT: 24,
          MAX_STATUSES_PER_WINDOW: 10,
        }));

        const { ImageService: UnconfiguredService } = require('@/services');
        await expect(UnconfiguredService.getImageUploadUrl({ ...baseImageParams, entityId: 'e-1' })).rejects.toThrow(
          'CF_IMAGES_DOMAIN is required to generate stable media URLs',
        );

        jest.resetModules();
      });
    });
  });

  describe('getEventMomentUploadUrl', () => {
    it('throws BAD_USER_INPUT for an unsupported extension', async () => {
      await expect(ImageService.getEventMomentUploadUrl({ ...baseMomentParams, extension: 'xyz' })).rejects.toThrow(
        'Unsupported extension for moment uploads',
      );
    });

    it('throws NOT_FOUND when the event does not exist', async () => {
      (DaoModule.EventDAO.readEventById as jest.Mock).mockRejectedValue(new Error('not found'));
      await expect(ImageService.getEventMomentUploadUrl(baseMomentParams)).rejects.toThrow('Event not found');
    });

    it('throws BAD_USER_INPUT when the posting window has closed', async () => {
      (DaoModule.EventDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        primarySchedule: {
          startAt: new Date('2000-01-01T00:00:00Z'),
          endAt: new Date('2000-01-01T02:00:00Z'),
        },
      });
      await expect(ImageService.getEventMomentUploadUrl(baseMomentParams)).rejects.toThrow('posting window');
    });

    it('throws UNAUTHORIZED when the caller has no RSVP', async () => {
      (DaoModule.EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue(null);
      await expect(ImageService.getEventMomentUploadUrl(baseMomentParams)).rejects.toThrow('RSVP');
    });

    it('throws UNAUTHORIZED when the caller RSVP status is Interested (not Going/CheckedIn)', async () => {
      (DaoModule.EventParticipantDAO.readByEventAndUser as jest.Mock).mockResolvedValue({
        status: ParticipantStatus.Interested,
      });
      await expect(ImageService.getEventMomentUploadUrl(baseMomentParams)).rejects.toThrow('RSVP');
    });

    it('throws BAD_USER_INPUT when the rate limit is exceeded', async () => {
      (DaoModule.EventMomentDAO.countRecentByAuthor as jest.Mock).mockResolvedValue(10);
      await expect(ImageService.getEventMomentUploadUrl(baseMomentParams)).rejects.toThrow('at most');
    });

    it('allows uploads when primarySchedule is absent (no window constraint)', async () => {
      (DaoModule.EventDAO.readEventById as jest.Mock).mockResolvedValue({ ...mockEvent, primarySchedule: null });
      const result = await ImageService.getEventMomentUploadUrl(baseMomentParams);
      expect(result.key).toMatch(/^test\/event-moments\/summer-bbq\/testuser\/[A-Za-z0-9_-]+\.mp4$/);
    });

    it('returns uploadUrl, key, and CDN-backed readUrl', async () => {
      const result = await ImageService.getEventMomentUploadUrl(baseMomentParams);
      expect(result.uploadUrl).toBe('https://upload.example.com/signed');
      expect(result.readUrl).toBe(`https://d111111abcdef8.cloudfront.net/${result.key}`);
    });

    it('sanitises the event slug (never trusts client input for key path)', async () => {
      (DaoModule.EventDAO.readEventById as jest.Mock).mockResolvedValue({
        ...mockEvent,
        slug: 'My Fancy Event!!',
        primarySchedule: null,
      });
      const result = await ImageService.getEventMomentUploadUrl(baseMomentParams);
      expect(result.key).toContain('/event-moments/my-fancy-event/');
    });
  });
});
