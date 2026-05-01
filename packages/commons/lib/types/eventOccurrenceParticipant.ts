import 'reflect-metadata';
import { Field, ID, InputType, Int, ObjectType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { EVENT_DESCRIPTIONS } from '../constants';
import { EventOccurrence } from './eventOccurrence';
import { ParticipantStatus, ParticipantVisibility } from './eventSeriesParticipant';
import { User } from './user';

@ObjectType('EventOccurrenceParticipant', { description: EVENT_DESCRIPTIONS.PARTICIPANT.OCCURRENCE_TYPE })
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ occurrenceId: 1, userId: 1 }, { unique: true })
@index({ occurrenceId: 1, status: 1, rsvpAt: 1 })
@index({ userId: 1, rsvpAt: -1, createdAt: -1 })
@index({ userId: 1, occurrenceId: 1, rsvpAt: 1 })
export class EventOccurrenceParticipant {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.PARTICIPANT.ID })
  participantId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.PARTICIPANT.OCCURRENCE_ID })
  occurrenceId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.PARTICIPANT.USER_ID })
  userId: string;

  @prop({ enum: ParticipantStatus, required: true, default: ParticipantStatus.Going, type: () => String })
  @Field(() => ParticipantStatus, { description: EVENT_DESCRIPTIONS.PARTICIPANT.STATUS })
  status: ParticipantStatus;

  @prop({ default: 1, type: () => Number })
  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.QUANTITY })
  quantity?: number;

  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.INVITED_BY })
  invitedBy?: string;

  @prop({ enum: ParticipantVisibility, default: ParticipantVisibility.Followers, type: () => String })
  @Field(() => ParticipantVisibility, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.PARTICIPANT.SHARED_VISIBILITY,
  })
  sharedVisibility?: ParticipantVisibility;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.RSVP_AT })
  rsvpAt?: Date;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.CANCELLED_AT })
  cancelledAt?: Date;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.CHECKED_IN_AT })
  checkedInAt?: Date;

  @Field(() => EventOccurrence, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.EVENT_OCCURRENCE })
  occurrence?: EventOccurrence;

  @Field(() => User, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.USER })
  user?: User;
}

@InputType('UpsertEventOccurrenceParticipantInput', {
  description: EVENT_DESCRIPTIONS.PARTICIPANT.UPSERT_OCCURRENCE_INPUT,
})
export class UpsertEventOccurrenceParticipantInput {
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.PARTICIPANT.OCCURRENCE_ID })
  occurrenceId: string;

  @Field(() => ParticipantStatus, {
    defaultValue: ParticipantStatus.Going,
    description: EVENT_DESCRIPTIONS.PARTICIPANT.STATUS,
  })
  status?: ParticipantStatus;

  @Field(() => Int, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.QUANTITY })
  quantity?: number;

  @Field(() => ID, { nullable: true, description: EVENT_DESCRIPTIONS.PARTICIPANT.INVITED_BY })
  invitedBy?: string;

  @Field(() => ParticipantVisibility, {
    nullable: true,
    description: EVENT_DESCRIPTIONS.PARTICIPANT.SHARED_VISIBILITY,
  })
  sharedVisibility?: ParticipantVisibility;
}

@InputType('CancelEventOccurrenceParticipantInput', {
  description: EVENT_DESCRIPTIONS.PARTICIPANT.CANCEL_OCCURRENCE_INPUT,
})
export class CancelEventOccurrenceParticipantInput {
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.PARTICIPANT.OCCURRENCE_ID })
  occurrenceId: string;
}
