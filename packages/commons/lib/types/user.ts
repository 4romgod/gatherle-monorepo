import 'reflect-metadata';
import z from 'zod';
import GraphQLJSON from 'graphql-type-json';
import {Authorized, Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {modelOptions, prop, Ref, Severity} from '@typegoose/typegoose';

import {EVENT_DESCRIPTIONS, USER_DESCRIPTIONS} from '../constants';
import {EventCategory} from './eventCategory';
import {
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

@ObjectType('UserProfile')
export class UserProfile {
    @prop()
    @Field(() => String, {nullable: true})
    displayName?: string;

    @prop()
    @Field(() => String, {nullable: true})
    bio?: string;

    @prop()
    @Field(() => String, {nullable: true})
    avatar?: string;

    @prop({type: () => [String], default: []})
    @Field(() => [String], {nullable: true})
    socialLinks?: string[];
}

@ObjectType('CommunicationPrefs')
export class CommunicationPrefs {
    @prop()
    @Field(() => Boolean, {nullable: true})
    emailEnabled?: boolean;

    @prop()
    @Field(() => Boolean, {nullable: true})
    smsEnabled?: boolean;

    @prop()
    @Field(() => Boolean, {nullable: true})
    pushEnabled?: boolean;
}

@ObjectType('UserPreferences')
@modelOptions({options: {allowMixed: Severity.ALLOW}})
export class UserPreferences {
    @prop({type: () => CommunicationPrefs})
    @Field(() => CommunicationPrefs, {nullable: true})
    communicationPrefs?: CommunicationPrefs;

    @prop()
    @Field(() => GraphQLJSON, {nullable: true})
    notificationPrefs?: Record<string, any>;
}

@ObjectType('User', {description: USER_DESCRIPTIONS.TYPE})
@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
export class User {
    @prop({required: true, unique: true, index: true})
    @Field((type) => ID, {description: USER_DESCRIPTIONS.ID})
    userId: string;

    @prop({required: true, unique: true, index: true, lowercase: true})
    @Field((type) => String, {description: USER_DESCRIPTIONS.EMAIL})
    email: string;

    @prop({required: true, unique: true, index: true})
    @Field((type) => String, {description: USER_DESCRIPTIONS.USERNAME})
    username: string;

    @prop({type: () => Object, default: {}})
    @Field((type) => GraphQLJSON, {nullable: true, description: USER_DESCRIPTIONS.ADDRESS})
    address?: Record<string, any>;

    @prop({required: true})
    @Field((type) => String, {description: USER_DESCRIPTIONS.BIRTHDATE})
    birthdate: string;

    @prop({required: true})
    @Field((type) => String, {description: USER_DESCRIPTIONS.GIVEN_NAME})
    given_name: string;

    @prop({required: true})
    @Field((type) => String, {description: USER_DESCRIPTIONS.FAMILY_NAME})
    family_name: string;

    @prop({enum: Gender})
    @Field((type) => Gender, {nullable: true, description: USER_DESCRIPTIONS.GENDER})
    gender?: Gender;

    @prop()
    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER})
    phone_number?: string;

    @prop()
    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE})
    profile_picture?: string;

    @prop()
    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.BIO})
    bio?: string;

    @prop({enum: UserRole, default: UserRole.User, required: true})
    @Field((type) => UserRole, {description: USER_DESCRIPTIONS.USER_ROLE})
    userRole: UserRole;

    @prop({type: () => [String], enum: UserRole, default: [UserRole.User]})
    @Field(() => [UserRole], {nullable: true, description: 'Multiple roles supported'})
    roles?: UserRole[];

    @prop({required: true, select: false})
    password: string;

    @prop({type: () => [String], ref: () => EventCategory, default: []})
    @Field(() => [EventCategory], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    interests?: Ref<EventCategory>[];

    @prop()
    @Field(() => String, {nullable: true})
    primaryTimezone?: string;

    @prop({enum: SocialVisibility})
    @Field(() => SocialVisibility, {nullable: true})
    defaultVisibility?: SocialVisibility;

    @prop({type: () => UserProfile})
    @Field(() => UserProfile, {nullable: true})
    profile?: UserProfile;

    @prop({type: () => UserPreferences})
    @Field(() => UserPreferences, {nullable: true})
    preferences?: UserPreferences;

    @prop({enum: SocialVisibility})
    @Field(() => SocialVisibility, {nullable: true})
    socialVisibility?: SocialVisibility;

    @prop({default: true})
    @Field(() => Boolean, {nullable: true})
    shareRSVPByDefault?: boolean;

    @prop({default: []})
    @Field(() => [String], {nullable: true})
    mutedUserIds?: string[];

    @prop({default: []})
    @Field(() => [String], {nullable: true})
    blockedUserIds?: string[];
}

