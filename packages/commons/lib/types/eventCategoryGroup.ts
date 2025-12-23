import 'reflect-metadata';
import {ID, Field, InputType, ObjectType} from 'type-graphql';
import {modelOptions, prop, Ref} from '@typegoose/typegoose';

import {EVENT_CATEGORY_DESCRIPTIONS, EVENT_DESCRIPTIONS} from '../constants';
import {EventCategory} from './eventCategory';

@modelOptions({schemaOptions: {timestamps: true}})
@ObjectType('EventCategoryGroup', {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.TYPE})
export class EventCategoryGroup {
    @prop({required: true, unique: true, index: true, type: () => String})
    @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
    eventCategoryGroupId: string;

    @prop({required: true, unique: true, type: () => String})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    name: string;

    @prop({required: true, unique: true, index: true, type: () => String})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    slug: string;

    @prop({type: () => [String], ref: () => EventCategory, required: true})
    @Field(() => [EventCategory], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: Ref<EventCategory>[];
}

@InputType('UpdateEventCategoryGroupInput', {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.UPDATE_INPUT})
export class UpdateEventCategoryGroupInput {
    @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
    eventCategoryGroupId: string;

    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    name: string;

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: string[];
}

@InputType('CreateEventCategoryGroupInput', {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.CREATE_INPUT})
export class CreateEventCategoryGroupInput {
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    name: string;

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: string[];
}
