import 'reflect-metadata';
import {InputType, Field, ObjectType, ID, Int, registerEnumType} from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import {UserType} from './user';
import {EventCategoryType} from './eventCategory';
import {QueryParams} from '../../utils/queries/events';

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
    startDate?: string;

    @Field({nullable: true})
    endDate?: string;

    @Field({nullable: true})
    location?: string;

    @Field({nullable: true})
    status?: string;

    @Field(() => [String], {nullable: true})
    organizers?: string[];

    @Field(() => [String], {nullable: true})
    rSVPs?: string[];
}
