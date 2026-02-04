import 'reflect-metadata';
import GraphQLJSON from 'graphql-type-json';
import { Field, ID, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';

import { SOCIAL_DESCRIPTIONS } from '../constants';

export enum IntentStatus {
  Interested = 'Interested',
  Going = 'Going',
  Maybe = 'Maybe',
  Declined = 'Declined',
}

export enum IntentVisibility {
  Public = 'Public',
  Followers = 'Followers',
  Private = 'Private',
}

export enum IntentSource {
  Manual = 'Manual',
  Invite = 'Invite',
  OrgAnnouncement = 'OrgAnnouncement',
}

registerEnumType(IntentStatus, {
  name: 'IntentStatus',
  description: SOCIAL_DESCRIPTIONS.INTENT.STATUS,
});

registerEnumType(IntentVisibility, {
  name: 'IntentVisibility',
  description: SOCIAL_DESCRIPTIONS.INTENT.VISIBILITY,
});

registerEnumType(IntentSource, {
  name: 'IntentSource',
  description: SOCIAL_DESCRIPTIONS.INTENT.SOURCE,
});

@ObjectType('Intent', { description: SOCIAL_DESCRIPTIONS.INTENT.TYPE })
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ userId: 1, eventId: 1 }, { unique: true })
export class Intent {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: SOCIAL_DESCRIPTIONS.INTENT.ID })
  intentId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: SOCIAL_DESCRIPTIONS.INTENT.USER_ID })
  userId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: SOCIAL_DESCRIPTIONS.INTENT.EVENT_ID })
  eventId: string;

  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: SOCIAL_DESCRIPTIONS.INTENT.PARTICIPANT_ID })
  participantId?: string;

  @prop({ required: true, enum: IntentStatus, default: IntentStatus.Interested, type: () => String })
  @Field(() => IntentStatus, { description: SOCIAL_DESCRIPTIONS.INTENT.STATUS })
  status: IntentStatus;

  @prop({ enum: IntentVisibility, default: IntentVisibility.Public, type: () => String })
  @Field(() => IntentVisibility, { description: SOCIAL_DESCRIPTIONS.INTENT.VISIBILITY })
  visibility: IntentVisibility;

  @prop({ enum: IntentSource, default: IntentSource.Manual, type: () => String })
  @Field(() => IntentSource, { description: SOCIAL_DESCRIPTIONS.INTENT.SOURCE })
  source: IntentSource;

  @prop({ type: () => Object, default: {} })
  @Field(() => GraphQLJSON, { nullable: true, description: SOCIAL_DESCRIPTIONS.INTENT.METADATA })
  metadata?: Record<string, any>;

  @prop({ type: () => Date, default: () => new Date() })
  @Field(() => Date, { description: 'Timestamp when the intent was created' })
  createdAt: Date;

  @prop({ type: () => Date, default: () => new Date() })
  @Field(() => Date, { description: 'Timestamp when the intent was last updated' })
  updatedAt: Date;
}

@InputType('UpsertIntentInput', { description: SOCIAL_DESCRIPTIONS.INTENT.CREATE_INPUT })
export class UpsertIntentInput {
  @Field(() => ID, { nullable: true })
  intentId?: string;

  @Field(() => ID)
  eventId: string;

  @Field(() => IntentStatus, { nullable: true })
  status?: IntentStatus;

  @Field(() => IntentVisibility, { nullable: true })
  visibility?: IntentVisibility;

  @Field(() => IntentSource, { nullable: true })
  source?: IntentSource;

  @Field(() => ID, { nullable: true })
  participantId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, any>;
}
