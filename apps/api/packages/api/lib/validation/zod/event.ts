import {z} from 'zod';
import {EventPrivacySetting, EventStatus} from '@/graphql/types';
import {ERROR_MESSAGES} from '@/validation';
import mongoose from 'mongoose';

export const EventTypeSchema = z.object({
  eventId: z
    .string()
    .refine(mongoose.Types.ObjectId.isValid, {message: `Event ID ${ERROR_MESSAGES.INVALID}`})
    .describe('The unique ID of the Event.'),

  slug: z
    .string()
    .min(2, {message: `Slug ${ERROR_MESSAGES.REQUIRED}`})
    .describe('The unique slug of the event. (It is different from the ID)'),

  title: z
    .string()
    .min(2, {message: `Title ${ERROR_MESSAGES.REQUIRED}`})
    .describe('The title of the event.'),

  description: z
    .string()
    .min(2, {message: `Description ${ERROR_MESSAGES.REQUIRED}`})
    .describe('The description of the event.'),

  recurrenceRule: z
    .string()
    .min(0, {message: `RecurrenceRule is not valid`})
    .refine(() => true, {message: 'RecurrenceRule is invalid'})
    .describe('The recurrence rule for the event, specifying if and how the event repeats.'),

  // TODO add validation for location
  location: z.any().describe('The location where the event will take place.'),

  status: z
    .nativeEnum(EventStatus, {message: ERROR_MESSAGES.INVALID_EVENT_STATUS})
    .describe('The current status of the event (e.g., Scheduled, Cancelled).'),

  capacity: z.number().int().positive().optional().describe('The maximum number of attendees allowed for the event.'),

  eventCategoryList: z
    .array(z.string())
    .min(1, {message: ERROR_MESSAGES.ATLEAST_ONE('event category')})
    .describe('The categories associated with the event.'),

  organizerList: z
    .array(z.string().refine(mongoose.Types.ObjectId.isValid, {message: `Event ID ${ERROR_MESSAGES.INVALID}`}))
    .min(1, {message: 'At least one organizer is required'})
    .describe('The list of organizers for the event, identified by their IDs.'),

  rSVPList: z
    .array(z.string().refine(mongoose.Types.ObjectId.isValid, {message: `Event ID ${ERROR_MESSAGES.INVALID}`}))
    .describe('The list of RSVPs for the event, identified by their IDs.'),

  tags: z.record(z.any()).optional().describe('A set of tags associated with the event for categorization or search purposes.'),

  media: z
    .object({
      featuredImageUrl: z.string(),
      otherMediaData: z.record(z.any()).optional(),
    })
    .optional()
    .describe('Media related to the event, including the featured image URL and other media data.'),

  additionalDetails: z.record(z.any()).optional().describe('Any additional details about the event.'),

  comments: z.record(z.any()).optional().describe('Comments related to the event.'),

  privacySetting: z.nativeEnum(EventPrivacySetting).optional().describe('The privacy setting of the event, indicating who can view or attend.'),

  eventLink: z.string().optional().describe('A link to the event page or further information about the event.'),
});

export const CreateEventInputTypeSchema = EventTypeSchema.extend({}).omit({eventId: true, slug: true});

export const UpdateEventInputTypeSchema = EventTypeSchema.partial()
  .extend({
    eventId: z
      .string()
      .describe('The unique ID of the Event. (It is a required field)')
      .refine(mongoose.Types.ObjectId.isValid, {message: `Event with eventCategoryId ${ERROR_MESSAGES.DOES_NOT_EXIST}`}),
  })
  .omit({slug: true});
