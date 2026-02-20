import { EventSchema, CreateEventInputSchema, UpdateEventInputSchema } from '@/validation';
import mongoose from 'mongoose';
import { EventStatus } from '@gatherle/commons/types/event';

describe('Event', () => {
  const mockID = new mongoose.Types.ObjectId().toString();

  describe('EventSchema', () => {
    it('should validate valid EventSchema', () => {
      const validInput = {
        eventId: mockID,
        slug: 'event-slug',
        title: 'Event Title',
        description: 'Event Description',
        startDateTime: '2024-06-30T10:00:00Z',
        endDateTime: '2024-06-30T12:00:00Z',
        recurrenceRule: 'FREQ=DAILY;COUNT=1',
        location: {
          locationType: 'online',
        },
        status: EventStatus.Cancelled,
        capacity: 100,
        eventCategories: [mockID],
        organizers: [{ user: mockID, role: 'Host' }],
        tags: { tag1: 'value1' },
        media: { featuredImageUrl: 'https://example.com/image.jpg' },
        additionalDetails: { detail1: 'value1' },
        comments: { comment1: 'comment' },
        privacySetting: 'Public',
        eventLink: 'https://example.com/event',
      };
      const errors = EventSchema.safeParse(validInput);
      expect(errors.success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const errors = EventSchema.safeParse(invalidInput);
      expect(errors.success).toBe(false);
    });
  });

  describe('CreateEventInputSchema', () => {
    it('should validate valid CreateEventInputSchema', () => {
      const validInput = {
        title: 'Event Title',
        description: 'Event Description',
        startDateTime: '2024-06-30T10:00:00Z',
        endDateTime: '2024-06-30T12:00:00Z',
        recurrenceRule: 'FREQ=DAILY;COUNT=1',
        location: {
          locationType: 'online',
        },
        status: EventStatus.Cancelled,
        capacity: 100,
        eventCategories: [mockID],
        organizers: [{ user: mockID, role: 'Host' }],
        tags: { tag1: 'value1' },
        media: { featuredImageUrl: 'https://example.com/image.jpg' },
        additionalDetails: { detail1: 'value1' },
        comments: { comment1: 'comment' },
        privacySetting: 'Public',
        eventLink: 'https://example.com/event',
      };
      const errors = CreateEventInputSchema.safeParse(validInput);
      expect(errors.success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const errors = CreateEventInputSchema.safeParse(invalidInput);
      expect(errors.success).toBe(false);
    });
  });

  describe('UpdateEventInputSchema', () => {
    it('should validate valid UpdateEventInputSchema', () => {
      const validInput = {
        eventId: mockID,
        title: 'Updated Event Title',
      };

      const errors = UpdateEventInputSchema.safeParse(validInput);
      expect(errors.success).toBe(true);
    });

    it('should invalidate invalid id format', () => {
      const invalidInput = {
        eventId: 'invalid-id-format',
        title: 'Updated Event Title',
      };
      const errors = UpdateEventInputSchema.safeParse(invalidInput);
      expect(errors.success).toBe(false);
    });
  });
});
