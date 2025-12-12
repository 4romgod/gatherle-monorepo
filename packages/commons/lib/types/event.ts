import 'reflect-metadata';
import {ID, InputType, Field, ObjectType, Int, registerEnumType} from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import {modelOptions, prop, Ref, Severity} from '@typegoose/typegoose';

import {EVENT_DESCRIPTIONS} from '../constants';
import {EventCategory} from './eventCategory';
import {Location} from './location';
import {User} from './user';
import {EventParticipant} from './eventParticipant';

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

@modelOptions({options: {allowMixed: Severity.ALLOW}})
@ObjectType('Media', {description: EVENT_DESCRIPTIONS.EVENT.MEDIA_TYPE})
export class Media {
    @prop()
    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.FEATURED_IMAGE})
    featuredImageUrl?: string;

    @prop({type: () => Object, default: {}})
    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.OTHER_MEDIA_DATA})
    otherMediaData?: Record<string, any>;
}

@ObjectType('MediaAsset', {description: 'Rich media asset associated with an event'})
export class MediaAsset {
    @prop()
    @Field(() => String, {nullable: true})
    mediaId?: string;

    @prop()
    @Field(() => String, {nullable: true})
    type?: string;

    @prop()
    @Field(() => String, {nullable: true})
    url?: string;

    @prop()
    @Field(() => String, {nullable: true})
    alt?: string;

    @prop()
    @Field(() => Number, {nullable: true})
    width?: number;

    @prop()
    @Field(() => Number, {nullable: true})
    height?: number;

    @prop()
    @Field(() => Number, {nullable: true})
    order?: number;
}

@ObjectType('EventSchedule')
export class EventSchedule {
    @prop()
    @Field(() => Date, {nullable: true})
    startAt?: Date;

    @prop()
    @Field(() => Date, {nullable: true})
    endAt?: Date;

    @prop()
    @Field(() => String, {nullable: true})
    timezone?: string;

    @prop()
    @Field(() => String, {nullable: true})
    recurrenceRule?: string;
}

@ObjectType('EventOccurrence')
export class EventOccurrence {
    @prop()
    @Field(() => Date, {nullable: true})
    startAt?: Date;

    @prop()
    @Field(() => Date, {nullable: true})
    endAt?: Date;
}

@ObjectType('EventOrganizer')
export class EventOrganizer {
    @prop()
    @Field(() => ID, {nullable: true})
    userId?: string;

    @prop()
    @Field(() => String, {nullable: true})
    role?: string;
}

