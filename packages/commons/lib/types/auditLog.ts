import 'reflect-metadata';
import { Field, ID, InputType, Int, ObjectType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import GraphQLJSON from 'graphql-type-json';
import { AUDIT_LOG_DESCRIPTIONS } from '../constants';
import { UserRole } from './user';

export enum AuditAction {
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  ORG_DELETED = 'ORG_DELETED',
  ORG_OWNERSHIP_TRANSFERRED = 'ORG_OWNERSHIP_TRANSFERRED',
  ORG_MEMBERSHIP_CREATED = 'ORG_MEMBERSHIP_CREATED',
  ORG_MEMBERSHIP_ROLE_CHANGED = 'ORG_MEMBERSHIP_ROLE_CHANGED',
  ORG_MEMBERSHIP_DELETED = 'ORG_MEMBERSHIP_DELETED',
  EVENT_DELETED = 'EVENT_DELETED',
  VENUE_DELETED = 'VENUE_DELETED',
  CATEGORY_CREATED = 'CATEGORY_CREATED',
  CATEGORY_DELETED = 'CATEGORY_DELETED',
  CATEGORY_GROUP_CREATED = 'CATEGORY_GROUP_CREATED',
  CATEGORY_GROUP_DELETED = 'CATEGORY_GROUP_DELETED',
}

export enum AuditTargetType {
  User = 'User',
  Organization = 'Organization',
  OrganizationMembership = 'OrganizationMembership',
  Event = 'Event',
  Venue = 'Venue',
  EventCategory = 'EventCategory',
  EventCategoryGroup = 'EventCategoryGroup',
}

@ObjectType('AuditLog', { description: AUDIT_LOG_DESCRIPTIONS.TYPE })
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ targetType: 1, targetId: 1, createdAt: -1 })
@index({ actorId: 1, createdAt: -1 })
@index({ action: 1, createdAt: -1 })
export class AuditLog {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: AUDIT_LOG_DESCRIPTIONS.AUDIT_ID })
  auditId: string;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: AUDIT_LOG_DESCRIPTIONS.ACTOR_ID })
  actorId: string;

  @prop({ required: true, enum: UserRole, type: () => String })
  @Field(() => UserRole, { description: AUDIT_LOG_DESCRIPTIONS.ACTOR_ROLE })
  actorRole: UserRole;

  @prop({ required: true, enum: AuditAction, type: () => String })
  @Field(() => String, { description: AUDIT_LOG_DESCRIPTIONS.ACTION })
  action: AuditAction;

  @prop({ required: true, enum: AuditTargetType, type: () => String })
  @Field(() => String, { description: AUDIT_LOG_DESCRIPTIONS.TARGET_TYPE })
  targetType: AuditTargetType;

  @prop({ required: true, type: () => String })
  @Field(() => ID, { description: AUDIT_LOG_DESCRIPTIONS.TARGET_ID })
  targetId: string;

  @prop({ type: () => Object })
  @Field(() => GraphQLJSON, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.BEFORE })
  before?: Record<string, unknown>;

  @prop({ type: () => Object })
  @Field(() => GraphQLJSON, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.AFTER })
  after?: Record<string, unknown>;

  @prop({ type: () => Object })
  @Field(() => GraphQLJSON, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.METADATA })
  metadata?: Record<string, unknown>;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.IP_ADDRESS })
  ipAddress?: string;

  @Field(() => Date, { description: AUDIT_LOG_DESCRIPTIONS.CREATED_AT })
  createdAt: Date;
}

@InputType('ReadAuditLogsInput', { description: AUDIT_LOG_DESCRIPTIONS.INPUT_TYPE })
export class ReadAuditLogsInput {
  @Field(() => ID, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_ACTOR_ID })
  actorId?: string;

  @Field(() => String, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_TARGET_TYPE })
  targetType?: AuditTargetType;

  @Field(() => ID, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_TARGET_ID })
  targetId?: string;

  @Field(() => String, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_ACTION })
  action?: AuditAction;

  @Field(() => Date, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_FROM_DATE })
  fromDate?: Date;

  @Field(() => Date, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_TO_DATE })
  toDate?: Date;

  @Field(() => Int, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_LIMIT })
  limit?: number;

  @Field(() => String, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.FILTER_CURSOR })
  cursor?: string;
}

@ObjectType('AuditLogPage', { description: AUDIT_LOG_DESCRIPTIONS.PAGE_TYPE })
export class AuditLogPage {
  @Field(() => [AuditLog])
  items: AuditLog[];

  @Field(() => String, { nullable: true, description: AUDIT_LOG_DESCRIPTIONS.PAGE_NEXT_CURSOR })
  nextCursor?: string;

  @Field(() => Boolean, { description: AUDIT_LOG_DESCRIPTIONS.PAGE_HAS_MORE })
  hasMore: boolean;
}

/** Internal server-side input for writing a new audit log entry. Never exposed as a GraphQL argument. */
export class WriteAuditLogInput {
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}
