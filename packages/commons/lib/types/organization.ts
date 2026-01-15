import 'reflect-metadata';
import {Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

import {EventVisibility} from './event';
import {OrganizationMembership} from './organizationMembership';
import {FollowPolicy, SocialVisibility} from './user';
import {ORGANIZATION_DESCRIPTIONS, ORGANIZATION_LINK_DESCRIPTIONS} from '../constants';

export enum OrganizationTicketAccess {
    Public = 'Public',
    Members = 'Members',
    InviteOnly = 'InviteOnly',
}

registerEnumType(OrganizationTicketAccess, {
    name: 'OrganizationTicketAccess',
    description: ORGANIZATION_DESCRIPTIONS.TICKET_ACCESS,
});

@ObjectType('OrganizationLink', {description: ORGANIZATION_LINK_DESCRIPTIONS.TYPE})
export class OrganizationLink {
    @prop({required: true, type: () => String})
    @Field(() => String, {description: ORGANIZATION_LINK_DESCRIPTIONS.LABEL})
    label: string;

    @prop({required: true, type: () => String})
    @Field(() => String, {description: ORGANIZATION_LINK_DESCRIPTIONS.URL})
    url: string;
}

@InputType('OrganizationLinkInput', {description: ORGANIZATION_LINK_DESCRIPTIONS.INPUT})
export class OrganizationLinkInput {
    @Field(() => String, {description: ORGANIZATION_LINK_DESCRIPTIONS.LABEL})
    label: string;

    @Field(() => String, {description: ORGANIZATION_LINK_DESCRIPTIONS.URL})
    url: string;
}

@ObjectType('OrganizationEventDefaults')
export class OrganizationEventDefaults {
    @prop({enum: EventVisibility, type: () => String})
    @Field(() => EventVisibility, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_VISIBILITY})
    visibility?: EventVisibility;

    @prop({type: () => Boolean, default: false})
    @Field(() => Boolean, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_REMINDERS})
    remindersEnabled?: boolean;

    @prop({type: () => Boolean, default: false})
    @Field(() => Boolean, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_WAITLIST})
    waitlistEnabled?: boolean;

    @prop({type: () => Boolean, default: false})
    @Field(() => Boolean, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_PLUS_ONES})
    allowGuestPlusOnes?: boolean;

    @prop({enum: OrganizationTicketAccess, type: () => String})
    @Field(() => OrganizationTicketAccess, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_TICKET_ACCESS})
    ticketAccess?: OrganizationTicketAccess;
}

@InputType('OrganizationEventDefaultsInput')
export class OrganizationEventDefaultsInput {
    @Field(() => EventVisibility, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_VISIBILITY})
    visibility?: EventVisibility;

    @Field(() => Boolean, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_REMINDERS})
    remindersEnabled?: boolean;

    @Field(() => Boolean, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_WAITLIST})
    waitlistEnabled?: boolean;

    @Field(() => Boolean, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_PLUS_ONES})
    allowGuestPlusOnes?: boolean;

    @Field(() => OrganizationTicketAccess, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULT_TICKET_ACCESS})
    ticketAccess?: OrganizationTicketAccess;
}

@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
@ObjectType('Organization', {description: ORGANIZATION_DESCRIPTIONS.TYPE})
export class Organization {
    @prop({required: true, unique: true, index: true, type: () => String})
    @Field(() => ID, {description: ORGANIZATION_DESCRIPTIONS.ID})
    orgId: string;

    @prop({required: true, unique: true, index: true, type: () => String})
    @Field(() => String, {description: ORGANIZATION_DESCRIPTIONS.SLUG})
    slug: string;

    @prop({required: true, type: () => String})
    @Field(() => String, {description: ORGANIZATION_DESCRIPTIONS.NAME})
    name: string;

