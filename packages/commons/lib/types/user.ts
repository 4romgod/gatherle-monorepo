import 'reflect-metadata';
import type z from 'zod';
import GraphQLJSON from 'graphql-type-json';
import { Authorized, Field, ID, InputType, Int, ObjectType, registerEnumType } from 'type-graphql';
import type { Ref } from '@typegoose/typegoose';
import { modelOptions, prop, Severity } from '@typegoose/typegoose';
import { EVENT_DESCRIPTIONS, USER_DESCRIPTIONS } from '../constants';
import { EventCategory } from './eventCategory';
import type {
  CreateUserInputSchema,
  ForgotPasswordInputTypeSchema,
  LoginUserInputSchema,
  ResetPasswordInputTypeSchema,
  UpdateUserInputSchema,
} from '../validation';

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum UserRole {
  Admin = 'Admin',
  User = 'User',
  Host = 'Host',
  Guest = 'Guest',
}

export enum SocialVisibility {
  Public = 'Public',
  Followers = 'Followers',
  Private = 'Private',
}

export enum FollowPolicy {
  Public = 'Public',
  RequireApproval = 'RequireApproval',
}

registerEnumType(Gender, {
  name: 'Gender',
  description: USER_DESCRIPTIONS.GENDER,
});

registerEnumType(UserRole, {
  name: 'UserRole',
  description: USER_DESCRIPTIONS.USER_ROLE,
});

registerEnumType(SocialVisibility, {
  name: 'SocialVisibility',
  description: 'Visibility of social signals (intents, presence)',
});

registerEnumType(FollowPolicy, {
  name: 'FollowPolicy',
  description: USER_DESCRIPTIONS.FOLLOW_POLICY,
});

@ObjectType('CommunicationPrefs')
export class CommunicationPrefs {
  @prop({ type: () => Boolean })
  @Field(() => Boolean, { nullable: true })
  emailEnabled?: boolean;

  @prop({ type: () => Boolean })
  @Field(() => Boolean, { nullable: true })
  smsEnabled?: boolean;

  @prop({ type: () => Boolean })
  @Field(() => Boolean, { nullable: true })
  pushEnabled?: boolean;
}

@ObjectType('SessionState', { description: 'Serialized UI state for cross-device continuity' })
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class SessionState {
  @prop({ type: () => String })
  @Field(() => String, { description: 'State key (e.g., filters, tabs, drafts)' })
  key!: string;

  @prop({ type: () => Object })
  @Field(() => GraphQLJSON, { description: 'Serialized state value' })
  value!: Record<string, any>;

  @prop({ type: () => Number })
  @Field(() => Int, { description: 'Schema version for migration support', defaultValue: 1 })
  version?: number;

  @prop({ type: () => Date })
  @Field(() => Date, { description: 'When this state was last updated' })
  updatedAt!: Date;
}

@ObjectType('UserPreferences')
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class UserPreferences {
  @prop({ type: () => CommunicationPrefs })
  @Field(() => CommunicationPrefs, { nullable: true })
  communicationPrefs?: CommunicationPrefs;

  @prop({ type: () => Object })
  @Field(() => GraphQLJSON, { nullable: true })
  notificationPrefs?: Record<string, any>;

  @prop({ type: () => [SessionState] })
  @Field(() => [SessionState], { nullable: true, description: 'Persisted UI state for cross-device sync' })
  sessionState?: SessionState[];
}

@ObjectType('UserLocationCoordinates', { description: 'Geographic coordinates for user location' })
export class UserLocationCoordinates {
  @prop({ type: () => Number })
  @Field(() => Number, { description: 'Latitude coordinate' })
  latitude: number;

  @prop({ type: () => Number })
  @Field(() => Number, { description: 'Longitude coordinate' })
  longitude: number;
}