@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
@ObjectType('Event', {description: EVENT_DESCRIPTIONS.EVENT.TYPE})
export class Event {
    @prop({required: true, unique: true, index: true})
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @prop({required: true, unique: true, index: true})
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.SLUG})
    slug: string;

    @prop({required: true})
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.TITLE})
    title: string;

    @prop()
    @Field(() => String, {nullable: true, description: 'Short summary for listings'})
    summary?: string;

    @prop({required: true})
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description: string;

    @prop({required: true})
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule: string;

    @prop({type: () => EventSchedule})
    @Field(() => EventSchedule, {nullable: true, description: 'Primary schedule details with timezone/recurrence'})
    primarySchedule?: EventSchedule;

    @prop({type: () => [EventOccurrence], default: []})
    @Field(() => [EventOccurrence], {nullable: true, description: 'Explicit occurrences when generated'})
    occurrences?: EventOccurrence[];

    @prop({type: () => Location, required: true})
    @Field(() => Location, {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location: Location;

    @prop()
    @Field(() => String, {nullable: true, description: 'Snapshot of location for history'})
    locationSnapshot?: string;

    @prop({ref: () => String})
    @Field(() => ID, {nullable: true, description: 'Reference to a venue when available'})
    venueId?: string;

    @prop({required: true, enum: EventStatus})
    @Field(() => EventStatus, {description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status: EventStatus;

    @prop({enum: EventLifecycleStatus})
    @Field(() => EventLifecycleStatus, {nullable: true, description: 'Lifecycle status (draft/published/etc)'})
    lifecycleStatus?: EventLifecycleStatus;

    @prop({enum: EventVisibility})
    @Field(() => EventVisibility, {nullable: true, description: 'Visibility controls for discovery'})
    visibility?: EventVisibility;

    @prop()
    @Field(() => Int, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY})
    capacity?: number;

    @prop()
    @Field(() => Int, {nullable: true, description: 'Optional RSVP/participant limit'})
    rsvpLimit?: number;

    @prop({default: false})
    @Field(() => Boolean, {nullable: true, description: 'Enable waitlist when capacity is reached'})
    waitlistEnabled?: boolean;

    @prop({default: false})
    @Field(() => Boolean, {nullable: true, description: 'Allow plus ones for guests'})
    allowGuestPlusOnes?: boolean;

    @prop({default: false})
    @Field(() => Boolean, {nullable: true, description: 'Enable reminders for attendees'})
    remindersEnabled?: boolean;

    @prop({default: true})
    @Field(() => Boolean, {nullable: true, description: 'Whether attendees list is visible'})
    showAttendees?: boolean;

    @prop({type: () => [String], ref: () => EventCategory, required: true})
    @Field(() => [EventCategory], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: Ref<EventCategory>[];

    @prop({type: () => [String], default: []})
    @Field(() => [String], {nullable: true, description: 'Flattened category ids'})
    categoryIds?: string[];

    @prop({type: () => [String], default: []})
    @Field(() => [String], {nullable: true, description: 'Freeform tags'})
    tagList?: string[];

    @prop({type: () => [String], ref: () => User, required: true})
    @Field(() => [User], {description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST})
    organizerList: Ref<User>[];

    @prop({type: () => [EventOrganizer], default: []})
    @Field(() => [EventOrganizer], {nullable: true, description: 'Organizers with roles'})
    organizers?: EventOrganizer[];

    @prop({type: () => Object, default: {}})
    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS})
    tags?: Record<string, any>;

    @prop({type: () => Media})
    @Field(() => Media, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA})
    media?: Media;

    @prop({type: () => [MediaAsset], default: []})
    @Field(() => [MediaAsset], {nullable: true, description: 'Additional media assets'})
    mediaAssets?: MediaAsset[];

    @prop({type: () => Object, default: {}})
    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS})
    additionalDetails?: Record<string, any>;

    @prop({type: () => Object, default: {}})
    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS})
    comments?: Record<string, any>;

    @prop({enum: EventPrivacySetting})
    @Field(() => EventPrivacySetting, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING})
    privacySetting?: EventPrivacySetting;

    @prop()
    @Field(() => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK})
    eventLink?: string;

    @prop()
    @Field(() => String, {nullable: true, description: 'Organization owning the event'})
    orgId?: string;

    @prop()
    @Field(() => String, {nullable: true, description: 'Hero image for the event'})
    heroImage?: string;

    @Field(() => [EventParticipant], {
        nullable: true,
        description:
            'Resolved participants (not persisted in Event document; resolved via GraphQL field resolver by querying EventParticipant collection)',
    })
    participants?: EventParticipant[];
}

@InputType('CreateEventInput', {description: EVENT_DESCRIPTIONS.EVENT.CREATE_INPUT})
export class CreateEventInput {
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.TITLE})
    title: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule: string;

    @Field(() => GraphQLJSON, {nullable: true, description: 'Primary schedule'})
    primarySchedule?: Record<string, any>;

    @Field((type) => GraphQLJSON, {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location: Record<string, any>;

    @Field(() => String, {nullable: true, description: 'Snapshot of location'})
    locationSnapshot?: string;

    @Field(() => ID, {nullable: true, description: 'Venue reference'})
    venueId?: string;

    @Field(() => EventStatus, {description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status: EventStatus;

    @Field(() => EventLifecycleStatus, {nullable: true, description: 'Lifecycle status'})
    lifecycleStatus?: EventLifecycleStatus;

    @Field(() => EventVisibility, {nullable: true, description: 'Visibility controls'})
    visibility?: EventVisibility;

    @Field(() => Int, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY})
    capacity?: number;

    @Field(() => Int, {nullable: true, description: 'Optional RSVP/participant limit'})
    rsvpLimit?: number;

    @Field(() => Boolean, {nullable: true, description: 'Enable waitlist'})
    waitlistEnabled?: boolean;

    @Field(() => Boolean, {nullable: true, description: 'Allow plus ones'})
    allowGuestPlusOnes?: boolean;

    @Field(() => Boolean, {nullable: true, description: 'Send reminders'})
    remindersEnabled?: boolean;

    @Field(() => Boolean, {nullable: true, description: 'Show attendee list'})
    showAttendees?: boolean;

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: string[];

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST})
    organizerList: string[];

    @Field(() => [String], {nullable: true, description: 'Category ids'})
    categoryIds?: string[];

    @Field(() => [String], {nullable: true, description: 'Freeform tags'})
    tagList?: string[];

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS})
    tags?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA})
    media?: Record<string, any>;

    @Field(() => [GraphQLJSON], {nullable: true, description: 'Additional media assets'})
    mediaAssets?: Record<string, any>[];

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK})
    eventLink?: string;

    @Field(() => String, {nullable: true, description: 'Organization owning the event'})
    orgId?: string;

    @Field(() => String, {nullable: true, description: 'Short summary'})
    summary?: string;

    @Field(() => String, {nullable: true, description: 'Hero image'})
    heroImage?: string;
}

