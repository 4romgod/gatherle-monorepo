import 'reflect-metadata';
import {ID, Field, InputType, ObjectType} from 'type-graphql';
import {modelOptions, prop, Ref} from '@typegoose/typegoose';

import {EVENT_CATEGORY_DESCRIPTIONS, EVENT_DESCRIPTIONS} from '../constants';
import {EventCategoryType} from './eventCategory';

@modelOptions({schemaOptions: {timestamps: true}})
@ObjectType('EventCategoryGroupType', {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.TYPE})
export class EventCategoryGroupType {
    @prop({required: true, unique: true, index: true})
    @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
    eventCategoryGroupId: string;

    @prop({required: true, unique: true})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    name: string;

    @prop({required: true, unique: true, index: true})
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    slug: string;

    @prop({type: () => [String], ref: () => EventCategoryType, required: true})
    @Field(() => [EventCategoryType], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: Ref<EventCategoryType>[];
}

@InputType('UpdateEventCategoryGroupInputType', {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.UPDATE_INPUT})
export class UpdateEventCategoryGroupInputType {
    @Field((type) => ID, {description: EVENT_CATEGORY_DESCRIPTIONS.ID})
    eventCategoryGroupId: string;

    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    name: string;

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: string[];
}

@InputType('CreateEventCategoryGroupInputType', {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.CREATE_INPUT})
export class CreateEventCategoryGroupInputType {
    @Field((type) => String, {description: EVENT_CATEGORY_DESCRIPTIONS.GROUP.NAME})
    name: string;

    @Field(() => [String], {description: EVENT_DESCRIPTIONS.EVENT.EVENT_CATEGORY_LIST})
    eventCategoryList: string[];
}
