import 'reflect-metadata';
import {ID, InputType, Field, ObjectType, Int, registerEnumType} from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import {modelOptions, prop, Ref, Severity} from '@typegoose/typegoose';

import {EVENT_DESCRIPTIONS} from '../constants';
import {EventCategory} from './eventCategory';
import {Location} from './location';
import {User} from './user';

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

registerEnumType(EventPrivacySetting, {
    name: 'EventPrivacySetting',
    description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING,
});

registerEnumType(EventStatus, {
    name: 'EventStatus',
    description: EVENT_DESCRIPTIONS.EVENT.STATUS,
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

    @prop({required: true})
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description: string;

    @prop({required: true})
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule: string;

    @prop({type: () => Location, required: true})
    @Field(() => Location, {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location: Location;

    @prop({required: true, enum: EventStatus})
    @Field(() => EventStatus, {description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status: EventStatus;

    @prop()
    @Field(() => Int, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY})
    capacity?: number;

    @prop({type: () => [String], ref: () => EventCategory, required: true})
    @Field(() => [EventCategory], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: Ref<EventCategory>[];

    @prop({type: () => [String], ref: () => User, required: true})
    @Field(() => [User], {description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST})
    organizerList: Ref<User>[];

    @prop({type: () => [String], ref: () => User, required: true})
    @Field(() => [User], {description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIST})
    rSVPList: Ref<User>[];

    @prop({type: () => Object, default: {}})
    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS})
    tags?: Record<string, any>;

    @prop({type: () => Media})
    @Field(() => Media, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA})
    media?: Media;

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
}

@InputType('CreateEventInput', {description: EVENT_DESCRIPTIONS.EVENT.CREATE_INPUT})
export class CreateEventInput {
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.TITLE})
    title: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule: string;

    @Field((type) => GraphQLJSON, {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location: Record<string, any>;

    @Field(() => EventStatus, {description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status: EventStatus;

    @Field(() => Int, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY})
    capacity?: number;

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: string[];

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST})
    organizerList: string[];

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIST})
    rSVPList: string[];

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS})
    tags?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA})
    media?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK})
    eventLink?: string;
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

    @Field((type) => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location?: Record<string, any>;

    @Field(() => EventStatus, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status?: EventStatus;

    @Field(() => Int, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY})
    capacity?: number;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList?: string[];

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST})
    organizerList?: string[];

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIST})
    rSVPList?: string[];

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS})
    tags?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA})
    media?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK})
    eventLink?: string;
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
