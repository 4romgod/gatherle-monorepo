import 'reflect-metadata';
import { ID, InputType, Field, ObjectType, Int, registerEnumType } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import type { Ref } from '@typegoose/typegoose';
import { modelOptions, prop, Severity } from '@typegoose/typegoose';

import { EVENT_DESCRIPTIONS } from '../constants';
import { EventCategory } from './eventCategory';
import { Location } from './location';
import { User } from './user';
import { EventSeriesParticipant } from './eventSeriesParticipant';
import { Organization } from './organization';
import { EventOccurrence } from './eventOccurrence';

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
  description: EVENT_DESCRIPTIONS.EVENT.VISIBILITY,
});

registerEnumType(EventLifecycleStatus, {
  name: 'EventLifecycleStatus',
  description: EVENT_DESCRIPTIONS.EVENT.LIFECYCLE_STATUS,
});

registerEnumType(EventOrganizerRole, {
  name: 'EventOrganizerRole',
  description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_ROLE,
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

@ObjectType('EventSchedule', { description: EVENT_DESCRIPTIONS.EVENT.SCHEDULE_TYPE })
export class EventSchedule {
  @prop({ type: () => Date, required: true })
  @Field(() => Date, { description: EVENT_DESCRIPTIONS.EVENT.ANCHOR_START_AT })
  anchorStartAt: Date;

  @prop({ type: () => Number, required: true, default: 0 })
  @Field(() => Int, { description: EVENT_DESCRIPTIONS.EVENT.OCCURRENCE_DURATION_MINUTES })
  occurrenceDurationMinutes: number;

  @prop({ type: () => String, required: true })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.TIMEZONE })
  timezone: string;

  @prop({ type: () => String, required: true })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE })
  recurrenceRule: string;
}

@ObjectType('EventOrganizer', { description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_TYPE })
export class EventOrganizer {
  @prop({ ref: () => User, type: () => String, required: true })
  @Field(() => User, { description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_USER })
  user: Ref<User>;

  @prop({ enum: EventOrganizerRole, type: () => String, required: true })
  @Field(() => EventOrganizerRole, { description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_ROLE })
  role: EventOrganizerRole;
}

@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@ObjectType('EventSeries', { description: EVENT_DESCRIPTIONS.EVENT.TYPE })
export class EventSeries {
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
  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SUMMARY })
  summary?: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION })
  description: string;

  @prop({ type: () => EventSchedule, required: true, _id: false })
  @Field(() => EventSchedule, { description: EVENT_DESCRIPTIONS.EVENT.PRIMARY_SCHEDULE })
  primarySchedule: EventSchedule;

  // Internal counter bumped on schedule changes so occurrence regeneration can
  // tell which version of the series schedule produced a given occurrence row.
  @prop({ type: () => Number, default: 1 })
  scheduleVersion?: number;

  @prop({ type: () => Location, required: true })
  @Field(() => Location, { description: EVENT_DESCRIPTIONS.EVENT.LOCATION })
  location: Location;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION_SNAPSHOT })
  locationSnapshot?: string;

  @prop({ ref: () => String, type: () => String })
  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VENUE_ID })
  venueId?: string;

  @prop({ required: true, enum: EventStatus, type: () => String })
  @Field(() => EventStatus, { description: EVENT_DESCRIPTIONS.EVENT.STATUS })
  status: EventStatus;

  @prop({ enum: EventLifecycleStatus, type: () => String })
  @Field(() => EventLifecycleStatus, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LIFECYCLE_STATUS })
  lifecycleStatus?: EventLifecycleStatus;

  @prop({ enum: EventVisibility, type: () => String })
  @Field(() => EventVisibility, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VISIBILITY })
  visibility?: EventVisibility;

  @prop({ type: () => Number })
  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY })
  capacity?: number;

  @prop({ type: () => Number })
  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIMIT })
  rsvpLimit?: number;

  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.WAITLIST_ENABLED })
  waitlistEnabled?: boolean;

  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ALLOW_GUEST_PLUS_ONES })
  allowGuestPlusOnes?: boolean;

  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.REMINDERS_ENABLED })
  remindersEnabled?: boolean;

  @prop({ default: true, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SHOW_ATTENDEES })
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
  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ORGANIZATION_ID })
  orgId?: string;

  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SPLIT_FROM_EVENT_SERIES_ID })
  splitFromEventSeriesId?: string;

  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SPLIT_INTO_EVENT_SERIES_ID })
  splitIntoEventSeriesId?: string;

  @Field(() => Organization, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.EVENT.ORGANIZATION,
  })
  organization?: Organization;

  @Field(() => [EventSeriesParticipant], {
    nullable: true,
    description: EVENT_DESCRIPTIONS.EVENT.PARTICIPANTS,
  })
  participants?: EventSeriesParticipant[];

  @Field(() => EventOccurrence, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.EVENT.REPRESENTATIVE_OCCURRENCE,
  })
  representativeOccurrence?: EventOccurrence;

  // Computed fields populated via aggregation helpers (not persisted on the document)
  @Field(() => Number, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.EVENT.SAVED_BY_COUNT,
  })
  savedByCount?: number;

  @Field(() => Number, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.EVENT.RSVP_COUNT,
  })
  rsvpCount?: number;
}

