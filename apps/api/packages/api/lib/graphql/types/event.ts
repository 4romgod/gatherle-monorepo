import 'reflect-metadata';
import {ID, InputType, Field, ObjectType, Int, registerEnumType} from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import {UserType} from './user';
import {EventCategoryType} from './eventCategory';
import {EVENT_DESCRIPTIONS} from '@/constants';

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

@ObjectType({description: EVENT_DESCRIPTIONS.EVENT.MEDIA_TYPE})
export class Media {
    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.FEATURED_IMAGE})
    featuredImageUrl?: string;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.OTHER_MEDIA_DATA})
    otherMediaData?: Record<string, any>;
}

@ObjectType({description: EVENT_DESCRIPTIONS.EVENT.TYPE})
export class EventType {
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.SLUG})
    slug: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.TITLE})
    title: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description: string;

    @Field(() => String, {description: EVENT_DESCRIPTIONS.EVENT.START_DATE_TIME})
    startDateTime: string;

    @Field(() => String, {description: EVENT_DESCRIPTIONS.EVENT.END_DATE_TIME})
    endDateTime: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule?: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location: string;

    @Field(() => EventStatus, {description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status: EventStatus;

    @Field(() => Int, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.CAPACITY})
    capacity?: number;

    @Field(() => [EventCategoryType], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: EventCategoryType[];

    @Field(() => [UserType], {description: EVENT_DESCRIPTIONS.EVENT.ORGANIZER_LIST})
    organizerList: UserType[];

    @Field(() => [UserType], {description: EVENT_DESCRIPTIONS.EVENT.RSVP_LIST})
    rSVPList: UserType[];

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TAGS})
    tags?: Record<string, any>;

    @Field(() => Media, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.MEDIA})
    media?: Media;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.ADDITIONAL_DETAILS})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.COMMENTS})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.PRIVACY_SETTING})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_LINK})
    eventLink?: string;
}

@InputType({description: EVENT_DESCRIPTIONS.EVENT.CREATE_INPUT})
export class CreateEventInputType {
    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.TITLE})
    title: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.START_DATE_TIME})
    startDateTime: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.END_DATE_TIME})
    endDateTime: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule?: string;

    @Field((type) => String, {description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location: string;

    @Field(() => EventStatus, {description: EVENT_DESCRIPTIONS.EVENT.STATUS})
    status: EventStatus; // TODO set this according to date

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

@InputType({description: EVENT_DESCRIPTIONS.EVENT.UPDATE_INPUT})
export class UpdateEventInputType {
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.TITLE})
    title?: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.DESCRIPTION})
    description?: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.START_DATE_TIME})
    startDateTime?: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.END_DATE_TIME})
    endDateTime?: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.RECURRENCE_RULE})
    recurrenceRule?: string;

    @Field((type) => String, {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.LOCATION})
    location?: string;

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

@InputType({description: EVENT_DESCRIPTIONS.EVENT.RSVP_INPUT_TYPE})
export class RSVPInputType {
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USER_ID_LIST})
    userIdList?: string[];

    // TODO write logic to RSVP users by their usernames
    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USERNAME_LIST})
    usernameList?: string[];

    // TODO write logic to RSVP users by their emails
    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.EMAIL_LIST})
    emailList?: string[];
}

@InputType({description: EVENT_DESCRIPTIONS.EVENT.RSVP_INPUT_TYPE})
export class CancelRSVPInputType {
    @Field((type) => ID, {description: EVENT_DESCRIPTIONS.EVENT.ID})
    eventId: string;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USER_ID_LIST})
    userIdList?: string[];

    // TODO write logic to cancel RSVP for users by their usernames
    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.USERNAME_LIST})
    usernameList?: string[];

    // TODO write logic to cancel RSVP for users by their emails
    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.RSVP.EMAIL_LIST})
    emailList?: string[];
}