@InputType('UpdateEventInput', {description: EVENT_DESCRIPTIONS.EVENT.UPDATE_INPUT})
export class UpdateEventInput {
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TITLE})
    title?: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description?: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule?: string;

    @Field(() => GraphQLJSON, {nullable: true, description: 'Primary schedule'})
    primarySchedule?: Record<string, any>;

    @Field((type) => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location?: Record<string, any>;

    @Field(() => String, {nullable: true, description: 'Location snapshot'})
    locationSnapshot?: string;

    @Field(() => ID, {nullable: true, description: 'Venue reference'})
    venueId?: string;

    @Field(() => EventStatus, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status?: EventStatus;

    @Field(() => EventLifecycleStatus, {nullable: true, description: 'Lifecycle status'})
    lifecycleStatus?: EventLifecycleStatus;

    @Field(() => EventVisibility, {nullable: true, description: 'Visibility controls'})
    visibility?: EventVisibility;

    @Field(() => Int, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY})
    capacity?: number;

    @Field(() => Int, {nullable: true, description: 'RSVP limit'})
    rsvpLimit?: number;

    @Field(() => Boolean, {nullable: true, description: 'Enable waitlist'})
    waitlistEnabled?: boolean;

    @Field(() => Boolean, {nullable: true, description: 'Allow plus ones'})
    allowGuestPlusOnes?: boolean;

    @Field(() => Boolean, {nullable: true, description: 'Send reminders'})
    remindersEnabled?: boolean;

    @Field(() => Boolean, {nullable: true, description: 'Show attendee list'})
    showAttendees?: boolean;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList?: string[];

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST})
    organizerList?: string[];

    @Field(() => [String], {nullable: true, description: 'Category ids'})
    categoryIds?: string[];

    @Field(() => [String], {nullable: true, description: 'Freeform tags'})
    tagList?: string[];

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS})
    tags?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA})
    media?: Record<string, any>;

    @Field(() => [GraphQLJSON], {nullable: true, description: 'Additional media assets'})
    mediaAssets?: Record<string, any>[];

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK})
    eventLink?: string;

    @Field(() => String, {nullable: true, description: 'Organization owning the event'})
    orgId?: string;

    @Field(() => String, {nullable: true, description: 'Short summary'})
    summary?: string;

    @Field(() => String, {nullable: true, description: 'Hero image'})
    heroImage?: string;
}

@InputType('RsvpInput', {description: EVENT_DESCRIPTIONS.EVENT.RSVP_INPUT_TYPE})
export class RsvpInput {
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USER_ID_LIST})
    userIdList?: string[];

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USERNAME_LIST})
    usernameList?: string[];

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.EMAIL_LIST})
    emailList?: string[];
}

@InputType('CancelRsvpInput', {description: EVENT_DESCRIPTIONS.EVENT.RSVP_INPUT_TYPE})
export class CancelRsvpInput {
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USER_ID_LIST})
    userIdList?: string[];

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USERNAME_LIST})
    usernameList?: string[];

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.EMAIL_LIST})
    emailList?: string[];
}