@ObjectType('UserLocation', { description: 'User location for personalized content' })
export class UserLocation {
  @prop({ type: () => String })
  @Field(() => String, { description: 'City name' })
  city: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: 'State or region' })
  state?: string;

  @prop({ type: () => String })
  @Field(() => String, { description: 'Country name' })
  country: string;

  @prop({ type: () => UserLocationCoordinates })
  @Field(() => UserLocationCoordinates, {
    nullable: true,
    description: 'Geographic coordinates for proximity-based filtering',
  })
  coordinates?: UserLocationCoordinates;
}

@InputType('UserLocationCoordinatesInput', { description: 'Geographic coordinates input' })
export class UserLocationCoordinatesInput {
  @Field(() => Number, { description: 'Latitude coordinate' })
  latitude: number;

  @Field(() => Number, { description: 'Longitude coordinate' })
  longitude: number;
}

@InputType('UserLocationInput', { description: 'User location input for personalized content' })
export class UserLocationInput {
  @Field(() => String, { description: 'City name' })
  city: string;

  @Field(() => String, { nullable: true, description: 'State or region' })
  state?: string;

  @Field(() => String, { description: 'Country name' })
  country: string;

  @Field(() => UserLocationCoordinatesInput, {
    nullable: true,
    description: 'Geographic coordinates for proximity-based filtering',
  })
  coordinates?: UserLocationCoordinatesInput;
}

@ObjectType('User', { description: USER_DESCRIPTIONS.TYPE })
@modelOptions({ schemaOptions: { timestamps: true }, options: { allowMixed: Severity.ALLOW } })
export class User {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: USER_DESCRIPTIONS.ID })
  userId: string;

  @prop({ required: true, unique: true, index: true, lowercase: true, type: () => String })
  @Field(() => String, { description: USER_DESCRIPTIONS.EMAIL })
  email: string;

  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => String, { description: USER_DESCRIPTIONS.USERNAME })
  username: string;

  @prop({ type: () => UserLocation })
  @Field(() => UserLocation, { nullable: true, description: 'User location for personalized event recommendations' })
  location?: UserLocation;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: USER_DESCRIPTIONS.BIRTHDATE })
  birthdate: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: USER_DESCRIPTIONS.GIVEN_NAME })
  given_name: string;

  @prop({ required: true, type: () => String })
  @Field(() => String, { description: USER_DESCRIPTIONS.FAMILY_NAME })
  family_name: string;

  @prop({ enum: Gender, type: () => String })
  @Field(() => Gender, { nullable: true, description: USER_DESCRIPTIONS.GENDER })
  gender?: Gender;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER })
  phone_number?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE })
  profile_picture?: string;

  @prop({ type: () => String })
  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.BIO })
  bio?: string;

  @prop({ enum: UserRole, default: UserRole.User, required: true, type: () => String })
  @Field(() => UserRole, { description: USER_DESCRIPTIONS.USER_ROLE })
  userRole: UserRole;

  @prop({ required: true, select: false, type: () => String })
  password: string;

  @prop({ type: () => [String], ref: () => EventCategory, default: [], index: true })
  @Field(() => [EventCategory], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  interests?: Ref<EventCategory>[];

  @prop({ type: () => String })
  @Field(() => String, { nullable: true })
  primaryTimezone?: string;

  @prop({ enum: SocialVisibility, type: () => String })
  @Field(() => SocialVisibility, { nullable: true })
  defaultVisibility?: SocialVisibility;

  @prop({ type: () => UserPreferences })
  @Field(() => UserPreferences, { nullable: true })
  preferences?: UserPreferences;

  @prop({ enum: SocialVisibility, type: () => String })
  @Field(() => SocialVisibility, { nullable: true })
  socialVisibility?: SocialVisibility;

  @prop({ default: true, type: () => Boolean })
  @Field(() => Boolean, { nullable: true })
  shareRSVPByDefault?: boolean;

  @prop({ default: true, type: () => Boolean })
  @Field(() => Boolean, { nullable: true, description: USER_DESCRIPTIONS.SHARE_CHECKINS })
  shareCheckinsByDefault?: boolean;

  @prop({ default: [], type: () => [String] })
  @Field(() => [String], { nullable: true })
  mutedUserIds?: string[];

  @prop({ default: [], type: () => [String] })
  @Field(() => [String], { nullable: true, description: 'IDs of organizations whose content is muted' })
  mutedOrgIds?: string[];

  @prop({ default: [], type: () => [String] })
  @Field(() => [String], { nullable: true })
  blockedUserIds?: string[];

  @prop({ enum: FollowPolicy, default: FollowPolicy.Public, type: () => String })
  @Field(() => FollowPolicy, { nullable: true, description: USER_DESCRIPTIONS.FOLLOW_POLICY })
  followPolicy?: FollowPolicy;

  @prop({ enum: SocialVisibility, default: SocialVisibility.Public, type: () => String })
  @Field(() => SocialVisibility, { nullable: true, description: 'Who can see your followers list' })
  followersListVisibility?: SocialVisibility;

  @prop({ enum: SocialVisibility, default: SocialVisibility.Public, type: () => String })
  @Field(() => SocialVisibility, { nullable: true, description: 'Who can see your following list' })
  followingListVisibility?: SocialVisibility;

  // Computed field - resolved via @FieldResolver in UserResolver (no @prop, not stored in DB)
  @Field(() => Number, { description: USER_DESCRIPTIONS.FOLLOWERS_COUNT })
  followersCount?: number;
}