@ObjectType('UserWithToken', {description: USER_DESCRIPTIONS.WITH_TOKEN})
export class UserWithToken extends User {
    @Field((type) => String, {description: USER_DESCRIPTIONS.TOKEN})
    token: string;
}

@InputType('CreateUserInput', {description: USER_DESCRIPTIONS.CREATE_INPUT})
export class CreateUserInput {
    @Field((type) => String, {description: USER_DESCRIPTIONS.EMAIL})
    email: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.USERNAME})
    username?: string;

    @Field((type) => GraphQLJSON, {nullable: true, description: USER_DESCRIPTIONS.ADDRESS})
    address?: Record<string, any>;

    @Field((type) => String, {description: USER_DESCRIPTIONS.BIRTHDATE})
    birthdate: string;

    @Field((type) => String, {description: USER_DESCRIPTIONS.GIVEN_NAME})
    given_name: string;

    @Field((type) => String, {description: USER_DESCRIPTIONS.FAMILY_NAME})
    family_name: string;

    @Field((type) => Gender, {nullable: true, description: USER_DESCRIPTIONS.GENDER})
    gender?: Gender;

    @Field((type) => String, {description: USER_DESCRIPTIONS.PASSWORD})
    password: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER})
    phone_number?: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE})
    profile_picture?: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.BIO})
    bio?: string;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    interests?: string[];

    @Field(() => String, {nullable: true})
    primaryTimezone?: string;

    @Field(() => SocialVisibility, {nullable: true})
    defaultVisibility?: SocialVisibility;

    @Field(() => SocialVisibility, {nullable: true})
    socialVisibility?: SocialVisibility;

    @Field(() => Boolean, {nullable: true})
    shareRSVPByDefault?: boolean;

    @Field(() => GraphQLJSON, {nullable: true})
    profile?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    preferences?: Record<string, any>;

    @Field(() => [String], {nullable: true})
    mutedUserIds?: string[];

    @Field(() => [String], {nullable: true})
    blockedUserIds?: string[];

    @Field(() => [UserRole], {nullable: true})
    roles?: UserRole[];
}

@InputType('UpdateUserInput', {description: USER_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateUserInput {
    @Field((type) => ID, {description: USER_DESCRIPTIONS.ID})
    userId: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.EMAIL})
    email?: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.USERNAME})
    username?: string;

    @Field((type) => GraphQLJSON, {nullable: true, description: USER_DESCRIPTIONS.ADDRESS})
    address?: Record<string, any>;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.BIRTHDATE})
    birthdate?: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.GIVEN_NAME})
    given_name?: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.FAMILY_NAME})
    family_name?: string;

    @Field((type) => Gender, {nullable: true, description: USER_DESCRIPTIONS.GENDER})
    gender?: Gender;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.PASSWORD})
    password?: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER})
    phone_number?: string;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE})
    profile_picture?: string;

    @Authorized([UserRole.Admin])
    @Field(() => UserRole, {nullable: true, description: USER_DESCRIPTIONS.USER_ROLE})
    userRole?: UserRole;

    @Field((type) => String, {nullable: true, description: USER_DESCRIPTIONS.BIO})
    bio?: string;

    @Field(() => [String], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    interests?: string[];

    @Field(() => String, {nullable: true})
    primaryTimezone?: string;

    @Field(() => SocialVisibility, {nullable: true})
    defaultVisibility?: SocialVisibility;

    @Field(() => SocialVisibility, {nullable: true})
    socialVisibility?: SocialVisibility;

    @Field(() => Boolean, {nullable: true})
    shareRSVPByDefault?: boolean;

    @Field(() => GraphQLJSON, {nullable: true})
    profile?: Record<string, any>;

    @Field(() => GraphQLJSON, {nullable: true})
    preferences?: Record<string, any>;

    @Field(() => [String], {nullable: true})
    mutedUserIds?: string[];

    @Field(() => [String], {nullable: true})
    blockedUserIds?: string[];

    @Field(() => [UserRole], {nullable: true})
    roles?: UserRole[];
}

@InputType('LoginUserInput', {description: USER_DESCRIPTIONS.LOGIN_INPUT})
export class LoginUserInput {
    @Field((type) => String, {description: USER_DESCRIPTIONS.EMAIL})
    email: string;

    @Field((type) => String, {description: USER_DESCRIPTIONS.PASSWORD})
    password: string;
}

export type LoginUserInputInferedType = z.infer<typeof LoginUserInputSchema>;
export type CreateUserInputInferedType = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInputInferedType = z.infer<typeof UpdateUserInputSchema>;
export type ForgotPasswordInputInferedType = z.infer<typeof ForgotPasswordInputTypeSchema>;
export type ResetPasswordInputInferedType = z.infer<typeof ResetPasswordInputTypeSchema>;
