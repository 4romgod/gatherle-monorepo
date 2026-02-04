import 'reflect-metadata';
import GraphQLJSON from 'graphql-type-json';
import { Field, ID, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';

import { SOCIAL_DESCRIPTIONS } from '../constants';
import { User } from './user';
import { Event } from './event';
import { Organization } from './organization';

export enum ActivityVerb {
  Followed = 'Followed',
  RSVPd = 'RSVPd',
  Commented = 'Commented',
  Published = 'Published',
  CreatedOrg = 'CreatedOrg',
  CheckedIn = 'CheckedIn',
  Invited = 'Invited',
}

export enum ActivityObjectType {
  User = 'User',
  Organization = 'Organization',
  Event = 'Event',
  Comment = 'Comment',
}

export enum ActivityVisibility {
  Public = 'Public',
  Followers = 'Followers',
  Private = 'Private',
}

registerEnumType(ActivityVerb, {
  name: 'ActivityVerb',
  description: SOCIAL_DESCRIPTIONS.ACTIVITY.VERB,
});

registerEnumType(ActivityObjectType, {
  name: 'ActivityObjectType',
  description: SOCIAL_DESCRIPTIONS.ACTIVITY.OBJECT_TYPE,
});

registerEnumType(ActivityVisibility, {
  name: 'ActivityVisibility',
  description: SOCIAL_DESCRIPTIONS.ACTIVITY.VISIBILITY,
});

@ObjectType('Activity', { description: SOCIAL_DESCRIPTIONS.ACTIVITY.TYPE })
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ actorId: 1, eventAt: -1 })
export class Activity {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID)
  activityId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.ACTOR_ID })
  actorId: string;

  @prop({ required: true, enum: ActivityVerb, type: () => String })
  @Field(() => ActivityVerb, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.VERB })
  verb: ActivityVerb;

  @prop({ required: true, enum: ActivityObjectType, type: () => String })
  @Field(() => ActivityObjectType, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.OBJECT_TYPE })
  objectType: ActivityObjectType;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.OBJECT_ID })
  objectId: string;

  @prop({ enum: ActivityObjectType, type: () => String })
  @Field(() => ActivityObjectType, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.TARGET_TYPE })
  targetType?: ActivityObjectType;

  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.TARGET_ID })
  targetId?: string;

  @prop({ enum: ActivityVisibility, default: ActivityVisibility.Public, type: () => String })
  @Field(() => ActivityVisibility, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.VISIBILITY })
  visibility: ActivityVisibility;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.EVENT_AT })
  eventAt?: Date;

  @prop({ type: () => Object, default: {} })
  @Field(() => GraphQLJSON, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.METADATA })
  metadata?: Record<string, any>;

  @prop({ type: () => Date, default: () => new Date() })
  @Field(() => Date, { description: 'Timestamp for when the activity was created' })
  createdAt: Date;

  // Computed fields - resolved via @FieldResolver (no @prop, not stored in DB)
  @Field(() => User, { nullable: true, description: 'The user who performed the action' })
  actor?: User;

  @Field(() => User, { nullable: true, description: 'The target user if objectType is User' })
  objectUser?: User;

  @Field(() => Event, { nullable: true, description: 'The target event if objectType is Event' })
  objectEvent?: Event;

  @Field(() => Organization, { nullable: true, description: 'The target organization if objectType is Organization' })
  objectOrganization?: Organization;
}

@InputType('CreateActivityInput', { description: SOCIAL_DESCRIPTIONS.ACTIVITY.CREATE_INPUT })
export class CreateActivityInput {
  @Field(() => ActivityVerb, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.VERB })
  verb: ActivityVerb;

  @Field(() => ActivityObjectType, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.OBJECT_TYPE })
  objectType: ActivityObjectType;

  @Field(() => ID, { description: SOCIAL_DESCRIPTIONS.ACTIVITY.OBJECT_ID })
  objectId: string;

  @Field(() => ActivityObjectType, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.TARGET_TYPE })
  targetType?: ActivityObjectType;

  @Field(() => ID, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.TARGET_ID })
  targetId?: string;

  @Field(() => ActivityVisibility, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.VISIBILITY })
  visibility?: ActivityVisibility;

  @Field(() => Date, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.EVENT_AT })
  eventAt?: Date;

  @Field(() => GraphQLJSON, { nullable: true, description: SOCIAL_DESCRIPTIONS.ACTIVITY.METADATA })
  metadata?: Record<string, any>;
}
