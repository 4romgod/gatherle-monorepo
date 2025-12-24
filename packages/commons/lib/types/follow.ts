import 'reflect-metadata';
import {Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {index, modelOptions, prop, Severity} from '@typegoose/typegoose';

import {SOCIAL_DESCRIPTIONS} from '../constants';

export enum FollowTargetType {
    User = 'User',
    Organization = 'Organization',
}

export enum FollowStatus {
    Active = 'Active',
    Muted = 'Muted',
}

registerEnumType(FollowTargetType, {
    name: 'FollowTargetType',
    description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_TYPE,
});

registerEnumType(FollowStatus, {
    name: 'FollowStatus',
    description: SOCIAL_DESCRIPTIONS.FOLLOW.STATUS,
});

@ObjectType('Follow', {description: SOCIAL_DESCRIPTIONS.FOLLOW.TYPE})
@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
@index({followerUserId: 1, targetType: 1, targetId: 1}, {unique: true})
export class Follow {
    @prop({required: true, unique: true, index: true, type: () => String})
    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.ID})
    followId: string;

    @prop({required: true, type: () => String})
    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.FOLLOWER_USER_ID})
    followerUserId: string;

    @prop({required: true, enum: FollowTargetType, type: () => String})
    @Field(() => FollowTargetType, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_TYPE})
    targetType: FollowTargetType;

    @prop({required: true, type: () => String})
    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_ID})
    targetId: string;

    @prop({enum: FollowStatus, default: FollowStatus.Active, type: () => String})
    @Field(() => FollowStatus, {description: SOCIAL_DESCRIPTIONS.FOLLOW.STATUS})
    status: FollowStatus;

    @prop({type: () => Date, default: () => new Date()})
    @Field(() => Date, {description: 'When the follow was created'})
    createdAt: Date;
}

@InputType('CreateFollowInput', {description: SOCIAL_DESCRIPTIONS.FOLLOW.CREATE_INPUT})
export class CreateFollowInput {
    @Field(() => FollowTargetType, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_TYPE})
    targetType: FollowTargetType;

    @Field(() => ID, {description: SOCIAL_DESCRIPTIONS.FOLLOW.TARGET_ID})
    targetId: string;

    @Field(() => FollowStatus, {nullable: true, description: SOCIAL_DESCRIPTIONS.FOLLOW.STATUS})
    status?: FollowStatus;
}

@InputType('UpdateFollowStatusInput')
export class UpdateFollowStatusInput {
    @Field(() => ID)
    followId: string;

    @Field(() => FollowStatus)
    status: FollowStatus;
}
