import 'reflect-metadata';

jest.mock('@/services', () => ({
  ImageService: {
    getImageUploadUrl: jest.fn(),
    getEventMomentUploadUrl: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/constants', () => ({
  RESOLVER_DESCRIPTIONS: {
    IMAGE: {
      getImageUploadUrl: 'Get a pre-signed S3 URL for uploading an image directly to S3.',
      getEventMomentUploadUrl: 'Get a pre-signed S3 URL for uploading an event moment media file.',
    },
  },
}));

import { ImageResolver } from '@/graphql/resolvers/image';
import { ImageEntityType, ImageType } from '@gatherle/commons/types';
import * as authUtils from '@/utils';
import * as ServicesModule from '@/services';

const mockUser = { userId: 'user-abc', email: 'test@example.com', username: 'testuser' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockContext = {} as any;
const mockUploadResult = {
  uploadUrl: 'https://upload.example.com/signed',
  key: 'test/events/event-1/featured.jpg',
  readUrl: 'https://cdn.example.com/test/events/event-1/featured.jpg',
};

describe('ImageResolver', () => {
  let resolver: ImageResolver;

  beforeEach(() => {
    resolver = new ImageResolver();
    jest.clearAllMocks();
    (authUtils.getAuthenticatedUser as jest.Mock).mockReturnValue(mockUser);
    (ServicesModule.ImageService.getImageUploadUrl as jest.Mock).mockResolvedValue(mockUploadResult);
    (ServicesModule.ImageService.getEventMomentUploadUrl as jest.Mock).mockResolvedValue(mockUploadResult);
  });

  describe('getImageUploadUrl', () => {
    it('delegates to ImageService.getImageUploadUrl with correct params', async () => {
      await resolver.getImageUploadUrl(ImageEntityType.Event, ImageType.Featured, 'jpg', 'event-1', mockContext);
      expect(ServicesModule.ImageService.getImageUploadUrl).toHaveBeenCalledWith({
        entityType: ImageEntityType.Event,
        imageType: ImageType.Featured,
        extension: 'jpg',
        entityId: 'event-1',
        userId: mockUser.userId,
      });
    });

    it('resolves userId from auth context, not from args', async () => {
      await resolver.getImageUploadUrl(ImageEntityType.User, ImageType.Avatar, 'png', null, mockContext);
      expect(ServicesModule.ImageService.getImageUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-abc' }),
      );
    });

    it('returns the result from ImageService unchanged', async () => {
      const result = await resolver.getImageUploadUrl(
        ImageEntityType.Event,
        ImageType.Featured,
        'jpg',
        'event-1',
        mockContext,
      );
      expect(result).toBe(mockUploadResult);
    });
  });

  describe('getEventMomentUploadUrl', () => {
    it('delegates to ImageService.getEventMomentUploadUrl with correct params', async () => {
      await resolver.getEventMomentUploadUrl('event-id-123', 'mp4', mockContext);
      expect(ServicesModule.ImageService.getEventMomentUploadUrl).toHaveBeenCalledWith({
        eventId: 'event-id-123',
        extension: 'mp4',
        userId: mockUser.userId,
        username: mockUser.username,
      });
    });

    it('passes username from auth claims to the service', async () => {
      (authUtils.getAuthenticatedUser as jest.Mock).mockReturnValue({ ...mockUser, username: 'special-user' });
      await resolver.getEventMomentUploadUrl('event-id-123', 'jpg', mockContext);
      expect(ServicesModule.ImageService.getEventMomentUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'special-user' }),
      );
    });

    it('returns the result from ImageService unchanged', async () => {
      const result = await resolver.getEventMomentUploadUrl('event-id-123', 'mp4', mockContext);
      expect(result).toBe(mockUploadResult);
    });
  });
});
