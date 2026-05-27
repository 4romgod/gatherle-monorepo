import 'reflect-metadata';
import { Field, ID, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop } from '@typegoose/typegoose';
import { EVENT_MOMENT_DESCRIPTIONS } from '../constants';
import { EventOccurrence } from './eventOccurrence';
import { User } from './user';
import { EventSeries } from './eventSeries';

export enum EventMomentType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
}

export enum EventMomentImageDisplayMode {
  Fit = 'Fit',
  Fill = 'Fill',
}

export enum EventMomentState {
  UploadPending = 'UploadPending',
  Transcoding = 'Transcoding',
  Ready = 'Ready',
  Failed = 'Failed',
}

registerEnumType(EventMomentType, {
  name: 'EventMomentType',
  description: EVENT_MOMENT_DESCRIPTIONS.TYPE_ENUM,
});

registerEnumType(EventMomentImageDisplayMode, {
  name: 'EventMomentImageDisplayMode',
  description: EVENT_MOMENT_DESCRIPTIONS.IMAGE_DISPLAY_MODE_ENUM,
});

registerEnumType(EventMomentState, {
  name: 'EventMomentState',
  description: EVENT_MOMENT_DESCRIPTIONS.STATE_ENUM,
});

@ObjectType('EventMoment', { description: EVENT_MOMENT_DESCRIPTIONS.TYPE })
@modelOptions({ schemaOptions: { timestamps: true } })
@index({ eventId: 1, authorId: 1 })
@index({ occurrenceId: 1, createdAt: -1 })
@index({ authorId: 1, createdAt: -1 })
@index({ rawS3Key: 1 }, { unique: true, sparse: true })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export class EventMoment {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: EVENT_MOMENT_DESCRIPTIONS.ID })
  momentId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: EVENT_MOMENT_DESCRIPTIONS.EVENT_ID })
  eventId: string;

  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.OCCURRENCE_ID })
  occurrenceId?: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: EVENT_MOMENT_DESCRIPTIONS.AUTHOR_ID })
  authorId: string;

  @prop({ required: true, enum: EventMomentType, type: () => String })
  @Field(() => EventMomentType, { description: EVENT_MOMENT_DESCRIPTIONS.MOMENT_TYPE })
  type: EventMomentType;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.CAPTION })
  caption?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.MEDIA_URL })
  mediaUrl?: string;

  @prop({ type: () => String })
  rawS3Key?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.THUMBNAIL_URL })
  thumbnailUrl?: string;

  @prop({ enum: EventMomentImageDisplayMode, type: () => String })
  @Field(() => EventMomentImageDisplayMode, {
    nullable: true,
    description: EVENT_MOMENT_DESCRIPTIONS.IMAGE_DISPLAY_MODE,
  })
  imageDisplayMode?: EventMomentImageDisplayMode;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.BACKGROUND })
  background?: string;

  @prop({ enum: EventMomentState, default: EventMomentState.Ready, type: () => String })
  @Field(() => EventMomentState, { description: EVENT_MOMENT_DESCRIPTIONS.STATE })
  state: EventMomentState;

  @prop({ required: true, type: () => Boolean })
  isPublished: boolean;

  @prop({ type: () => Number })
  @Field(() => Number, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.DURATION_SECONDS })
  durationSeconds?: number;

  @prop({ required: true, type: () => Date })
  @Field(() => Date, { description: EVENT_MOMENT_DESCRIPTIONS.EXPIRES_AT })
  expiresAt: Date;

  @prop({ type: () => Date })
  @Field(() => Date, { description: EVENT_MOMENT_DESCRIPTIONS.CREATED_AT })
  createdAt: Date;

  // GraphQL-only field resolved via @FieldResolver
  @Field(() => User, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.AUTHOR })
  author?: User;

  // GraphQL-only field resolved via @FieldResolver
  @Field(() => EventSeries, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.EVENT })
  event?: EventSeries;

  // GraphQL-only field resolved via @FieldResolver
  @Field(() => EventOccurrence, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.OCCURRENCE })
  occurrence?: EventOccurrence;
}

@ObjectType('EventMomentPage', { description: EVENT_MOMENT_DESCRIPTIONS.PAGE_TYPE })
export class EventMomentPage {
  @Field(() => [EventMoment], { description: EVENT_MOMENT_DESCRIPTIONS.ITEMS })
  items: EventMoment[];

  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.NEXT_CURSOR })
  nextCursor?: string;

  @Field(() => Boolean, { description: EVENT_MOMENT_DESCRIPTIONS.HAS_MORE })
  hasMore: boolean;
}

@InputType('CreateEventMomentInput', { description: EVENT_MOMENT_DESCRIPTIONS.CREATE_INPUT })
export class CreateEventMomentInput {
  @Field(() => ID, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.RESERVED_MOMENT_ID })
  momentId?: string;

  @Field(() => ID, { description: EVENT_MOMENT_DESCRIPTIONS.EVENT_ID })
  eventId: string;

  @Field(() => ID, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.OCCURRENCE_ID })
  occurrenceId?: string;

  @Field(() => EventMomentType, { description: EVENT_MOMENT_DESCRIPTIONS.MOMENT_TYPE })
  type: EventMomentType;

  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.CAPTION })
  caption?: string;

  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.MEDIA_KEY })
  mediaKey?: string;

  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.THUMBNAIL_KEY })
  thumbnailKey?: string;

  @Field(() => EventMomentImageDisplayMode, {
    nullable: true,
    description: EVENT_MOMENT_DESCRIPTIONS.IMAGE_DISPLAY_MODE,
  })
  imageDisplayMode?: EventMomentImageDisplayMode;

  @Field(() => String, { nullable: true, description: EVENT_MOMENT_DESCRIPTIONS.BACKGROUND })
  background?: string;
}