@InputType('CreateEventInput', { description: EVENT_DESCRIPTIONS.EVENT.CREATE_INPUT })
export class CreateEventInput {
  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.TITLE })
  title: string;

  @Field(() => String, { description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION })
  description: string;

  @Field(() => GraphQLJSON, { description: EVENT_DESCRIPTIONS.EVENT.PRIMARY_SCHEDULE })
  primarySchedule: Record<string, any>;

  // TODO Should the type be like this (or be location type)
  @Field(() => GraphQLJSON, { description: EVENT_DESCRIPTIONS.EVENT.LOCATION })
  location: Record<string, any>;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION_SNAPSHOT })
  locationSnapshot?: string;

  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VENUE_ID })
  venueId?: string;

  @Field(() => EventStatus, { description: EVENT_DESCRIPTIONS.EVENT.STATUS })
  status: EventStatus;

  @Field(() => EventLifecycleStatus, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LIFECYCLE_STATUS })
  lifecycleStatus?: EventLifecycleStatus;

  @Field(() => EventVisibility, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VISIBILITY })
  visibility?: EventVisibility;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY })
  capacity?: number;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIMIT })
  rsvpLimit?: number;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.WAITLIST_ENABLED })
  waitlistEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ALLOW_GUEST_PLUS_ONES })
  allowGuestPlusOnes?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.REMINDERS_ENABLED })
  remindersEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SHOW_ATTENDEES })
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

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ORGANIZATION_ID })
  orgId?: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SUMMARY })
  summary?: string;
}

@InputType('UpdateEventInput', { description: EVENT_DESCRIPTIONS.EVENT.UPDATE_INPUT })
export class UpdateEventInput {
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.EVENT.ID })
  eventId: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TITLE })
  title?: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION })
  description?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.EVENT.PRIMARY_SCHEDULE,
  })
  primarySchedule?: Record<string, any>;

  // TODO Should the type be like this (or be location type)
  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION })
  location?: Record<string, any>;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION_SNAPSHOT })
  locationSnapshot?: string;

  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VENUE_ID })
  venueId?: string;

  @Field(() => EventStatus, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.STATUS })
  status?: EventStatus;

  @Field(() => EventLifecycleStatus, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LIFECYCLE_STATUS })
  lifecycleStatus?: EventLifecycleStatus;

  @Field(() => EventVisibility, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VISIBILITY })
  visibility?: EventVisibility;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY })
  capacity?: number;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIMIT })
  rsvpLimit?: number;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.WAITLIST_ENABLED })
  waitlistEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ALLOW_GUEST_PLUS_ONES })
  allowGuestPlusOnes?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.REMINDERS_ENABLED })
  remindersEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SHOW_ATTENDEES })
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

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ORGANIZATION_ID })
  orgId?: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SUMMARY })
  summary?: string;
}

@InputType('SplitEventSeriesInput', { description: EVENT_DESCRIPTIONS.EVENT.SPLIT_INPUT })
export class SplitEventSeriesInput {
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.EVENT.SPLIT_OCCURRENCE_ID })
  occurrenceId: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TITLE })
  title?: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION })
  description?: string;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SUMMARY })
  summary?: string;

  @Field(() => GraphQLJSON, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION })
  location?: Record<string, any>;

  @Field(() => String, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION_SNAPSHOT })
  locationSnapshot?: string;

  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VENUE_ID })
  venueId?: string;

  @Field(() => EventStatus, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.STATUS })
  status?: EventStatus;

  @Field(() => EventVisibility, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.VISIBILITY })
  visibility?: EventVisibility;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY })
  capacity?: number;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIMIT })
  rsvpLimit?: number;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.WAITLIST_ENABLED })
  waitlistEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ALLOW_GUEST_PLUS_ONES })
  allowGuestPlusOnes?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.REMINDERS_ENABLED })
  remindersEnabled?: boolean;

  @Field(() => Boolean, { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.SHOW_ATTENDEES })
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
