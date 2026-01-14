import 'reflect-metadata';
import {Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';
import {SOCIAL_DESCRIPTIONS} from '../constants';
import {User} from './user';
import {Organization} from './organization';

export enum FollowTargetType {
    User = 'User',
    Organization = 'Organization',
}

export enum FollowContentVisibility {
    Active = 'Active',
    Muted = 'Muted',
}

export enum FollowApprovalStatus {
    Pending = 'Pending',
    Accepted = 'Accepted',
    Rejected = 'Rejected',
}

registerEnumType(FollowTargetType, {
    name: 'FollowTargetType',
    description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_TYPE,
});

registerEnumType(FollowContentVisibility, {
    name: 'FollowContentVisibility',
    description: SOCIAL_DESCRIPTIONS.FOLLOW.CONTENT_VISIBILITY,
});

registerEnumType(FollowApprovalStatus, {
    name: 'FollowApprovalStatus',
    description: SOCIAL_DESCRIPTIONS.FOLLOW.APPROVAL_STATUS,
});

@ObjectType('FollowNotificationPreferences', {description: SOCIAL_DESCRIPTIONS.FOLLOW.NOTIFICATION_PREFERENCES})
export class FollowNotificationPreferences {
    @prop({enum: FollowContentVisibility, default: FollowContentVisibility.Active, type: () => String})
    @Field(() => FollowContentVisibility, {description: SOCIAL_DESCRIPTIONS.FOLLOW.CONTENT_VISIBILITY})
    contentVisibility: FollowContentVisibility;

    // Future extensibility:
    // @prop({type: () => Boolean, default: true})
    // @Field(() => Boolean, {description: 'Receive push notifications for new posts'})
    // pushNotifications?: boolean;

    // @prop({type: () => Boolean, default: true})
    // @Field(() => Boolean, {description: 'Receive email notifications'})
    // emailNotifications?: boolean;

    // @prop({type: () => [String], default: []})
    // @Field(() => [String], {description: 'Specific event types to notify about'})
    // notifyOnEventTypes?: string[];
}

@ObjectType('Follow', {description: SOCIAL_DESCRIPTIONS.FOLLOW.TYPE})
@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
@index({followerUserId: 1, targetType: 1, targetId: 1}, {unique: true})
export class Follow {
    @prop({required: true, index: true, type: () => String})
    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.ID})
    followId: string;

    @prop({required: true, type: () => String})
    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.FOLLOWER_USER_ID})
    followerUserId: string;

    // Computed field - resolved via @FieldResolver in FollowResolver (no @prop, not stored in DB)
    @Field(() => User, {description: 'The user who is following. Resolved via FieldResolver.'})
    follower?: User;

    @prop({required: true, enum: FollowTargetType, type: () => String})
    @Field(() => FollowTargetType, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_TYPE})
    targetType: FollowTargetType;

    // Computed fields - resolved via @FieldResolver in FollowResolver (no @prop, not stored in DB)
    @Field(() => User, {nullable: true, description: 'The target user if targetType is User. Resolved via FieldResolver.'})
    targetUser?: User;

    @Field(() => Organization, {nullable: true, description: 'The target organization if targetType is Organization. Resolved via FieldResolver.'})
    targetOrganization?: Organization;

    @prop({required: true, type: () => String})
    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_ID})
    targetId: string;

    @prop({type: () => FollowNotificationPreferences, default: () => ({contentVisibility: FollowContentVisibility.Active})})
    @Field(() => FollowNotificationPreferences, {description: SOCIAL_DESCRIPTIONS.FOLLOW.NOTIFICATION_PREFERENCES})
    notificationPreferences: FollowNotificationPreferences;

    @prop({enum: FollowApprovalStatus, default: FollowApprovalStatus.Accepted, type: () => String})
    @Field(() => FollowApprovalStatus, {description: SOCIAL_DESCRIPTIONS.FOLLOW.APPROVAL_STATUS})
    approvalStatus: FollowApprovalStatus;

    @prop({type: () => Date, default: () => new Date()})
    @Field(() => Date, {description: 'When the follow was created'})
    createdAt: Date;

    @Field(() => Date, {description: 'When the follow was last updated'})
    updatedAt?: Date;
}

@InputType('FollowNotificationPreferencesInput', {description: SOCIAL_DESCRIPTIONS.FOLLOW.NOTIFICATION_PREFERENCES_INPUT})
export class FollowNotificationPreferencesInput {
    @Field(() => FollowContentVisibility, {nullable: true, description: SOCIAL_DESCRIPTIONS.FOLLOW.CONTENT_VISIBILITY})
    contentVisibility?: FollowContentVisibility;
}

@InputType('CreateFollowInput', {description: SOCIAL_DESCRIPTIONS.FOLLOW.CREATE_INPUT})
export class CreateFollowInput {
    @Field(() => FollowTargetType, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_TYPE})
    targetType: FollowTargetType;

    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_ID})
    targetId: string;

    @Field(() => FollowNotificationPreferencesInput, {nullable: true, description: SOCIAL_DESCRIPTIONS.FOLLOW.NOTIFICATION_PREFERENCES})
    notificationPreferences?: FollowNotificationPreferencesInput;
}

@InputType('UpdateFollowNotificationPreferencesInput', {description: 'Input for updating follow notification preferences'})
export class UpdateFollowNotificationPreferencesInput {
    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.ID})
    followId: string;

    @Field(() => FollowNotificationPreferencesInput, {description: SOCIAL_DESCRIPTIONS.FOLLOW.NOTIFICATION_PREFERENCES})
    notificationPreferences: FollowNotificationPreferencesInput;
}
