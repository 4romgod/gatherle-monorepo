import 'reflect-metadata';
import { ID, InputType, Field, ObjectType, Int, registerEnumType } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import type { Ref } from '@typegoose/typegoose';
import { modelOptions, prop, Severity } from '@typegoose/typegoose';

import { EVENT_DESCRIPTIONS } from '../constants';
import { EventCategory } from './eventCategory';
import { Location } from './location';
import { User } from './user';
import { EventParticipant } from './eventParticipant';

export enum EventPrivacySetting {
  Public = 'Public',
  Private = 'Private',
  Invitation = 'Invitation',
}

export enum EventStatus {
  Cancelled = 'Cancelled',
  Completed = 'Completed',
  Ongoing = 'Ongoing',
  Upcoming = 'Upcoming',
}

export enum EventVisibility {
  Public = 'Public',
  Private = 'Private',
  Unlisted = 'Unlisted',
  Invitation = 'Invitation',
}

export enum EventLifecycleStatus {
  Draft = 'Draft',
  Published = 'Published',
  Cancelled = 'Cancelled',
  Completed = 'Completed',
}

export enum EventOrganizerRole {
  Host = 'Host',
  CoHost = 'CoHost',
  Volunteer = 'Volunteer',
}

registerEnumType(EventPrivacySetting, {
  name: 'EventPrivacySetting',
  description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING,
});

registerEnumType(EventStatus, {
  name: 'EventStatus',
  description: EVENT_DESCRIPTIONS.EVENT.STATUS,
});

registerEnumType(EventVisibility, {
  name: 'EventVisibility',
  description: 'Visibility of the event',
});

registerEnumType(EventLifecycleStatus, {
  name: 'EventLifecycleStatus',
  description: 'Lifecycle status of the event',
});

registerEnumType(EventOrganizerRole, {
  name: 'EventOrganizerRole',
  description: 'Role of an event organizer',
});

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
@ObjectType('Media', { description: EVENT_DESCRIPTIONS.EVENT.MEDIA_TYPE })
export class Media {
  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.FEATURED_IMAGE })
  featuredImageUrl?: string;

  @prop({ type: () => Object, default: {} })
  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.OTHER_MEDIA_DATA })
  otherMediaData?: Record<string, any>;
}

@ObjectType('EventSchedule')
export class EventSchedule {
  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true })
  startAt?: Date;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true })
  endAt?: Date;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true })
  timezone?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true })
  recurrenceRule?: string;
}

@ObjectType('EventOrganizer')
export class EventOrganizer {
  @prop({ ref: () => User, type: () => String, required: true })
  @Field(() => User, { description: 'User reference for the organizer' })
  user: Ref<User>;

  @prop({ enum: EventOrganizerRole, type: () => String, required: true })
  @Field(() => EventOrganizerRole, { description: 'Role of the organizer' })
  role: EventOrganizerRole;
}