@ObjectType('UserWithToken', { description: USER_DESCRIPTIONS.WITH_TOKEN })
export class UserWithToken extends User {
  @Field(() => String, { description: USER_DESCRIPTIONS.TOKEN })
  token: string;
}

@InputType('CreateUserInput', { description: USER_DESCRIPTIONS.CREATE_INPUT })
export class CreateUserInput {
  @Field(() => String, { description: USER_DESCRIPTIONS.EMAIL })
  email: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.USERNAME })
  username?: string;

  @Field(() => UserLocationInput, {
    nullable: true,
    description: 'User location for personalized event recommendations',
  })
  location?: UserLocationInput;

  @Field(() => String, { description: USER_DESCRIPTIONS.BIRTHDATE })
  birthdate: string;

  @Field(() => String, { description: USER_DESCRIPTIONS.GIVEN_NAME })
  given_name: string;

  @Field(() => String, { description: USER_DESCRIPTIONS.FAMILY_NAME })
  family_name: string;

  @Field(() => Gender, { nullable: true, description: USER_DESCRIPTIONS.GENDER })
  gender?: Gender;

  @Field(() => String, { description: USER_DESCRIPTIONS.PASSWORD })
  password: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER })
  phone_number?: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE })
  profile_picture?: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.BIO })
  bio?: string;

  @Field(() => UserRole, { nullable: true, description: USER_DESCRIPTIONS.USER_ROLE })
  userRole?: UserRole;

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  interests?: string[];

  @Field(() => String, { nullable: true })
  primaryTimezone?: string;

  @Field(() => SocialVisibility, { nullable: true })
  defaultVisibility?: SocialVisibility;

  @Field(() => SocialVisibility, { nullable: true })
  socialVisibility?: SocialVisibility;

  @Field(() => Boolean, { nullable: true })
  shareRSVPByDefault?: boolean;

  @Field(() => Boolean, { nullable: true, description: USER_DESCRIPTIONS.SHARE_CHECKINS })
  shareCheckinsByDefault?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  profile?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true })
  preferences?: Record<string, any>;

  @Field(() => [String], { nullable: true })
  mutedUserIds?: string[];

  @Field(() => [String], { nullable: true, description: 'IDs of organizations whose content is muted' })
  mutedOrgIds?: string[];

  @Field(() => [String], { nullable: true })
  blockedUserIds?: string[];

  @Field(() => FollowPolicy, { nullable: true, description: USER_DESCRIPTIONS.FOLLOW_POLICY })
  followPolicy?: FollowPolicy;

  @Field(() => SocialVisibility, { nullable: true, description: 'Who can see your followers list' })
  followersListVisibility?: SocialVisibility;

  @Field(() => SocialVisibility, { nullable: true, description: 'Who can see your following list' })
  followingListVisibility?: SocialVisibility;
}

