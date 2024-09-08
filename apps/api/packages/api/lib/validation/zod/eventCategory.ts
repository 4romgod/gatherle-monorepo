import {z} from 'zod';
import {ERROR_MESSAGES} from '@/validation';
import mongoose from 'mongoose';

export const EventCategoryTypeSchema = z.object({
  eventCategoryId: z
    .string()
    .refine(mongoose.Types.ObjectId.isValid, {message: `Event Category eventCategoryId ${ERROR_MESSAGES.INVALID}`})
    .describe('The unique ID of the Event Category.'),

  color: z.string().min(2).optional().describe('The color associated with the Event Category.'),

  description: z
    .string()
    .min(2, {message: `Description ${ERROR_MESSAGES.REQUIRED}`})
    .describe('The description of the Event Category.'),

  iconName: z
    .string()
    .min(2, {message: `Icon name ${ERROR_MESSAGES.REQUIRED}`})
    .describe('The name of the icon representing the Event Category.'),

  name: z
    .string()
    .min(2, {message: `Name ${ERROR_MESSAGES.REQUIRED}`})
    .describe('The name of the Event Category.'),

  slug: z
    .string()
    .min(2, {message: `Slug ${ERROR_MESSAGES.REQUIRED}`})
    .describe('The unique slug of the Event Category. This is a URL-friendly string.'),
});

export const CreateEventCategoryTypeSchema = EventCategoryTypeSchema.extend({})
  .omit({eventCategoryId: true, slug: true})
  .describe('Schema for creating a new Event Category. All fields except ID are required.');

export const UpdateEventCategoryTypeSchema = EventCategoryTypeSchema.partial()
  .extend({
    eventCategoryId: z
      .string()
      .refine(mongoose.Types.ObjectId.isValid, {message: `Event Category eventCategoryId ${ERROR_MESSAGES.INVALID}`})
      .describe('The unique ID of the Event Category. This field is required for updates.'),
  })
  .describe('Schema for updating an existing Event Category. Fields are optional.');
