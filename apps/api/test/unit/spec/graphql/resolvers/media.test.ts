import 'reflect-metadata';

jest.mock('@/services', () => ({
  MediaService: {
    getMediaUploadUrl: jest.fn(),
    getEventMomentUploadUrl: jest.fn(),
  },
}));

jest.mock('@/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/constants', () => ({
  RESOLVER_DESCRIPTIONS: {
    MEDIA: {
      getMediaUploadUrl: 'Get a pre-signed S3 URL for uploading media directly to S3.',
      getEventMomentUploadUrl: 'Get a pre-signed S3 URL for uploading an event moment media file.',
    },
  },
}));

import { MediaResolver } from '@/graphql/resolvers/media';
import { MediaEntityType, MediaType } from '@gatherle/commons/types';
import * as authUtils from '@/utils';
import * as ServicesModule from '@/services';

const mockUser = { userId: 'user-abc', email: 'test@example.com', username: 'testuser' };
const mockContext = {} as any;
const mockUploadResult = {
  uploadUrl: 'https://upload.example.com/signed',
  key: 'test/events/event-1/featured.jpg',
  readUrl: 'https://cdn.example.com/test/events/event-1/featured.jpg',
};

describe('MediaResolver', () => {
  let resolver: MediaResolver;

  beforeEach(() => {
    resolver = new MediaResolver();
    jest.clearAllMocks();
    (authUtils.getAuthenticatedUser as jest.Mock).mockReturnValue(mockUser);
    (ServicesModule.MediaService.getMediaUploadUrl as jest.Mock).mockResolvedValue(mockUploadResult);
    (ServicesModule.MediaService.getEventMomentUploadUrl as jest.Mock).mockResolvedValue(mockUploadResult);
  });

  describe('getMediaUploadUrl', () => {
    it('delegates to MediaService.getMediaUploadUrl with correct params', async () => {
      await resolver.getMediaUploadUrl(MediaEntityType.Event, MediaType.Featured, 'jpg', 'event-1', mockContext);
      expect(ServicesModule.MediaService.getMediaUploadUrl).toHaveBeenCalledWith({
        entityType: MediaEntityType.Event,
        mediaType: MediaType.Featured,
        extension: 'jpg',
        entityId: 'event-1',
        userId: mockUser.userId,
      });
    });

    it('resolves userId from auth context, not from args', async () => {
      await resolver.getMediaUploadUrl(MediaEntityType.User, MediaType.Avatar, 'png', null, mockContext);
      expect(ServicesModule.MediaService.getMediaUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-abc' }),
      );
    });

    it('returns the result from MediaService unchanged', async () => {
      const result = await resolver.getMediaUploadUrl(
        MediaEntityType.Event,
        MediaType.Featured,
        'jpg',
        'event-1',
        mockContext,
      );
      expect(result).toBe(mockUploadResult);
    });
  });

  describe('getEventMomentUploadUrl', () => {
    it('delegates to MediaService.getEventMomentUploadUrl with correct params', async () => {
      await resolver.getEventMomentUploadUrl('event-id-123', 'mp4', mockContext);
      expect(ServicesModule.MediaService.getEventMomentUploadUrl).toHaveBeenCalledWith({
        eventId: 'event-id-123',
        extension: 'mp4',
        userId: mockUser.userId,
        username: mockUser.username,
      });
    });

    it('passes username from auth claims to the service', async () => {
      (authUtils.getAuthenticatedUser as jest.Mock).mockReturnValue({ ...mockUser, username: 'special-user' });
      await resolver.getEventMomentUploadUrl('event-id-123', 'jpg', mockContext);
      expect(ServicesModule.MediaService.getEventMomentUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'special-user' }),
      );
    });

    it('returns the result from MediaService unchanged', async () => {
      const result = await resolver.getEventMomentUploadUrl('event-id-123', 'mp4', mockContext);
      expect(result).toBe(mockUploadResult);
    });
  });
});
