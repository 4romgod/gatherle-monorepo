import { EventMomentDAO } from '@/mongodb/dao';
import { EventMoment as EventMomentModel } from '@/mongodb/models';
import type { EventMoment } from '@gatherle/commons/types';
import { EventMomentState, EventMomentType } from '@gatherle/commons/types';
import { MockMongoError } from '@/test/utils';

jest.mock('@/mongodb/models', () => ({
  EventMoment: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));

/** Chainable query that resolves — covers .sort().limit().exec() and .sort().exec() and .exec() */
const mockQuery = <T>(result: T) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const mockQueryFail = (error: unknown) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(error),
});

describe('EventMomentDAO', () => {
  const mockMoment: EventMoment = {
    momentId: 'moment-1',
    eventId: 'event-1',
    authorId: 'user-1',
    type: EventMomentType.Text,
    state: EventMomentState.Ready,
    isPublished: true,
    expiresAt: new Date('2024-06-02T12:00:00Z'),
    createdAt: new Date('2024-06-01T12:00:00Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const baseInput = { eventId: 'event-1', type: EventMomentType.Text };

    it('creates a text moment with state Ready and lets the model derive momentId from _id', async () => {
      (EventMomentModel.create as jest.Mock).mockResolvedValue({ toObject: () => mockMoment });

      const result = await EventMomentDAO.create(baseInput, 'user-1');

      expect(EventMomentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-1',
          authorId: 'user-1',
          type: EventMomentType.Text,
          state: EventMomentState.Ready,
          isPublished: true,
          expiresAt: expect.any(Date),
        }),
      );
      expect((EventMomentModel.create as jest.Mock).mock.calls[0][0]).not.toHaveProperty('momentId');
      expect(result).toEqual(mockMoment);
    });

    it('creates an image moment with the provided mediaUrl (state Ready)', async () => {
      const imageMoment: EventMoment = {
        ...mockMoment,
        type: EventMomentType.Image,
        mediaUrl: 'https://cdn.example.com/img.jpg',
      };
      (EventMomentModel.create as jest.Mock).mockResolvedValue({ toObject: () => imageMoment });

      await EventMomentDAO.create(
        { eventId: 'event-1', type: EventMomentType.Image },
        'user-1',
        'https://cdn.example.com/img.jpg',
      );

      expect(EventMomentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          state: EventMomentState.Ready,
          mediaUrl: 'https://cdn.example.com/img.jpg',
          isPublished: true,
        }),
      );
    });

    it('persists thumbnailUrl when provided', async () => {
      const momentWithThumb: EventMoment = {
        ...mockMoment,
        type: EventMomentType.Image,
        mediaUrl: 'https://cdn.example.com/img.jpg',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      };
      (EventMomentModel.create as jest.Mock).mockResolvedValue({ toObject: () => momentWithThumb });

      await EventMomentDAO.create(
        { eventId: 'event-1', type: EventMomentType.Image },
        'user-1',
        'https://cdn.example.com/img.jpg',
        'https://cdn.example.com/thumb.jpg',
      );

      expect(EventMomentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ thumbnailUrl: 'https://cdn.example.com/thumb.jpg' }),
      );
    });

    it('throws on DB error', async () => {
      (EventMomentModel.create as jest.Mock).mockRejectedValue(new MockMongoError(0));

      await expect(EventMomentDAO.create(baseInput, 'user-1')).rejects.toThrow();
    });
  });

  describe('createVideoUpload', () => {
    it('reserves an unpublished video moment in UploadPending state', async () => {
      const videoMoment: EventMoment = {
        ...mockMoment,
        type: EventMomentType.Video,
        state: EventMomentState.UploadPending,
        rawS3Key: 'raw/video.mp4',
        mediaUrl: 'https://cdn.example.com/raw/video.mp4',
        isPublished: false,
      };
      (EventMomentModel.create as jest.Mock).mockResolvedValue({ toObject: () => videoMoment });

      const result = await EventMomentDAO.createVideoUpload({
        eventId: 'event-1',
        authorId: 'user-1',
        rawS3Key: 'raw/video.mp4',
        mediaUrl: 'https://cdn.example.com/raw/video.mp4',
      });

      expect(EventMomentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-1',
          authorId: 'user-1',
          type: EventMomentType.Video,
          state: EventMomentState.UploadPending,
          rawS3Key: 'raw/video.mp4',
          mediaUrl: 'https://cdn.example.com/raw/video.mp4',
          isPublished: false,
        }),
      );
      expect((EventMomentModel.create as jest.Mock).mock.calls[0][0]).not.toHaveProperty('momentId');
      expect(result).toEqual(videoMoment);
    });

    it('throws on DB error', async () => {
      (EventMomentModel.create as jest.Mock).mockRejectedValue(new MockMongoError(0));

      await expect(
        EventMomentDAO.createVideoUpload({
          eventId: 'event-1',
          authorId: 'user-1',
          rawS3Key: 'raw/video.mp4',
          mediaUrl: 'https://cdn.example.com/raw/video.mp4',
        }),
      ).rejects.toThrow();
    });
  });

  describe('countRecentByAuthor', () => {
    it('returns the count from the DB', async () => {
      (EventMomentModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      });

      const result = await EventMomentDAO.countRecentByAuthor('event-1', 'user-1');

      expect(result).toBe(3);
      expect(EventMomentModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: 'event-1', authorId: 'user-1' }),
      );
    });

    it('throws on DB error', async () => {
      (EventMomentModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(EventMomentDAO.countRecentByAuthor('event-1', 'user-1')).rejects.toThrow();
    });
  });

  describe('readByEvent', () => {
    it('returns a page of moments with hasMore=false', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery([{ toObject: () => mockMoment }]));

      const result = await EventMomentDAO.readByEvent('event-1');

      expect(result.items).toEqual([mockMoment]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('sets hasMore=true and nextCursor when extra item returned', async () => {
      // Return limit+1 items (default limit=30)
      const items = Array.from({ length: 31 }, (_, i) => ({
        toObject: () => ({
          ...mockMoment,
          momentId: `moment-${i}`,
          createdAt: new Date(Date.now() - i * 1000),
        }),
      }));
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery(items));

      const result = await EventMomentDAO.readByEvent('event-1');

      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(30);
      expect(result.nextCursor).toBeDefined();
    });

    it('applies cursor filter when cursor is provided', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery([]));

      await EventMomentDAO.readByEvent('event-1', '2024-06-01T12:00:00.000Z');

      expect(EventMomentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: { $lt: expect.any(Date) } }),
      );
    });

    it('throws on DB error', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQueryFail(new MockMongoError(0)));

      await expect(EventMomentDAO.readByEvent('event-1')).rejects.toThrow();
    });
  });

  describe('readByAuthorAndEvent', () => {
    it('includes pending states when includePending=true', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery([{ toObject: () => mockMoment }]));

      const result = await EventMomentDAO.readByAuthorAndEvent('user-1', 'event-1', true);

      expect(EventMomentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          state: {
            $in: [EventMomentState.Ready, EventMomentState.UploadPending, EventMomentState.Transcoding],
          },
          isPublished: true,
        }),
      );
      expect(result).toEqual([mockMoment]);
    });

    it('filters to Ready only when includePending=false', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery([{ toObject: () => mockMoment }]));

      await EventMomentDAO.readByAuthorAndEvent('user-1', 'event-1', false);

      expect(EventMomentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ state: EventMomentState.Ready, isPublished: true }),
      );
    });

    it('throws on DB error', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQueryFail(new MockMongoError(0)));

      await expect(EventMomentDAO.readByAuthorAndEvent('user-1', 'event-1', false)).rejects.toThrow();
    });
  });

  describe('readFollowedStatuses', () => {
    it('returns moments from followed users', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery([{ toObject: () => mockMoment }]));

      const result = await EventMomentDAO.readFollowedStatuses(['user-1', 'user-2']);

      expect(EventMomentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: { $in: ['user-1', 'user-2'] }, isPublished: true }),
      );
      expect(result.items).toEqual([mockMoment]);
      expect(result.hasMore).toBe(false);
    });

    it('sets hasMore=true when more items exist', async () => {
      const items = Array.from({ length: 31 }, (_, i) => ({
        toObject: () => ({
          ...mockMoment,
          momentId: `moment-${i}`,
          createdAt: new Date(Date.now() - i * 1000),
        }),
      }));
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery(items));

      const result = await EventMomentDAO.readFollowedStatuses(['user-1']);

      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(30);
    });

    it('applies cursor filter when cursor is provided', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQuery([]));

      await EventMomentDAO.readFollowedStatuses(['user-1'], '2024-06-01T12:00:00.000Z');

      expect(EventMomentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: { $lt: expect.any(Date) } }),
      );
    });

    it('throws on DB error', async () => {
      (EventMomentModel.find as jest.Mock).mockReturnValue(mockQueryFail(new MockMongoError(0)));

      await expect(EventMomentDAO.readFollowedStatuses(['user-1'])).rejects.toThrow();
    });
  });

  describe('readById', () => {
    it('returns a moment when found', async () => {
      (EventMomentModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => mockMoment }),
      });

      const result = await EventMomentDAO.readById('moment-1');

      expect(EventMomentModel.findOne).toHaveBeenCalledWith({ momentId: 'moment-1' });
      expect(result).toEqual(mockMoment);
    });

    it('returns null when not found', async () => {
      (EventMomentModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await EventMomentDAO.readById('moment-1');

      expect(result).toBeNull();
    });

    it('throws on DB error', async () => {
      (EventMomentModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(EventMomentDAO.readById('moment-1')).rejects.toThrow();
    });
  });

  describe('findByRawS3Key', () => {
    it('returns the moment matching the given raw S3 key', async () => {
      (EventMomentModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => mockMoment }),
      });

      const result = await EventMomentDAO.findByRawS3Key('raw/video.mp4');

      expect(EventMomentModel.findOne).toHaveBeenCalledWith({ rawS3Key: 'raw/video.mp4' });
      expect(result).toEqual(mockMoment);
    });

    it('returns null when no match found', async () => {
      (EventMomentModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await EventMomentDAO.findByRawS3Key('raw/missing.mp4');

      expect(result).toBeNull();
    });

    it('throws on DB error', async () => {
      (EventMomentModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(EventMomentDAO.findByRawS3Key('raw/video.mp4')).rejects.toThrow();
    });
  });

  describe('publishVideoMoment', () => {
    it('marks a reserved video as published and stores metadata', async () => {
      const publishedMoment: EventMoment = {
        ...mockMoment,
        type: EventMomentType.Video,
        state: EventMomentState.Transcoding,
        caption: 'hello',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        isPublished: true,
      };
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => publishedMoment }),
      });

      const result = await EventMomentDAO.publishVideoMoment('moment-1', {
        eventId: 'event-1',
        authorId: 'user-1',
        caption: 'hello',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      });

      expect(EventMomentModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          momentId: 'moment-1',
          eventId: 'event-1',
          authorId: 'user-1',
          type: EventMomentType.Video,
          state: { $ne: EventMomentState.Failed },
        }),
        {
          $set: {
            isPublished: true,
            caption: 'hello',
            thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
          },
        },
        { new: true },
      );
      expect(result).toEqual(publishedMoment);
    });

    it('omits optional metadata when not provided', async () => {
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => mockMoment }),
      });

      await EventMomentDAO.publishVideoMoment('moment-1', {
        eventId: 'event-1',
        authorId: 'user-1',
      });

      expect((EventMomentModel.findOneAndUpdate as jest.Mock).mock.calls[0][1]).toEqual({
        $set: { isPublished: true },
      });
    });

    it('returns null when reservation is not found', async () => {
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await EventMomentDAO.publishVideoMoment('moment-1', {
        eventId: 'event-1',
        authorId: 'user-1',
      });

      expect(result).toBeNull();
    });
  });

  describe('claimTranscodeStart', () => {
    it('atomically transitions UploadPending video uploads to Transcoding', async () => {
      const claimedMoment = { ...mockMoment, type: EventMomentType.Video, state: EventMomentState.Transcoding };
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => claimedMoment }),
      });

      const result = await EventMomentDAO.claimTranscodeStart('raw/video.mp4');

      expect(EventMomentModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          rawS3Key: 'raw/video.mp4',
          type: EventMomentType.Video,
          state: EventMomentState.UploadPending,
        },
        { $set: { state: EventMomentState.Transcoding } },
        { new: true },
      );
      expect(result).toEqual(claimedMoment);
    });

    it('returns null when another invocation already claimed the upload', async () => {
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await EventMomentDAO.claimTranscodeStart('raw/video.mp4');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns true when a moment is deleted', async () => {
      (EventMomentModel.deleteOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await EventMomentDAO.delete('moment-1');

      expect(result).toBe(true);
      expect(EventMomentModel.deleteOne).toHaveBeenCalledWith({ momentId: 'moment-1' });
    });

    it('returns false when moment was not found', async () => {
      (EventMomentModel.deleteOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await EventMomentDAO.delete('moment-1');

      expect(result).toBe(false);
    });

    it('throws on DB error', async () => {
      (EventMomentModel.deleteOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(EventMomentDAO.delete('moment-1')).rejects.toThrow();
    });
  });

  describe('markReady', () => {
    it('sets Ready state with HLS mediaUrl and durationSeconds', async () => {
      const readyMoment: EventMoment = {
        ...mockMoment,
        state: EventMomentState.Ready,
        mediaUrl: 'https://cdn.example.com/vid/hls/index.m3u8',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        durationSeconds: 15,
      };
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => readyMoment }),
      });

      const result = await EventMomentDAO.markReady(
        'moment-1',
        'https://cdn.example.com/vid/hls/index.m3u8',
        'https://cdn.example.com/thumb.jpg',
        15,
      );

      expect(EventMomentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { momentId: 'moment-1' },
        expect.objectContaining({
          $set: expect.objectContaining({ state: EventMomentState.Ready }),
        }),
        { new: true },
      );
      expect(result).toEqual(readyMoment);
    });

    it('omits thumbnailUrl from $set when not provided', async () => {
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => mockMoment }),
      });

      await EventMomentDAO.markReady('moment-1', 'https://cdn.example.com/hls/index.m3u8', undefined, 10);

      const call = (EventMomentModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(call[1].$set).not.toHaveProperty('thumbnailUrl');
    });

    it('returns null when moment not found', async () => {
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await EventMomentDAO.markReady('moment-1', 'url', undefined, 15);

      expect(result).toBeNull();
    });

    it('throws on DB error', async () => {
      (EventMomentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(EventMomentDAO.markReady('moment-1', 'url', undefined, 15)).rejects.toThrow();
    });
  });

  describe('markFailed', () => {
    it('marks a moment as Failed', async () => {
      (EventMomentModel.updateOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await EventMomentDAO.markFailed('moment-1');

      expect(EventMomentModel.updateOne).toHaveBeenCalledWith(
        { momentId: 'moment-1' },
        { $set: { state: EventMomentState.Failed } },
      );
    });

    it('throws on DB error', async () => {
      (EventMomentModel.updateOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new MockMongoError(0)),
      });

      await expect(EventMomentDAO.markFailed('moment-1')).rejects.toThrow();
    });
  });
});