@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@ObjectType('Event', { description: EVENT_DESCRIPTIONS.EVENT.TYPE })
export class Event {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.EVENT.ID })
  eventId: string;

  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.SLUG })
  slug: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.TITLE })
  title: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: 'Short summary for listings' })
  summary?: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION })
  description: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE })
  recurrenceRule: string;

  @prop({ type: () => EventSchedule })
  @Field(() => EventSchedule, { nullable: true, description: 'Primary schedule details with timezone/recurrence' })
  primarySchedule?: EventSchedule;

  @prop({ type: () => Location, required: true })
  @Field(() => Location, { description: EVENT_DESCRIPTIONS.EVENT.LOCATION })
  location: Location;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: 'Snapshot of location for history' })
  locationSnapshot?: string;

  @prop({ ref: () => String, type: () => String })
  @Field(() => ID, { nullable: true, description: 'Reference to a venue when available' })
  venueId?: string;

  @prop({ required: true, enum: EventStatus, type: () => String })
  @Field(() => EventStatus, { description: EVENT_DESCRIPTIONS.EVENT.STATUS })
  status: EventStatus;

  @prop({ enum: EventLifecycleStatus, type: () => String })
  @Field(() => EventLifecycleStatus, { nullable: true, description: 'Lifecycle status (draft/published/etc)' })
  lifecycleStatus?: EventLifecycleStatus;

  @prop({ enum: EventVisibility, type: () => String })
  @Field(() => EventVisibility, { nullable: true, description: 'Visibility controls for discovery' })
  visibility?: EventVisibility;

  @prop({ type: () => Number })
  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY })
  capacity?: number;

  @prop({ type: () => Number })
  @Field(() => Int, { nullable: true, description: 'Optional RSVP/participant limit' })
  rsvpLimit?: number;

  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: 'Enable waitlist when capacity is reached' })
  waitlistEnabled?: boolean;

  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: 'Allow plus ones for guests' })
  allowGuestPlusOnes?: boolean;

  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: 'Enable reminders for attendees' })
  remindersEnabled?: boolean;

  @prop({ default: true, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: 'Whether attendees list is visible' })
  showAttendees?: boolean;

  @prop({ type: () => [String], ref: () => EventCategory, required: true })
  @Field(() => [EventCategory], { description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  eventCategories: Ref<EventCategory>[];

  @prop({ type: () => [EventOrganizer], required: true })
  @Field(() => [EventOrganizer], { description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST })
  organizers: EventOrganizer[];

  @prop({ type: () => Object, default: {} })
  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS })
  tags?: Record<string, any>;

  @prop({ type: () => Media })
  @Field(() => Media, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA })
  media?: Media;

  @prop({ type: () => Object, default: {} })
  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS })
  additionalDetails?: Record<string, any>;

  @prop({ type: () => Object, default: {} })
  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS })
  comments?: Record<string, any>;

  @prop({ enum: EventPrivacySetting, type: () => String })
  @Field(() => EventPrivacySetting, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING })
  privacySetting?: EventPrivacySetting;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK })
  eventLink?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: 'Organization owning the event' })
  orgId?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: 'Hero image for the event' })
  heroImage?: string;

  @Field(() => [EventParticipant], {
    nullable: true,
    description:
      'Resolved participants populated via $lookup aggregation (not persisted in Event document; queried from EventParticipant collection)',
  })
  participants?: EventParticipant[];

  // Computed fields populated via aggregation helpers (not persisted on the document)
  @Field(() => Number, {
    nullable: true,
    description: 'Number of users who have saved the event (computed via follows lookup)',
  })
  savedByCount?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Number of RSVPs (Going or Interested) computed during aggregation',
  })
  rsvpCount?: number;
}

@InputType('CreateEventInput', { description: EVENT_DESCRIPTIONS.EVENT.CREATE_INPUT })
export class CreateEventInput {
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.TITLE })
  title: string;

  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION })
  description: string;

  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE })
  recurrenceRule: string;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Primary schedule' })
  primarySchedule?: Record<string, any>;

  // TODO Should the type be like this (or be location type)
  @Field(() => GraphQLJSON, { description: EVENT_DESCRIPTIONS.EVENT.LOCATION })
  location: Record<string, any>;

  @Field(() => String, { nullable: true, description: 'Snapshot of location' })
  locationSnapshot?: string;

  @Field(() => ID, { nullable: true, description: 'Venue reference' })
  venueId?: string;

  @Field(() => EventStatus, { description: EVENT_DESCRIPTIONS.EVENT.STATUS })
  status: EventStatus;

  @Field(() => EventLifecycleStatus, { nullable: true, description: 'Lifecycle status' })
  lifecycleStatus?: EventLifecycleStatus;

  @Field(() => EventVisibility, { nullable: true, description: 'Visibility controls' })
  visibility?: EventVisibility;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY })
  capacity?: number;

  @Field(() => Int, { nullable: true, description: 'Optional RSVP/participant limit' })
  rsvpLimit?: number;

  @Field(() => Boolean, { nullable: true, description: 'Enable waitlist' })
  waitlistEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: 'Allow plus ones' })
  allowGuestPlusOnes?: boolean;

  @Field(() => Boolean, { nullable: true, description: 'Send reminders' })
  remindersEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: 'Show attendee list' })
  showAttendees?: boolean;

  @Field(() => [String], { description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  eventCategories: string[];

  @Field(() => [GraphQLJSON], { description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST })
  organizers: Array<{ user: string; role: string }>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS })
  tags?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA })
  media?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS })
  additionalDetails?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS })
  comments?: Record<string, any>;

  @Field(() => EventPrivacySetting, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING })
  privacySetting?: EventPrivacySetting;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK })
  eventLink?: string;

  @Field(() => String, { nullable: true, description: 'Organization owning the event' })
  orgId?: string;

  @Field(() => String, { nullable: true, description: 'Short summary' })
  summary?: string;

  @Field(() => String, { nullable: true, description: 'Hero image' })
  heroImage?: string;
}

