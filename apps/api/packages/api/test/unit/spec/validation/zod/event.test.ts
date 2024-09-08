import {EventTypeSchema, CreateEventInputTypeSchema, UpdateEventInputTypeSchema, validateInput} from '@/validation';
import mongoose from 'mongoose';
import {EventStatus} from '@/graphql/types';

describe('Event', () => {
  const mockID = new mongoose.Types.ObjectId().toString();

  describe('EventTypeSchema', () => {
    it('should validate valid EventTypeSchema', () => {
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
        eventCategoryList: [mockID],
        organizerList: [mockID],
        rSVPList: [mockID],
        tags: {tag1: 'value1'},
        media: {featuredImageUrl: 'https://example.com/image.jpg'},
        additionalDetails: {detail1: 'value1'},
        comments: {comment1: 'comment'},
        privacySetting: 'Public',
        eventLink: 'https://example.com/event',
      };
      const errors = EventTypeSchema.safeParse(validInput);
      expect(errors.success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const errors = EventTypeSchema.safeParse(invalidInput);
      expect(errors.success).toBe(false);
    });
  });

  describe('CreateEventInputTypeSchema', () => {
    it('should validate valid CreateEventInputTypeSchema', () => {
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
        eventCategoryList: [mockID],
        organizerList: [mockID],
        rSVPList: [mockID],
        tags: {tag1: 'value1'},
        media: {featuredImageUrl: 'https://example.com/image.jpg'},
        additionalDetails: {detail1: 'value1'},
        comments: {comment1: 'comment'},
        privacySetting: 'Public',
        eventLink: 'https://example.com/event',
      };
      const errors = CreateEventInputTypeSchema.safeParse(validInput);
      expect(errors.success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const errors = CreateEventInputTypeSchema.safeParse(invalidInput);
      expect(errors.success).toBe(false);
    });
  });

  describe('UpdateEventInputTypeSchema', () => {
    it('should validate valid UpdateEventInputTypeSchema', () => {
      const validInput = {
        eventId: mockID,
        title: 'Updated Event Title',
      };

      const errors = UpdateEventInputTypeSchema.safeParse(validInput);
      expect(errors.success).toBe(true);
    });

    it('should invalidate invalid id format', () => {
      const invalidInput = {
        eventId: 'invalid-id-format',
        title: 'Updated Event Title',
      };
      const errors = UpdateEventInputTypeSchema.safeParse(invalidInput);
      expect(errors.success).toBe(false);
    });
  });
});
