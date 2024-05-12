import 'reflect-metadata';
import {InputType, Field, ObjectType, ID, Int, registerEnumType} from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import {UserType} from './user';
import {EventCategoryType} from './eventCategory';

export enum EventPrivacySetting {
    PUBLIC = 'Public',
    PRIVATE = 'Private',
    INVITATION = 'Invitation',
}

export enum EventStatus {
    CANCELLED = 'Cancelled',
    COMPLETED = 'Completed',
    ONGOING = 'Ongoing',
    UPCOMING = 'Upcoming',
}

registerEnumType(EventPrivacySetting, {
    name: 'EventPrivacySetting',
});

registerEnumType(EventStatus, {
    name: 'EventStatus',
});

@ObjectType()
class Media {
    @Field()
    featuredImageUrl: string;

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

    @Field()
    startDate: string;

    @Field()
    endDate: string;

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

    @Field(() => Media)
    media: Media;

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
    slug: string;

    @Field()
    title: string;

    @Field()
    description: string;

    @Field()
    startDate: string;

    @Field()
    endDate: string;

    @Field()
    location: string;

    @Field(() => EventStatus)
    status: EventStatus;

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
export class UpdateEventInputType extends CreateEventInputType {
    @Field(() => ID)
    id: string;
}

export type EventQueryParams = Partial<Record<keyof EventType, any>>;