@InputType('UpdateEventInput', { description: EVENT_DESCRIPTIONS.EVENT.UPDATE_INPUT })
export class UpdateEventInput {
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.EVENT.ID })
  eventId: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TITLE })
  title?: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION })
  description?: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE })
  recurrenceRule?: string;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Primary schedule' })
  primarySchedule?: Record<string, any>;

  // TODO Should the type be like this (or be location type)
  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION })
  location?: Record<string, any>;

  @Field(() => String, { nullable: true, description: 'Location snapshot' })
  locationSnapshot?: string;

  @Field(() => ID, { nullable: true, description: 'Venue reference' })
  venueId?: string;

  @Field(() => EventStatus, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.STATUS })
  status?: EventStatus;

  @Field(() => EventLifecycleStatus, { nullable: true, description: 'Lifecycle status' })
  lifecycleStatus?: EventLifecycleStatus;

  @Field(() => EventVisibility, { nullable: true, description: 'Visibility controls' })
  visibility?: EventVisibility;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY })
  capacity?: number;

  @Field(() => Int, { nullable: true, description: 'RSVP limit' })
  rsvpLimit?: number;

  @Field(() => Boolean, { nullable: true, description: 'Enable waitlist' })
  waitlistEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: 'Allow plus ones' })
  allowGuestPlusOnes?: boolean;

  @Field(() => Boolean, { nullable: true, description: 'Send reminders' })
  remindersEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: 'Show attendee list' })
  showAttendees?: boolean;

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  eventCategories?: string[];

  @Field(() => [GraphQLJSON], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST })
  organizers?: Array<{ user: string; role: string }>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS })
  tags?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA })
  media?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS })
  additionalDetails?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS })
  comments?: Record<string, any>;

  @Field(() => EventPrivacySetting, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING })
  privacySetting?: EventPrivacySetting;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK })
  eventLink?: string;

  @Field(() => String, { nullable: true, description: 'Organization owning the event' })
  orgId?: string;

  @Field(() => String, { nullable: true, description: 'Short summary' })
  summary?: string;

  @Field(() => String, { nullable: true, description: 'Hero image' })
  heroImage?: string;
}

@InputType('RsvpInput', { description: EVENT_DESCRIPTIONS.EVENT.RSVP_INPUT_TYPE })
export class RsvpInput {
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.EVENT.ID })
  eventId: string;

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USER_ID_LIST })
  userIdList?: string[];

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USERNAME_LIST })
  usernameList?: string[];

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.RSVP.EMAIL_LIST })
  emailList?: string[];
}

@InputType('CancelRsvpInput', { description: EVENT_DESCRIPTIONS.EVENT.RSVP_INPUT_TYPE })
export class CancelRsvpInput {
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.EVENT.ID })
  eventId: string;

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USER_ID_LIST })
  userIdList?: string[];

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USERNAME_LIST })
  usernameList?: string[];

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.RSVP.EMAIL_LIST })
  emailList?: string[];
}
