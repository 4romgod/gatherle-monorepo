import 'reflect-metadata';
import {EVENT_CATEGORY_DESCRIPTIONS} from '@/constants';
import {ID, Field, InputType, ObjectType} from 'type-graphql';

@ObjectType('EventCategoryType', {description: EVENT_CATEGORY_DESCRIPTIONS.TYPE})
export class EventCategoryType {
  @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
  eventCategoryId: string;

  @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.SLUG})
  slug: string;

  @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
  name: string;

  @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
  iconName: string;

  @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
  description: string;

  @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
  color?: string;
}

@InputType('CreateEventCategoryInputType', {description: EVENT_CATEGORY_DESCRIPTIONS.CREATE_INPUT})
export class CreateEventCategoryInputType {
  @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
  name: string;

  @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
  iconName: string;

  @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
  description: string;

  @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
  color?: string;
}

@InputType('UpdateEventCategoryInputType', {description: EVENT_CATEGORY_DESCRIPTIONS.UPDATE_INPUT})
export class UpdateEventCategoryInputType {
  @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
  eventCategoryId: string;

  @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.NAME})
  name?: string;

  @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.ICON_NAME})
  iconName?: string;

  @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.DESCRIPTION})
  description?: string;

  @Field((type) => String, {nullable: true, description: EVENT_CATEGORY_DESCRIPTIONS.COLOR})
  color?: string;
}
