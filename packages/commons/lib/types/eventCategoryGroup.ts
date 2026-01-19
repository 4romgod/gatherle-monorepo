import 'reflect-metadata';
import { ID, Field, InputType, ObjectType } from 'type-graphql';
import type { Ref } from '@typegoose/typegoose';
import { modelOptions, prop } from '@typegoose/typegoose';

import { EVENT_CATEGORY_DESCRIPTIONS, EVENT_DESCRIPTIONS } from '../constants';
import { EventCategory } from './eventCategory';

@modelOptions({ schemaOptions: { timestamps: true } })
@ObjectType('EventCategoryGroup', { description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.TYPE })
export class EventCategoryGroup {
  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => ID, { description: EVENT_CATEGORY_DESCRIPTIONS.ID })
  eventCategoryGroupId: string;

  @prop({ required: true, unique: true, type: () => String })
  @Field(() => String, { description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME })
  name: string;

  @prop({ required: true, unique: true, index: true, type: () => String })
  @Field(() => String, { description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME })
  slug: string;

  @prop({ type: () => [String], ref: () => EventCategory, required: true })
  @Field(() => [EventCategory], { description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  eventCategories: Ref<EventCategory>[];
}

@InputType('UpdateEventCategoryGroupInput', { description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.UPDATE_INPUT })
export class UpdateEventCategoryGroupInput {
  @Field(() => ID, { description: EVENT_CATEGORY_DESCRIPTIONS.ID })
  eventCategoryGroupId: string;

  @Field(() => String, { description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME })
  name: string;

  @Field(() => [String], { description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  eventCategories: string[];
}

@InputType('CreateEventCategoryGroupInput', { description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.CREATE_INPUT })
export class CreateEventCategoryGroupInput {
  @Field(() => String, { description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME })
  name: string;

  @Field(() => [String], { description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST })
  eventCategories: string[];
}
