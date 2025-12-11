import 'reflect-metadata';
import z from 'zod';
import GraphQLJSON from 'graphql-type-json';
import {Authorized, Field, ID, InputType, ObjectType, registerEnumType} from 'type-graphql';
import {modelOptions, prop, Ref, Severity} from '@typegoose/typegoose';

import {EVENT_DESCRIPTIONS, USER_DESCRIPTIONS} from '../constants';
import {EventCategoryType} from './eventCategory';
import {
    CreateUserInputTypeSchema,
    ForgotPasswordInputTypeSchema,
    LoginUserInputTypeSchema,
    ResetPasswordInputTypeSchema,
    UpdateUserInputTypeSchema,
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

registerEnumType(Gender, {
    name: 'Gender',
    description: USER_DESCRIPTIONS.GENDER,
});

registerEnumType(UserRole, {
    name: 'UserRole',
    description: USER_DESCRIPTIONS.USER_ROLE,
});

@ObjectType('UserType', {description: USER_DESCRIPTIONS.TYPE})
@modelOptions({schemaOptions: {timestamps: true}, options: {allowMixed: Severity.ALLOW}})
export class UserType {
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

    @prop({required: true, select: false})
    password: string;

    @prop({type: () => [String], ref: () => EventCategoryType, default: []})
    @Field(() => [EventCategoryType], {nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    interests?: Ref<EventCategoryType>[];
}

@ObjectType('UserWithTokenType', {description: USER_DESCRIPTIONS.WITH_TOKEN})
export class UserWithTokenType extends UserType {
    @Field((type) => String, {description: USER_DESCRIPTIONS.TOKEN})
    token: string;
}

@InputType('CreateUserInputType', {description: USER_DESCRIPTIONS.CREATE_INPUT})
export class CreateUserInputType {
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
}

@InputType('UpdateUserInputType', {description: USER_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateUserInputType {
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
}

@InputType('LoginUserInputType', {description: USER_DESCRIPTIONS.LOGIN_INPUT})
export class LoginUserInputType {
    @Field((type) => String, {description: USER_DESCRIPTIONS.EMAIL})
    email: string;

    @Field((type) => String, {description: USER_DESCRIPTIONS.PASSWORD})
    password: string;
}

export type LoginUserInputInferedType = z.infer<typeof LoginUserInputTypeSchema>;
export type CreateUserInputInferedType = z.infer<typeof CreateUserInputTypeSchema>;
export type UpdateUserInputInferedType = z.infer<typeof UpdateUserInputTypeSchema>;
export type ForgotPasswordInputInferedType = z.infer<typeof ForgotPasswordInputTypeSchema>;
export type ResetPasswordInputInferedType = z.infer<typeof ResetPasswordInputTypeSchema>;
