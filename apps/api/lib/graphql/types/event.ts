import 'reflect-metadata';
import {InputType, Field, ObjectType, Int, registerEnumType} from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import {UserType} from './user';
import {EventCategoryType} from './eventCategory';

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
});

registerEnumType(EventStatus, {
    name: 'EventStatus',
});

@ObjectType()
export class Media {
    @Field({nullable: true})
    featuredImageUrl?: string;

    @Field(() => GraphQLJSON, {nullable: true})
    otherMediaData?: Record<string, any>;
}

@ObjectType()
export class EventType {
    @Field()
    id: string;

    @Field()
    slug: string;

    @Field()
    title: string;

    @Field()
    description: string;

    @Field(() => Date)
    startDateTime: Date;

    @Field(() => Date)
    endDateTime: Date;

    @Field({nullable: true})
    recurrenceRule?: string;

    @Field()
    location: string;

    @Field(() => EventStatus)
    status: EventStatus;

    @Field(() => Int, {nullable: true})
    capacity?: number;

    @Field(() => [EventCategoryType])
    eventCategory: EventCategoryType[];

    @Field(() => [UserType])
    organizers: UserType[];

    @Field(() => [UserType])
    rSVPs: UserType[];

    @Field(() => GraphQLJSON, {nullable: true})
    tags?: Record<string, any>;

    @Field(() => Media, {nullable: true})
    media?: Media;

    @Field(() => GraphQLJSON, {nullable: true})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true})
    eventLink?: string;
}

@InputType()
export class CreateEventInputType {
    @Field()
    title: string;

    @Field()
    description: string;

    @Field()
    startDateTime: string;

    @Field()
    endDateTime: string;

    @Field({nullable: true})
    recurrenceRule?: string;

    @Field()
    location: string;

    @Field(() => EventStatus)
    status: EventStatus; // TODO set this according to date

    @Field(() => Int, {nullable: true})
    capacity?: number;

    @Field(() => [String])
    eventCategory: string[];

    @Field(() => [String])
    organizers: string[];

    @Field(() => [String])
    rSVPs: string[];

    @Field(() => GraphQLJSON, {nullable: true})
    tags?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    media?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true})
    eventLink?: string;
}

@InputType()
export class UpdateEventInputType {
    @Field()
    id: string;

    @Field({nullable: true})
    title?: string;

    @Field({nullable: true})
    description?: string;

    @Field({nullable: true})
    startDateTime?: string;

    @Field({nullable: true})
    endDateTime?: string;

    @Field({nullable: true})
    recurrenceRule?: string;

    @Field({nullable: true})
    location?: string;

    @Field(() => EventStatus, {nullable: true})
    status?: EventStatus;

    @Field(() => Int, {nullable: true})
    capacity?: number;

    @Field(() => [String], {nullable: true})
    eventCategory?: string[];

    @Field(() => [String], {nullable: true})
    organizers?: string[];

    @Field(() => [String], {nullable: true})
    rSVPs?: string[];

    @Field(() => GraphQLJSON, {nullable: true})
    tags?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    media?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    additionalDetails?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    comments?: Record<string, any>;

    @Field(() => EventPrivacySetting, {nullable: true})
    privacySetting?: EventPrivacySetting;

    @Field(() => String, {nullable: true})
    eventLink?: string;
}

@InputType()
export class EventQueryParams {
    @Field({nullable: true})
    id?: string;

    @Field({nullable: true})
    slug?: string;

    @Field({nullable: true})
    title?: string;

    @Field({nullable: true})
    description?: string;

    @Field({nullable: true})
    startDateTime?: string;

    @Field({nullable: true})
    endDateTime?: string;

    @Field({nullable: true})
    recurrenceRule?: string;

    @Field({nullable: true})
    location?: string;

    @Field({nullable: true})
    status?: string;

    @Field(() => [String], {nullable: true})
    organizers?: string[];

    @Field(() => [String], {nullable: true})
    rSVPs?: string[];
}
