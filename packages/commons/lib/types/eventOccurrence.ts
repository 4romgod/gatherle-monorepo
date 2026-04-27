import 'reflect-metadata';
import { Field, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop } from '@typegoose/typegoose';
import { EVENT_DESCRIPTIONS } from '../constants';

export enum EventOccurrenceStatus {
  Scheduled = 'Scheduled',
  Cancelled = 'Cancelled',
  Completed = 'Completed',
}

registerEnumType(EventOccurrenceStatus, {
  name: 'EventOccurrenceStatus',
  description: EVENT_DESCRIPTIONS.OCCURRENCE.STATUS_ENUM,
});

@ObjectType('EventOccurrence', { description: EVENT_DESCRIPTIONS.OCCURRENCE.TYPE })
@modelOptions({ schemaOptions: { timestamps: true } })
@index({ occurrenceKey: 1 }, { unique: true })
@index({ eventSeriesId: 1, startAt: 1 })
@index({ eventSeriesId: 1, originalStartAt: 1 })
@index({ startAt: 1, status: 1 })
export class EventOccurrence {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.OCCURRENCE.ID })
  occurrenceId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: EVENT_DESCRIPTIONS.OCCURRENCE.EVENT_SERIES_ID })
  eventSeriesId: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.OCCURRENCE.OCCURRENCE_KEY })
  occurrenceKey: string;

  @prop({ required: true, type: () => Date })
  @Field(() => Date, { description: EVENT_DESCRIPTIONS.OCCURRENCE.ORIGINAL_START_AT })
  originalStartAt: Date;

  @prop({ required: true, type: () => Date })
  @Field(() => Date, { description: EVENT_DESCRIPTIONS.OCCURRENCE.START_AT })
  startAt: Date;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: EVENT_DESCRIPTIONS.OCCURRENCE.END_AT })
  endAt?: Date;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: EVENT_DESCRIPTIONS.OCCURRENCE.TIMEZONE })
  timezone: string;

  @prop({ required: true, enum: EventOccurrenceStatus, type: () => String })
  @Field(() => EventOccurrenceStatus, { description: EVENT_DESCRIPTIONS.OCCURRENCE.STATUS })
  status: EventOccurrenceStatus;

  @prop({ required: true, default: false, type: () => Boolean })
  @Field(() => Boolean, { description: EVENT_DESCRIPTIONS.OCCURRENCE.IS_EXCEPTION })
  isException: boolean;

  @prop({ required: true, default: 1, type: () => Number })
  @Field(() => Int, { description: EVENT_DESCRIPTIONS.OCCURRENCE.SERIES_SCHEDULE_VERSION })
  seriesScheduleVersion: number;

  @prop({ type: () => Date })
  @Field(() => Date, { description: EVENT_DESCRIPTIONS.OCCURRENCE.CREATED_AT })
  createdAt: Date;

  @prop({ type: () => Date })
  @Field(() => Date, { description: EVENT_DESCRIPTIONS.OCCURRENCE.UPDATED_AT })
  updatedAt: Date;
}
