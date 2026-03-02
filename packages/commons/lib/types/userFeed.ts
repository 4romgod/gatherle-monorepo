import 'reflect-metadata';
import { Field, Float, ID, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop } from '@typegoose/typegoose';

import { Event } from './event';

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
  description: 'A recommended event in the user feed, scored by the rule-based recommendation engine',
})
@modelOptions({ schemaOptions: { timestamps: false } })
@index({ userId: 1, score: -1 })
@index({ userId: 1, eventId: 1 }, { unique: true })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export class UserFeedItem {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID)
  feedItemId: string;

  /**
   * Internal partition key — not exposed in GraphQL.
   * Identifies which user this feed entry belongs to.
   */
  @prop({ required: true, index: true, type: () => String })
  userId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: 'The ID of the recommended event' })
  eventId: string;

  @prop({ required: true, type: () => Number })
  @Field(() => Float, {
    description: 'Relevance score computed by the recommendation engine (higher = more relevant)',
  })
  score: number;

  @prop({ required: true, type: () => [String], enum: FeedReason })
  @Field(() => [FeedReason], {
    description: 'The signals that contributed to this event being recommended',
  })
  reasons: FeedReason[];

  @prop({ required: true, type: () => Date })
  @Field(() => Date, { description: 'Timestamp of when this score was last computed' })
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
  @Field(() => Event, {
    nullable: true,
    description: 'The full event object, populated via FieldResolver',
  })
  event?: Event;
}
