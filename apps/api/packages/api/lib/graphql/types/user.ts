import 'reflect-metadata';
import { EVENT_DESCRIPTIONS, USER_DESCRIPTIONS } from '@/constants';
import { ID, ObjectType, InputType, Field, registerEnumType, Authorized } from 'type-graphql';
import { Document } from 'mongoose';
import { EventCategoryType } from './eventCategory';
import GraphQLJSON from 'graphql-type-json';

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

@ObjectType('UserType', { description: USER_DESCRIPTIONS.TYPE })
export class UserType {
  @Field((type) => ID, { description: USER_DESCRIPTIONS.ID })
  userId: string;

  @Field((type) => String, { description: USER_DESCRIPTIONS.EMAIL })
  email: string;

  @Field((type) => String, { description: USER_DESCRIPTIONS.USERNAME })
  username: string;

  // TODO use the right types
  @Field((type) => GraphQLJSON, { nullable: true, description: USER_DESCRIPTIONS.ADDRESS })
  address?: Record<string, any>;

  @Field((type) => String, { description: USER_DESCRIPTIONS.BIRTHDATE })
  birthdate: string;

  @Field((type) => String, { description: USER_DESCRIPTIONS.GIVEN_NAME })
  given_name: string;

  @Field((type) => String, { description: USER_DESCRIPTIONS.FAMILY_NAME })
  family_name: string;

  @Field((type) => Gender, { nullable: true, description: USER_DESCRIPTIONS.GENDER })
  gender?: Gender;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER })
  phone_number?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE })
  profile_picture?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.BIO })
  bio?: string;

  @Field((type) => UserRole, { description: USER_DESCRIPTIONS.USER_ROLE })
  userRole: UserRole;

  @Field(() => [EventCategoryType], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  interests?: EventCategoryType[];
}

@ObjectType('UserWithTokenType', { description: USER_DESCRIPTIONS.WITH_TOKEN })
export class UserWithTokenType extends UserType {
  @Field((type) => String, { description: USER_DESCRIPTIONS.TOKEN })
  token: string;
}

export interface UserTypeDocument extends UserType, Document {
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

@InputType('CreateUserInputType', { description: USER_DESCRIPTIONS.CREATE_INPUT })
export class CreateUserInputType {
  @Field((type) => String, { description: USER_DESCRIPTIONS.EMAIL })
  email: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.USERNAME })
  username?: string;

  // TODO use the right types
  @Field((type) => GraphQLJSON, { nullable: true, description: USER_DESCRIPTIONS.ADDRESS })
  address?: Record<string, any>;

  @Field((type) => String, { description: USER_DESCRIPTIONS.BIRTHDATE })
  birthdate: string;

  @Field((type) => String, { description: USER_DESCRIPTIONS.GIVEN_NAME })
  given_name: string;

  @Field((type) => String, { description: USER_DESCRIPTIONS.FAMILY_NAME })
  family_name: string;

  @Field((type) => Gender, { nullable: true, description: USER_DESCRIPTIONS.GENDER })
  gender?: Gender;

  @Field((type) => String, { description: USER_DESCRIPTIONS.PASSWORD })
  password: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER })
  phone_number?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE })
  profile_picture?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.BIO })
  bio?: string;

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  interests?: string[];
}

@InputType('UpdateUserInputType', { description: USER_DESCRIPTIONS.UPDATE_INPUT })
export class UpdateUserInputType {
  @Field((type) => ID, { description: USER_DESCRIPTIONS.ID })
  userId: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.EMAIL })
  email?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.USERNAME })
  username?: string;

  // TODO use the right types
  @Field((type) => GraphQLJSON, { nullable: true, description: USER_DESCRIPTIONS.ADDRESS })
  address?: Record<string, any>;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.BIRTHDATE })
  birthdate?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.GIVEN_NAME })
  given_name?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.FAMILY_NAME })
  family_name?: string;

  @Field((type) => Gender, { nullable: true, description: USER_DESCRIPTIONS.GENDER })
  gender?: Gender;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.PASSWORD })
  password?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.PHONE_NUMBER })
  phone_number?: string;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.PROFILE_PICTURE })
  profile_picture?: string;

  @Authorized([UserRole.Admin])
  @Field(() => UserRole, { nullable: true, description: USER_DESCRIPTIONS.USER_ROLE })
  userRole?: UserRole;

  @Field((type) => String, { nullable: true, description: USER_DESCRIPTIONS.BIO })
  bio?: string;

  @Field(() => [String], { nullable: true, description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  interests?: string[];
}

@InputType('LoginUserInputType', { description: USER_DESCRIPTIONS.LOGIN_INPUT })
export class LoginUserInputType {
  @Field((type) => String, { description: USER_DESCRIPTIONS.EMAIL })
  email: string;

  @Field((type) => String, { description: USER_DESCRIPTIONS.PASSWORD })
  password: string;
}