@InputType('UpdateUserInput', { description: USER_DESCRIPTIONS.UPDATE_INPUT })
export class UpdateUserInput {
  @Field(() => ID, { description: USER_DESCRIPTIONS.ID })
  userId: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.EMAIL })
  email?: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.USERNAME })
  username?: string;

  @Field(() => UserLocationInput, {
    nullable: true,
    description: 'User location for personalized event recommendations',
  })
  location?: UserLocationInput;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.BIRTHDATE })
  birthdate?: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.GIVEN_NAME })
  given_name?: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.FAMILY_NAME })
  family_name?: string;

  @Field(() => Gender, { nullable: true, description: USER_DESCRIPTIONS.GENDER })
  gender?: Gender;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.PASSWORD })
  password?: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER })
  phone_number?: string;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE })
  profile_picture?: string;

  @Authorized([UserRole.Admin])
  @Field(() => UserRole, { nullable: true, description: USER_DESCRIPTIONS.USER_ROLE })
  userRole?: UserRole;

  @Field(() => String, { nullable: true, description: USER_DESCRIPTIONS.BIO })
  bio?: string;

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  interests?: string[];

  @Field(() => String, { nullable: true })
  primaryTimezone?: string;

  @Field(() => SocialVisibility, { nullable: true })
  defaultVisibility?: SocialVisibility;

  @Field(() => SocialVisibility, { nullable: true })
  socialVisibility?: SocialVisibility;

  @Field(() => Boolean, { nullable: true })
  shareRSVPByDefault?: boolean;

  @Field(() => Boolean, { nullable: true, description: USER_DESCRIPTIONS.SHARE_CHECKINS })
  shareCheckinsByDefault?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  profile?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true })
  preferences?: Record<string, any>;

  @Field(() => [String], { nullable: true })
  mutedUserIds?: string[];

  @Field(() => [String], { nullable: true, description: 'IDs of organizations whose content is muted' })
  mutedOrgIds?: string[];

  @Field(() => FollowPolicy, { nullable: true, description: USER_DESCRIPTIONS.FOLLOW_POLICY })
  followPolicy?: FollowPolicy;

  @Field(() => SocialVisibility, { nullable: true, description: 'Who can see your followers list' })
  followersListVisibility?: SocialVisibility;

  @Field(() => SocialVisibility, { nullable: true, description: 'Who can see your following list' })
  followingListVisibility?: SocialVisibility;
}

@InputType('SessionStateInput', { description: 'Input for saving session state' })
export class SessionStateInput {
  @Field(() => String, { description: 'State key (e.g., filters, tabs, drafts)' })
  key!: string;

  @Field(() => GraphQLJSON, { description: 'Serialized state value' })
  value!: Record<string, any>;

  @Field(() => Int, { nullable: true, description: 'Schema version', defaultValue: 1 })
  version?: number;
}

@InputType('LoginUserInput', { description: USER_DESCRIPTIONS.LOGIN_INPUT })
export class LoginUserInput {
  @Field(() => String, { description: USER_DESCRIPTIONS.EMAIL })
  email: string;

  @Field(() => String, { description: USER_DESCRIPTIONS.PASSWORD })
  password: string;
}

export type LoginUserInputInferedType = z.infer<typeof LoginUserInputSchema>;
export type CreateUserInputInferedType = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInputInferedType = z.infer<typeof UpdateUserInputSchema>;
export type ForgotPasswordInputInferedType = z.infer<typeof ForgotPasswordInputTypeSchema>;
export type ResetPasswordInputInferedType = z.infer<typeof ResetPasswordInputTypeSchema>;
