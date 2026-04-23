import { EventSchema, CreateEventInputSchema, UpdateEventInputSchema, LocationSchema } from '@/validation';
import mongoose from 'mongoose';
import { EventStatus } from '@gatherle/commons/types/event';

describe('Event', () => {
  const mockID = new mongoose.Types.ObjectId().toString();

  const validVenueLocation = {
    locationType: 'venue' as const,
    address: {
      street: '123 Main St',
      city: 'Cape Town',
      state: 'Western Cape',
      zipCode: '8001',
      country: 'South Africa',
    },
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
  };

  describe('LocationSchema', () => {
    it('should validate an online event location', () => {
      const result = LocationSchema.safeParse({ locationType: 'online' });
      expect(result.success).toBe(true);
    });

    it('should validate a tba event location', () => {
      const result = LocationSchema.safeParse({ locationType: 'tba' });
      expect(result.success).toBe(true);
    });

    it('should validate a venue event location with full address', () => {
      const result = LocationSchema.safeParse(validVenueLocation);
      expect(result.success).toBe(true);
    });

    it('should validate a venue event location with address and no coordinates', () => {
      const result = LocationSchema.safeParse({
        locationType: 'venue',
        address: {
          city: 'Cape Town',
          state: 'Western Cape',
          zipCode: '8001',
          country: 'South Africa',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing locationType', () => {
      const result = LocationSchema.safeParse({ coordinates: { latitude: 0, longitude: 0 } });
      expect(result.success).toBe(false);
    });

    it('should reject an invalid locationType value', () => {
      const result = LocationSchema.safeParse({ locationType: 'unknown' });
      expect(result.success).toBe(false);
    });

    it('should reject a venue event location without an address', () => {
      const result = LocationSchema.safeParse({ locationType: 'venue' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('address');
        expect(result.error.issues[0].message).toMatch(/address is required/i);
      }
    });

    it('should reject coordinates with latitude out of range', () => {
      const result = LocationSchema.safeParse({
        locationType: 'online',
        coordinates: { latitude: 91, longitude: 0 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject coordinates with longitude out of range', () => {
      const result = LocationSchema.safeParse({
        locationType: 'online',
        coordinates: { latitude: 0, longitude: -181 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject a venue address with missing required fields', () => {
      const result = LocationSchema.safeParse({
        locationType: 'venue',
        address: { city: 'Cape Town' }, // missing state, zipCode, country
      });
      expect(result.success).toBe(false);
    });
  });

  describe('EventSchema', () => {
    it('should validate valid EventSchema', () => {
      const validInput = {
        eventId: mockID,
        slug: 'event-slug',
        title: 'Event Title',
        description: 'Event Description',
        startDateTime: '2024-06-30T10:00:00Z',
        endDateTime: '2024-06-30T12:00:00Z',
        primarySchedule: {
          startAt: '2024-06-30T10:00:00Z',
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=DAILY;COUNT=1',
        },
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

    it('should reject an invalid locationType in event location', () => {
      const result = EventSchema.safeParse({
        eventId: mockID,
        slug: 'event-slug',
        title: 'Event Title',
        description: 'Event Description',
        primarySchedule: {
          startAt: '2024-06-30T10:00:00Z',
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=DAILY;COUNT=1',
        },
        location: { locationType: 'unknown' },
        status: EventStatus.Scheduled,
        eventCategories: [mockID],
        organizers: [{ user: mockID, role: 'Host' }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject a venue location without an address in event', () => {
      const result = EventSchema.safeParse({
        eventId: mockID,
        slug: 'event-slug',
        title: 'Event Title',
        description: 'Event Description',
        primarySchedule: {
          startAt: '2024-06-30T10:00:00Z',
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=DAILY;COUNT=1',
        },
        location: { locationType: 'venue' },
        status: EventStatus.Scheduled,
        eventCategories: [mockID],
        organizers: [{ user: mockID, role: 'Host' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateEventInputSchema', () => {
    it('should validate valid CreateEventInputSchema', () => {
      const validInput = {
        title: 'Event Title',
        description: 'Event Description',
        startDateTime: '2024-06-30T10:00:00Z',
        endDateTime: '2024-06-30T12:00:00Z',
        primarySchedule: {
          startAt: '2024-06-30T10:00:00Z',
          timezone: 'Africa/Johannesburg',
          recurrenceRule: 'FREQ=DAILY;COUNT=1',
        },
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

    it('should reject an invalid location when provided', () => {
      const result = UpdateEventInputSchema.safeParse({
        eventId: mockID,
        location: { locationType: 'venue' }, // venue without address
      });
      expect(result.success).toBe(false);
    });
  });
});
