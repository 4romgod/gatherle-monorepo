import 'reflect-metadata';
import { Field, ID, InputType, Int, ObjectType, registerEnumType } from 'type-graphql';
import { index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { SUPPORT_REQUEST_DESCRIPTIONS, SUPPORT_REQUEST_LIMITS } from '../constants';

export enum SupportRequestKind {
  Help = 'Help',
  Bug = 'Bug',
  Idea = 'Idea',
  TrustAndSafety = 'TrustAndSafety',
}

export enum SupportRequestStatus {
  Open = 'Open',
  Resolved = 'Resolved',
}

registerEnumType(SupportRequestKind, {
  name: 'SupportRequestKind',
  description: SUPPORT_REQUEST_DESCRIPTIONS.KIND_ENUM,
});

registerEnumType(SupportRequestStatus, {
  name: 'SupportRequestStatus',
  description: SUPPORT_REQUEST_DESCRIPTIONS.STATUS_ENUM,
});

@ObjectType('SupportRequest', {
  description: SUPPORT_REQUEST_DESCRIPTIONS.TYPE,
})
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
@index({ requesterUserId: 1, createdAt: -1 })
@index({ status: 1, createdAt: -1 })
@index({ kind: 1, createdAt: -1 })
export class SupportRequest {
  @prop({ required: true, index: true, type: () => String })
  @Field(() => ID, { description: SUPPORT_REQUEST_DESCRIPTIONS.ID })
  supportRequestId: string;

  @prop({ required: true, index: true, type: () => String })
  @Field(() => String, { description: SUPPORT_REQUEST_DESCRIPTIONS.REQUESTER_USER_ID })
  requesterUserId: string;

  @prop({ required: true, lowercase: true, trim: true, type: () => String })
  @Field(() => String, { description: SUPPORT_REQUEST_DESCRIPTIONS.REQUESTER_EMAIL })
  requesterEmail: string;

  @prop({ required: true, enum: SupportRequestKind, type: () => String })
  @Field(() => SupportRequestKind, { description: SUPPORT_REQUEST_DESCRIPTIONS.KIND })
  kind: SupportRequestKind;

  @prop({ required: true, enum: SupportRequestStatus, type: () => String, default: SupportRequestStatus.Open })
  @Field(() => SupportRequestStatus, { description: SUPPORT_REQUEST_DESCRIPTIONS.STATUS })
  status: SupportRequestStatus;

  @prop({
    maxlength: SUPPORT_REQUEST_LIMITS.subjectMaxLength,
    minlength: SUPPORT_REQUEST_LIMITS.subjectMinLength,
    required: true,
    trim: true,
    type: () => String,
  })
  @Field(() => String, { description: SUPPORT_REQUEST_DESCRIPTIONS.SUBJECT })
  subject: string;

  @prop({
    maxlength: SUPPORT_REQUEST_LIMITS.messageMaxLength,
    minlength: SUPPORT_REQUEST_LIMITS.messageMinLength,
    required: true,
    trim: true,
    type: () => String,
  })
  @Field(() => String, { description: SUPPORT_REQUEST_DESCRIPTIONS.MESSAGE })
  message: string;

  @prop({ trim: true, type: () => String })
  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.SCREENSHOT_URL,
  })
  screenshotUrl?: string;

  @prop({ maxlength: SUPPORT_REQUEST_LIMITS.pagePathMaxLength, trim: true, type: () => String })
  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.PAGE_PATH,
  })
  pagePath?: string;

  @prop({ trim: true, type: () => String })
  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.PLATFORM,
  })
  platform?: string;

  @prop({ trim: true, type: () => String })
  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.USER_AGENT,
  })
  userAgent?: string;

  @prop({ trim: true, type: () => String })
  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.APP_VERSION,
  })
  appVersion?: string;

  @prop({ trim: true, type: () => String })
  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.BUILD_VERSION,
  })
  buildVersion?: string;

  @Field(() => Date, { description: SUPPORT_REQUEST_DESCRIPTIONS.CREATED_AT })
  createdAt: Date;

  @Field(() => Date, { nullable: true, description: SUPPORT_REQUEST_DESCRIPTIONS.UPDATED_AT })
  updatedAt?: Date;
}

@InputType('CreateSupportRequestInput', {
  description: SUPPORT_REQUEST_DESCRIPTIONS.CREATE_INPUT,
})
export class CreateSupportRequestInput {
  @Field(() => SupportRequestKind, { description: SUPPORT_REQUEST_DESCRIPTIONS.KIND })
  kind: SupportRequestKind;

  @Field(() => String, { description: SUPPORT_REQUEST_DESCRIPTIONS.SUBJECT })
  subject: string;

  @Field(() => String, { description: SUPPORT_REQUEST_DESCRIPTIONS.MESSAGE })
  message: string;

  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.SCREENSHOT_URL,
  })
  screenshotUrl?: string;

  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.PAGE_PATH,
  })
  pagePath?: string;
}

@InputType('ReadSupportRequestsInput', {
  description: SUPPORT_REQUEST_DESCRIPTIONS.READ_INPUT,
})
export class ReadSupportRequestsInput {
  @Field(() => SupportRequestStatus, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.STATUS,
  })
  status?: SupportRequestStatus;

  @Field(() => String, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.SEARCH,
  })
  search?: string;

  @Field(() => Int, {
    nullable: true,
    description: SUPPORT_REQUEST_DESCRIPTIONS.LIMIT,
  })
  limit?: number;
}

@InputType('UpdateSupportRequestStatusInput', {
  description: SUPPORT_REQUEST_DESCRIPTIONS.UPDATE_STATUS_INPUT,
})
export class UpdateSupportRequestStatusInput {
  @Field(() => String, { description: SUPPORT_REQUEST_DESCRIPTIONS.ID })
  supportRequestId: string;

  @Field(() => SupportRequestStatus, { description: SUPPORT_REQUEST_DESCRIPTIONS.STATUS })
  status: SupportRequestStatus;
}
