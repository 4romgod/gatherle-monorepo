import {EventCategorySchema, CreateEventCategorySchema, UpdateEventCategorySchema} from '@/validation';
import mongoose from 'mongoose';

describe('Event Category', () => {
  const mockID = new mongoose.Types.ObjectId().toString();

  const getValidEventCategoryInput = () => ({
    eventCategoryId: mockID,
    color: 'red',
    description: 'A valid description',
    iconName: 'icon-name',
    name: 'Category Name',
    slug: 'category-slug',
  });

  describe('EventCategorySchema', () => {
    it('should validate valid EventCategorySchema', () => {
      const validInput = getValidEventCategoryInput();
      const {success} = EventCategorySchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const {success, error} = EventCategorySchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should invalidate invalid eventCategoryId format', () => {
      const invalidInput = {
        ...getValidEventCategoryInput(),
        eventCategoryId: 'invalid-id-format',
      };
      const {success, error} = EventCategorySchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe('Event Category eventCategoryId is invalid');
      }
    });
  });

  describe('CreateEventCategorySchema', () => {
    it('should validate valid CreateEventCategorySchema', () => {
      const validInput = {
        ...getValidEventCategoryInput(),
        eventCategoryId: undefined,
      };
      const {success} = CreateEventCategorySchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const invalidInput = {};
      const {success, error} = CreateEventCategorySchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('UpdateEventCategorySchema', () => {
    it('should validate valid UpdateEventCategorySchema', () => {
      const validInput = {
        eventCategoryId: mockID,
        name: 'Updated Category Name',
      };
      const {success} = UpdateEventCategorySchema.safeParse(validInput);
      expect(success).toBe(true);
    });

    it('should invalidate invalid id format', () => {
      const invalidInput = {
        eventCategoryId: 'invalid-id-format',
        name: 'Updated Category Name',
      };
      const {success, error} = UpdateEventCategorySchema.safeParse(invalidInput);
      expect(success).toBe(false);
      if (error) {
        expect(error.errors[0].message).toBe('Event Category eventCategoryId is invalid');
      }
    });
  });
});
