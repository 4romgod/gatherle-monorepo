import 'reflect-metadata';
import {Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

import {ORGANIZATION_MEMBERSHIP_DESCRIPTIONS} from '../constants';

export enum OrganizationRole {
    Owner = 'Owner',
    Admin = 'Admin',
    Host = 'Host',
    Moderator = 'Moderator',
    Member = 'Member',
}

registerEnumType(OrganizationRole, {
    name: 'OrganizationRole',
    description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ROLE,
});

@ObjectType('OrganizationMembership', {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.TYPE})
@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
@index({orgId: 1, userId: 1}, {unique: true})
export class OrganizationMembership {
    @prop({required: true, unique: true, index: true, type: () => String})
    @Field(() => ID, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ID})
    membershipId: string;

    @prop({required: true, type: () => String})
    @Field(() => ID, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ORGANIZATION_ID})
    orgId: string;

    @prop({required: true, type: () => String})
    @Field(() => ID, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.USER_ID})
    userId: string;

    @prop({required: true, enum: OrganizationRole, type: () => String})
    @Field(() => OrganizationRole, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ROLE})
    role: OrganizationRole;

    @prop({type: () => Date, default: () => new Date()})
    @Field(() => Date, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.JOINED_AT})
    joinedAt: Date;
}

@InputType('CreateOrganizationMembershipInput', {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.CREATE_INPUT})
export class CreateOrganizationMembershipInput {
    @Field(() => ID, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ORGANIZATION_ID})
    orgId: string;

    @Field(() => ID, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.USER_ID})
    userId: string;

    @Field(() => OrganizationRole, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ROLE})
    role: OrganizationRole;
}

@InputType('UpdateOrganizationMembershipInput', {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateOrganizationMembershipInput {
    @Field(() => ID, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ID})
    membershipId: string;

    @Field(() => OrganizationRole, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ROLE, nullable: true})
    role?: OrganizationRole;
}

@InputType('DeleteOrganizationMembershipInput', {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.DELETE_INPUT})
export class DeleteOrganizationMembershipInput {
    @Field(() => ID, {description: ORGANIZATION_MEMBERSHIP_DESCRIPTIONS.ID})
    membershipId: string;
}
