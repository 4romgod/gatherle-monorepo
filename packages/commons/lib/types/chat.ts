import 'reflect-metadata';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { User } from './user';
import { EventMomentType } from './eventMoment';

@ObjectType('ChatMessage', { description: 'A direct message exchanged between two users.' })
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ conversationKey: 1, createdAt: -1 })
@index({ senderUserId: 1, createdAt: -1 })
@index({ recipientUserId: 1, createdAt: -1 })
export class ChatMessage {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: 'Stable chat message id.' })
  chatMessageId: string;

  @prop({ required: true, index: true, type: () => String })
  @Field(() => ID, { description: 'Sender user id.' })
  senderUserId: string;

  @prop({ required: true, index: true, type: () => String })
  @Field(() => ID, { description: 'Recipient user id.' })
  recipientUserId: string;

  @prop({ required: true, index: true, type: () => String })
  @Field(() => String, { description: 'Deterministic key for a two-user conversation.' })
  conversationKey: string;

  @prop({ required: true, trim: true, type: () => String })
  @Field(() => String, { description: 'Message body.' })
  message: string;

  @prop({ type: () => Boolean, default: false })
  @Field(() => Boolean, { description: 'Whether the recipient has read this message.' })
  isRead: boolean;

  @prop({ type: () => Date })
  @Field(() => Date, { nullable: true, description: 'When the recipient read this message.' })
  readAt?: Date;

  @prop({ type: () => Date, default: () => new Date() })
  @Field(() => Date, { description: 'Timestamp when the message was created.' })
  createdAt: Date;

  @Field(() => Date, { nullable: true, description: 'Timestamp when the message was last updated.' })
  updatedAt?: Date;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: 'ID of the event moment this message is replying to.' })
  replyToMomentId?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: 'Caption/text preview of the replied-to moment.' })
  replyToMomentCaption?: string;

  @prop({ enum: EventMomentType, type: () => String })
  @Field(() => EventMomentType, { nullable: true, description: 'Type of the replied-to moment.' })
  replyToMomentType?: EventMomentType;

  @Field(() => User, {
    nullable: true,
    description: 'Resolved sender user object.',
  })
  sender?: User;

  @Field(() => User, {
    nullable: true,
    description: 'Resolved recipient user object.',
  })
  recipient?: User;
}

@ObjectType('ChatMessageConnection', { description: 'Cursor-paginated list of chat messages.' })
export class ChatMessageConnection {
  @Field(() => [ChatMessage], { description: 'Page of messages ordered newest first.' })
  messages: ChatMessage[];

  @Field(() => String, { nullable: true, description: 'Cursor for fetching older messages.' })
  nextCursor?: string;

  @Field(() => Boolean, { description: 'Whether there are more older messages available.' })
  hasMore: boolean;

  @Field(() => Int, { description: 'Number of messages returned in this page.' })
  count: number;
}

@ObjectType('ChatConversation', { description: 'Summary of a direct conversation with another user.' })
export class ChatConversation {
  @Field(() => ID, { description: 'The other participant in the conversation.' })
  conversationWithUserId: string;

  @Field(() => User, { nullable: true, description: 'Resolved user for the other participant.' })
  conversationWithUser?: User;

  @Field(() => ChatMessage, { description: 'Latest message in this conversation.' })
  lastMessage: ChatMessage;

  @Field(() => Int, { description: 'Unread messages count for the authenticated user.' })
  unreadCount: number;

  @Field(() => Date, { description: 'Timestamp of the latest message in this conversation.' })
  updatedAt: Date;
}
