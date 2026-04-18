import mongoose from 'mongoose';
import { CreateEventMomentInputSchema } from '@/validation/zod/social';
import { EventMomentType } from '@gatherle/commons/types';

const validId = new mongoose.Types.ObjectId().toString();

describe('CreateEventMomentInputSchema', () => {
  describe('text moments', () => {
    it('accepts a valid text moment with a caption', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Text,
        caption: 'Hello world!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a text moment when caption is absent', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Text,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['caption']).toBeDefined();
      }
    });

    it('rejects a text moment when caption is only whitespace', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Text,
        caption: '   ',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['caption']).toBeDefined();
      }
    });

    it('rejects a caption longer than 280 characters', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Text,
        caption: 'a'.repeat(281),
      });
      expect(result.success).toBe(false);
    });

    it('accepts a caption of exactly 280 characters', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Text,
        caption: 'a'.repeat(280),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('image moments', () => {
    it('accepts a valid image moment with a mediaKey', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Image,
        mediaKey: 'uploads/photo.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an image moment without mediaKey', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Image,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['mediaKey']).toBeDefined();
      }
    });

    it('accepts an image moment with an optional thumbnailKey', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Image,
        mediaKey: 'uploads/photo.jpg',
        thumbnailKey: 'uploads/thumb.jpg',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.thumbnailKey).toBe('uploads/thumb.jpg');
      }
    });

    it('thumbnailKey is optional and absent when not provided', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Image,
        mediaKey: 'uploads/photo.jpg',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.thumbnailKey).toBeUndefined();
      }
    });
  });

  describe('video moments', () => {
    it('accepts a valid video moment with a mediaKey', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Video,
        mediaKey: 'uploads/video.mp4',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a video moment without mediaKey', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Video,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['mediaKey']).toBeDefined();
      }
    });

    it('accepts a video moment with both mediaKey and thumbnailKey', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Video,
        mediaKey: 'uploads/video.mp4',
        thumbnailKey: 'uploads/video-thumb.jpg',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.thumbnailKey).toBe('uploads/video-thumb.jpg');
      }
    });
  });

  describe('common fields', () => {
    it('rejects an invalid eventId (not a MongoDB ObjectId)', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: 'not-an-object-id',
        type: EventMomentType.Text,
        caption: 'Hello',
      });
      expect(result.success).toBe(false);
    });

    it('rejects an unknown moment type', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: 'Unknown',
        caption: 'Hello',
      });
      expect(result.success).toBe(false);
    });

    it('accepts a valid background token', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Text,
        caption: 'Hello',
        background: 'bg-purple-600',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.background).toBe('bg-purple-600');
      }
    });

    it('rejects an arbitrary color string as background', () => {
      const result = CreateEventMomentInputSchema.safeParse({
        eventId: validId,
        type: EventMomentType.Text,
        caption: 'Hello',
        background: '#FF5733',
      });
      expect(result.success).toBe(false);
    });
  });
});
