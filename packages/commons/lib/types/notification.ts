import 'reflect-metadata';
import { Field, ID, InputType, Int, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { NOTIFICATION_DESCRIPTIONS } from '../constants';
import { User } from './user';
import { EventSeries } from './eventSeries';
import { Organization } from './organization';

/**
 * Types of notifications that can be sent to users
 */
export enum NotificationType {
  // Social
  FOLLOW_RECEIVED = 'FOLLOW_RECEIVED',
  FOLLOW_REQUEST = 'FOLLOW_REQUEST',
  FOLLOW_ACCEPTED = 'FOLLOW_ACCEPTED',
  MENTION = 'MENTION',

  // Events
  EVENT_RSVP = 'EVENT_RSVP',
  EVENT_SAVED = 'EVENT_SAVED',
  EVENT_CHECKIN = 'EVENT_CHECKIN',
  EVENT_REMINDER_24H = 'EVENT_REMINDER_24H',
  EVENT_REMINDER_1H = 'EVENT_REMINDER_1H',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_RECOMMENDATION = 'EVENT_RECOMMENDATION',

  // Organizations
  ORG_INVITE = 'ORG_INVITE',
  ORG_ROLE_CHANGED = 'ORG_ROLE_CHANGED',
  ORG_EVENT_PUBLISHED = 'ORG_EVENT_PUBLISHED',

  // Friend Activity
  FRIEND_RSVP = 'FRIEND_RSVP',
  FRIEND_CHECKIN = 'FRIEND_CHECKIN',

  // Comments
  COMMENT_RECEIVED = 'COMMENT_RECEIVED',
  COMMENT_REPLY = 'COMMENT_REPLY',
  COMMENT_LIKED = 'COMMENT_LIKED',

  // Security
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  NEW_DEVICE_LOGIN = 'NEW_DEVICE_LOGIN',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
}

/**
 * Target types for notification references
 */
export enum NotificationTargetType {
  User = 'User',
  EventSeries = 'EventSeries',
  Organization = 'Organization',
  Comment = 'Comment',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: NOTIFICATION_DESCRIPTIONS.TYPE_ENUM,
});

registerEnumType(NotificationTargetType, {
  name: 'NotificationTargetType',
  description: NOTIFICATION_DESCRIPTIONS.TARGET_TYPE,
});

@ObjectType('Notification', { description: NOTIFICATION_DESCRIPTIONS.TYPE })
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ recipientUserId: 1, createdAt: -1 })
@index({ recipientUserId: 1, isRead: 1 })
export class Notification {
  @prop({ required: true, index: true, type: () => String })
  @Field(() => ID, { description: NOTIFICATION_DESCRIPTIONS.ID })
  notificationId: string;

  @prop({ required: true, index: true, type: () => String })
  @Field(() => ID, { description: NOTIFICATION_DESCRIPTIONS.RECIPIENT_USER_ID })
  recipientUserId: string;

  @prop({ required: true, enum: NotificationType, type: () => String })
  @Field(() => NotificationType, { description: NOTIFICATION_DESCRIPTIONS.NOTIFICATION_TYPE })
  type: NotificationType;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: NOTIFICATION_DESCRIPTIONS.TITLE })
  title: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: NOTIFICATION_DESCRIPTIONS.MESSAGE })
  message: string;

  // Actor - the user who triggered the notification (optional for system notifications)
  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.ACTOR_USER_ID })
  actorUserId?: string;

  // Computed field - resolved via @FieldResolver (no @prop)
  @Field(() => User, {
    nullable: true,
    description: 'The user who triggered the notification. Resolved via FieldResolver.',
  })
  actor?: User;

  // Target reference
  @prop({ enum: NotificationTargetType, type: () => String })
  @Field(() => NotificationTargetType, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.TARGET_TYPE })
  targetType?: NotificationTargetType;

  @prop({ type: () => String })
  @Field(() => ID, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.TARGET_ID })
  targetId?: string;

  // Computed fields - resolved via @FieldResolver (no @prop)
  @Field(() => User, {
    nullable: true,
    description: 'The target user if targetType is User. Resolved via FieldResolver.',
  })
  targetUser?: User;

  @Field(() => EventSeries, {
    nullable: true,
    description: 'The target event if targetType is EventSeries. Resolved via FieldResolver.',
  })
  targetEvent?: EventSeries;

  @Field(() => Organization, {
    nullable: true,
    description: 'The target organization if targetType is Organization. Resolved via FieldResolver.',
  })
  targetOrganization?: Organization;

  // Read state
  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { description: NOTIFICATION_DESCRIPTIONS.IS_READ })
  isRead: boolean;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.READ_AT })
  readAt?: Date;

  // Delivery tracking
  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { description: NOTIFICATION_DESCRIPTIONS.EMAIL_SENT })
  emailSent: boolean;

  @prop({ default: false, type: () => Boolean })
  @Field(() => Boolean, { description: NOTIFICATION_DESCRIPTIONS.PUSH_SENT })
  pushSent: boolean;

  // Optional action URL for deep linking
  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.ACTION_URL })
  actionUrl?: string;

  @prop({ type: () => Date, default: () => new Date() })
  @Field(() => Date, { description: 'When the notification was created' })
  createdAt: Date;

  @Field(() => Date, { description: 'When the notification was last updated' })
  updatedAt?: Date;
}

@InputType('CreateNotificationInput', { description: NOTIFICATION_DESCRIPTIONS.CREATE_INPUT })
export class CreateNotificationInput {
  @Field(() => ID, { description: NOTIFICATION_DESCRIPTIONS.RECIPIENT_USER_ID })
  recipientUserId: string;

  @Field(() => NotificationType, { description: NOTIFICATION_DESCRIPTIONS.NOTIFICATION_TYPE })
  type: NotificationType;

  @Field(() => String, { description: NOTIFICATION_DESCRIPTIONS.TITLE })
  title: string;

  @Field(() => String, { description: NOTIFICATION_DESCRIPTIONS.MESSAGE })
  message: string;

  @Field(() => ID, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.ACTOR_USER_ID })
  actorUserId?: string;

  @Field(() => NotificationTargetType, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.TARGET_TYPE })
  targetType?: NotificationTargetType;

  @Field(() => ID, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.TARGET_ID })
  targetId?: string;

  @Field(() => String, { nullable: true, description: NOTIFICATION_DESCRIPTIONS.ACTION_URL })
  actionUrl?: string;
}

/**
 * Connection type for paginated notifications
 */
@ObjectType('NotificationConnection', { description: 'Paginated list of notifications' })
export class NotificationConnection {
  @Field(() => [Notification], { description: 'List of notifications' })
  notifications: Notification[];

  @Field(() => String, { nullable: true, description: 'Cursor for the next page' })
  nextCursor?: string;

  @Field(() => Boolean, { description: 'Whether there are more notifications to fetch' })
  hasMore: boolean;

  @Field(() => Int, { description: 'Total count of unread notifications' })
  unreadCount: number;
}
