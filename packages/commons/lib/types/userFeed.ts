import 'reflect-metadata';
import { Field, Float, ID, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop } from '@typegoose/typegoose';

import { EventSeries } from './eventSeries';
import { EventOccurrence } from './eventOccurrence';
import { USER_FEED_DESCRIPTIONS } from '../constants/descriptions';

export enum FeedReason {
  CategoryMatch = 'CategoryMatch',
  FriendAttending = 'FriendAttending',
  FollowedOrgHosting = 'FollowedOrgHosting',
  NetworkSaved = 'NetworkSaved',
  TimeUrgency = 'TimeUrgency',
  Popularity = 'Popularity',
  Freshness = 'Freshness',
}

registerEnumType(FeedReason, {
  name: 'FeedReason',
  description: 'The reason an event was surfaced in the user feed by the recommendation engine',
});

@ObjectType('FeedItem', {
  description: USER_FEED_DESCRIPTIONS.TYPE,
})
@modelOptions({ schemaOptions: { timestamps: false } })
@index({ userId: 1, score: -1 })
@index({ userId: 1, eventId: 1 }, { unique: true })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export class UserFeedItem {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: USER_FEED_DESCRIPTIONS.FEED_ITEM_ID })
  feedItemId: string;

  /**
   * Internal partition key — not exposed in GraphQL.
   * Identifies which user this feed entry belongs to.
   */
  @prop({ required: true, index: true, type: () => String })
  userId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: USER_FEED_DESCRIPTIONS.EVENT_ID })
  eventId: string;

  @prop({ required: true, type: () => Number })
  @Field(() => Float, { description: USER_FEED_DESCRIPTIONS.SCORE })
  score: number;

  @prop({ required: true, type: () => [String], enum: FeedReason })
  @Field(() => [FeedReason], { description: USER_FEED_DESCRIPTIONS.REASONS })
  reasons: FeedReason[];

  @prop({ required: true, type: () => Date })
  @Field(() => Date, { description: USER_FEED_DESCRIPTIONS.COMPUTED_AT })
  computedAt: Date;

  /**
   * MongoDB TTL field — not exposed in GraphQL.
   * Documents expire automatically after this date via a sparse TTL index.
   */
  @prop({ required: true, type: () => Date })
  expiresAt: Date;

  /**
   * Computed field — resolved via @FieldResolver, not stored in MongoDB.
   */
  @Field(() => EventSeries, { nullable: true, description: USER_FEED_DESCRIPTIONS.EVENT })
  event?: EventSeries;

  /**
   * Computed field — resolved via @FieldResolver, not stored in MongoDB.
   */
  @Field(() => EventOccurrence, {
    nullable: true,
    description: USER_FEED_DESCRIPTIONS.REPRESENTATIVE_OCCURRENCE,
  })
  representativeOccurrence?: EventOccurrence;
}