    @prop({type: () => String})
    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DESCRIPTION})
    description?: string;

    @prop({type: () => String})
    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.LOGO})
    logo?: string;

    @prop({required: true, type: () => String})
    @Field(() => ID, {description: ORGANIZATION_DESCRIPTIONS.OWNER_ID})
    ownerId: string;

    @prop({enum: EventVisibility, type: () => String})
    @Field(() => EventVisibility, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DEFAULT_VISIBILITY})
    defaultVisibility?: EventVisibility;

    @prop({type: () => String})
    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.BILLING_EMAIL})
    billingEmail?: string;

    @prop({type: () => [OrganizationLink], default: []})
    @Field(() => [OrganizationLink], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.LINKS})
    links?: OrganizationLink[];

    @prop({type: () => [String], default: []})
    @Field(() => [String], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DOMAINS})
    domainsAllowed?: string[];

    @prop({type: () => OrganizationEventDefaults, default: () => ({})})
    @Field(() => OrganizationEventDefaults, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULTS})
    eventDefaults?: OrganizationEventDefaults;

    @prop({enum: OrganizationTicketAccess, type: () => String, default: OrganizationTicketAccess.Public})
    @Field(() => OrganizationTicketAccess, {description: ORGANIZATION_DESCRIPTIONS.TICKET_ACCESS})
    allowedTicketAccess: OrganizationTicketAccess;

    // Computed field - resolved via @FieldResolver in OrganizationResolver (no @prop, not stored in DB)
    @Field(() => Number, {description: ORGANIZATION_DESCRIPTIONS.FOLLOWERS_COUNT})
    followersCount?: number;

    @prop({type: () => Boolean, default: true})
    @Field(() => Boolean, {description: ORGANIZATION_DESCRIPTIONS.FOLLOWABLE})
    isFollowable: boolean;

    @prop({enum: FollowPolicy, default: FollowPolicy.Public, type: () => String})
    @Field(() => FollowPolicy, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.FOLLOW_POLICY})
    followPolicy?: FollowPolicy;

    @prop({enum: SocialVisibility, default: SocialVisibility.Public, type: () => String})
    @Field(() => SocialVisibility, {nullable: true, description: "Who can see this organization's followers list"})
    followersListVisibility?: SocialVisibility;

    @prop({type: () => [String], default: []})
    @Field(() => [String], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.TAGS})
    tags?: string[];

    @Field(() => [OrganizationMembership], {
        nullable: true,
        description: ORGANIZATION_DESCRIPTIONS.MEMBER_ROLES,
    })
    memberRoles?: OrganizationMembership[];
}

@InputType('CreateOrganizationInput', {description: ORGANIZATION_DESCRIPTIONS.CREATE_INPUT})
export class CreateOrganizationInput {
    @Field(() => String, {description: ORGANIZATION_DESCRIPTIONS.NAME})
    name: string;

    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DESCRIPTION})
    description?: string;

    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.LOGO})
    logo?: string;

    @Field(() => ID, {description: ORGANIZATION_DESCRIPTIONS.OWNER_ID})
    ownerId: string;

    @Field(() => EventVisibility, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DEFAULT_VISIBILITY})
    defaultVisibility?: EventVisibility;

    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.BILLING_EMAIL})
    billingEmail?: string;

    @Field(() => [OrganizationLinkInput], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.LINKS})
    links?: OrganizationLinkInput[];

    @Field(() => [String], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DOMAINS})
    domainsAllowed?: string[];

    @Field(() => OrganizationEventDefaultsInput, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULTS})
    eventDefaults?: OrganizationEventDefaultsInput;

    @Field(() => OrganizationTicketAccess, {description: ORGANIZATION_DESCRIPTIONS.TICKET_ACCESS})
    allowedTicketAccess: OrganizationTicketAccess;

    @Field(() => [String], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.TAGS})
    tags?: string[];
}

@InputType('UpdateOrganizationInput', {description: ORGANIZATION_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateOrganizationInput {
    @Field(() => ID, {description: ORGANIZATION_DESCRIPTIONS.ID})
    orgId: string;

    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.NAME})
    name?: string;

    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DESCRIPTION})
    description?: string;

    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.LOGO})
    logo?: string;

    @Field(() => EventVisibility, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DEFAULT_VISIBILITY})
    defaultVisibility?: EventVisibility;

    @Field(() => String, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.BILLING_EMAIL})
    billingEmail?: string;

    @Field(() => [OrganizationLinkInput], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.LINKS})
    links?: OrganizationLinkInput[];

    @Field(() => [String], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.DOMAINS})
    domainsAllowed?: string[];

    @Field(() => OrganizationEventDefaultsInput, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.EVENT_DEFAULTS})
    eventDefaults?: OrganizationEventDefaultsInput;

    @Field(() => OrganizationTicketAccess, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.TICKET_ACCESS})
    allowedTicketAccess?: OrganizationTicketAccess;

    @Field(() => [String], {nullable: true, description: ORGANIZATION_DESCRIPTIONS.TAGS})
    tags?: string[];

    @Field(() => FollowPolicy, {nullable: true, description: ORGANIZATION_DESCRIPTIONS.FOLLOW_POLICY})
    followPolicy?: FollowPolicy;

    @Field(() => SocialVisibility, {nullable: true, description: "Who can see this organization's followers list"})
    followersListVisibility?: SocialVisibility;
}
