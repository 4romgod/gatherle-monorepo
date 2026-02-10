import { z } from 'zod';
import {
  EventLifecycleStatus,
  EventOrganizerRole,
  EventPrivacySetting,
  EventStatus,
  EventVisibility,
} from '@ntlango/commons/types/event';
import { ERROR_MESSAGES } from '@/validation';
import mongoose from 'mongoose';

export const EventSchema = z.object({
  eventId: z
    .string()
    .refine(mongoose.Types.ObjectId.isValid, { message: `Event ID ${ERROR_MESSAGES.INVALID}` })
    .describe('The unique ID of the Event.'),

  slug: z
    .string()
    .min(2, { message: `Slug ${ERROR_MESSAGES.REQUIRED}` })
    .describe('The unique slug of the event. (It is different from the ID)'),

  title: z
    .string()
    .min(2, { message: `Title ${ERROR_MESSAGES.REQUIRED}` })
    .describe('The title of the event.'),

  description: z
    .string()
    .min(2, { message: `Description ${ERROR_MESSAGES.REQUIRED}` })
    .describe('The description of the event.'),

  summary: z.string().optional().describe('Short summary for listings'),

  recurrenceRule: z
    .string()
    .min(0, { message: `RecurrenceRule is not valid` })
    .refine(() => true, { message: 'RecurrenceRule is invalid' })
    .describe('The recurrence rule for the event, specifying if and how the event repeats.'),

  primarySchedule: z.any().optional().describe('Primary schedule details'),

  // TODO add validation for location
  location: z.any().describe('The location where the event will take place.'),

  locationSnapshot: z.string().optional().describe('Snapshot of location'),

  venueId: z.string().optional().describe('Venue reference'),

  status: z
    .nativeEnum(EventStatus, { message: ERROR_MESSAGES.INVALID_EVENT_STATUS })
    .describe('The current status of the event (e.g., Scheduled, Cancelled).'),

  lifecycleStatus: z.nativeEnum(EventLifecycleStatus).optional().describe('Lifecycle status'),

  visibility: z.nativeEnum(EventVisibility).optional().describe('Visibility controls'),

  capacity: z.number().int().positive().optional().describe('The maximum number of attendees allowed for the event.'),

  rsvpLimit: z.number().int().positive().optional().describe('RSVP/participant limit'),

  waitlistEnabled: z.boolean().optional().describe('Enable waitlist'),

  allowGuestPlusOnes: z.boolean().optional().describe('Allow plus ones'),

  remindersEnabled: z.boolean().optional().describe('Enable reminders'),

  showAttendees: z.boolean().optional().describe('Show attendee list'),

  eventCategories: z
    .array(
      z.string().refine(mongoose.Types.ObjectId.isValid, { message: `Event Category ID ${ERROR_MESSAGES.INVALID}` }),
    )
    .min(1, { message: ERROR_MESSAGES.ATLEAST_ONE('event category') })
    .describe('The categories associated with the event.'),

  organizers: z
    .array(
      z.object({
        user: z.string().refine(mongoose.Types.ObjectId.isValid, { message: `User ID ${ERROR_MESSAGES.INVALID}` }),
        role: z.nativeEnum(EventOrganizerRole),
      }),
    )
    .min(1, { message: 'At least one organizer is required' })
    .describe('The list of organizers for the event with their roles.'),

  tags: z
    .record(z.any())
    .optional()
    .describe('A set of tags associated with the event for categorization or search purposes.'),

  media: z
    .object({
      featuredImageUrl: z.string(),
      otherMediaData: z.record(z.any()).optional(),
    })
    .optional()
    .describe('Media related to the event, including the featured image URL and other media data.'),

  additionalDetails: z.record(z.any()).optional().describe('Any additional details about the event.'),

  comments: z.record(z.any()).optional().describe('Comments related to the event.'),

  privacySetting: z
    .nativeEnum(EventPrivacySetting)
    .optional()
    .describe('The privacy setting of the event, indicating who can view or attend.'),

  eventLink: z.string().optional().describe('A link to the event page or further information about the event.'),

  orgId: z.string().optional().describe('Organization owner'),
});

export const CreateEventInputSchema = EventSchema.extend({}).omit({ eventId: true, slug: true });

export const UpdateEventInputSchema = EventSchema.partial()
  .extend({
    eventId: z
      .string()
      .describe('The unique ID of the Event. (It is a required field)')
      .refine(mongoose.Types.ObjectId.isValid, {
        message: `Event with eventCategoryId ${ERROR_MESSAGES.DOES_NOT_EXIST}`,
      }),
  })
  .omit({ slug: true });
